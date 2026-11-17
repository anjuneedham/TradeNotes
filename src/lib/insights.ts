/**
 * TradeNotes Score and automatic insights. Pure functions over per-trade results (no I/O), tested in insights.test.ts.
 * Aggregates come from metrics.ts / analytics-extra.ts so every formula lives in one place.
 * Everything here describes recorded past trades; none of it is a prediction or advice.
 */
import { summarizeResults, tagResults, type Summary } from "./metrics";
import { mistakeCost, holdTimeBuckets, adherenceAnalysis } from "./analytics-extra";
import { localDate, localDayHour } from "./timezone";
import type { ResultRow } from "./trades-data";

type Row = Pick<ResultRow, "id" | "netPnl" | "grossPnl" | "fees" | "r" | "closedAt" | "openedAt" | "symbol" | "mistakes" | "emotions" | "checksDone" | "checksTotal">;

export const SCORE_MIN_TRADES = 10;

/** Net P&L per local calendar day (by close time). */
export function dailyNet(rows: readonly Row[], tz = "UTC"): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of rows) if (t.closedAt) { const d = localDate(t.closedAt, tz); m.set(d, (m.get(d) ?? 0) + t.netPnl); }
  return new Map([...m.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)));
}

export interface ScoreAxis { key: "pf" | "payoff" | "winrate" | "consistency" | "drawdown" | "discipline"; label: string; value: number; detail: string }
export interface Score { total: number; axes: ScoreAxis[]; weakest: ScoreAxis; trades: number }

/**
 * 0–100, the mean of six axes each scaled 0–100 against a "solid" benchmark:
 *  profit factor 2.5 · average win / average loss 2.5 · win rate 60% · green days 65% ·
 *  drawdown control = 1 − max drawdown / gross profit · discipline = share of trades with no mistake tag (or playbook rules followed, when ticked).
 */
export function tradeScore(rows: readonly Row[], tz = "UTC"): Score | null {
  const s = summarizeResults(rows);
  if (s.tradeCount < SCORE_MIN_TRADES) return null;
  const c = (x: number) => Math.max(0, Math.min(100, Math.round(x)));
  const pf = s.profitFactor ?? (s.wins > 0 ? 3 : 0);
  const payoff = s.avgWin !== null && s.avgLoss ? s.avgWin / Math.abs(s.avgLoss) : s.avgWin !== null ? 3 : 0;
  const days = [...dailyNet(rows, tz).values()];
  const green = days.length ? days.filter((d) => d > 0).length / days.length : 0;
  const ddRatio = s.grossProfit > 0 ? s.maxDrawdown / s.grossProfit : 1;
  const adh = adherenceAnalysis(rows);
  const clean = rows.filter((t) => t.mistakes.length === 0).length / rows.length;
  const discipline = adh.checked >= 5 && adh.avgAdherence !== null ? adh.avgAdherence : clean;
  const axes: ScoreAxis[] = [
    { key: "pf", label: "Profit factor", value: c((pf / 2.5) * 100), detail: s.profitFactor === null ? "no losses yet" : s.profitFactor.toFixed(2) },
    { key: "payoff", label: "Win size vs loss size", value: c((payoff / 2.5) * 100), detail: `${payoff.toFixed(2)} : 1` },
    { key: "winrate", label: "Win rate", value: c(((s.winRate ?? 0) / 0.6) * 100), detail: `${Math.round((s.winRate ?? 0) * 100)}%` },
    { key: "consistency", label: "Consistency", value: c((green / 0.65) * 100), detail: `${Math.round(green * 100)}% green days` },
    { key: "drawdown", label: "Drawdown control", value: c((1 - ddRatio) * 100), detail: `worst dip = ${Math.round(ddRatio * 100)}% of gross profit` },
    { key: "discipline", label: "Discipline", value: c(discipline * 100), detail: adh.checked >= 5 ? `${Math.round(discipline * 100)}% of playbook rules followed` : `${Math.round(clean * 100)}% of trades with no mistake tag` },
  ];
  const weakest = [...axes].sort((a, b) => a.value - b.value)[0];
  return { total: Math.round(axes.reduce((x, a) => x + a.value, 0) / axes.length), axes, weakest, trades: s.tradeCount };
}

export const SCORE_TIPS: Record<ScoreAxis["key"], string> = {
  pf: "Cut the setups and hours that lose money; Analytics shows which ones.",
  payoff: "Let winners reach their target and keep stops where you planned them.",
  winrate: "Be pickier: compare results when you followed your playbook with when you did not.",
  consistency: "Set a daily loss limit and stop after it; red days are clustering.",
  drawdown: "Lower size after two losses in a row until you are back at your peak.",
  discipline: "Your tagged mistakes are the cheapest thing to fix. Start with the costliest one.",
};

export interface Insight { id: string; tone: "good" | "bad" | "info"; title: string; body: string; href?: string }

/** Plain-language findings about the user's own trades, most actionable first. Each needs a minimum sample. */
export function insights(rows: readonly Row[], cur: string, tz = "UTC"): Insight[] {
  if (rows.length < 5) return [];
  const out: Insight[] = [];
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n);
  const pctx = (n: number | null) => `${Math.round((n ?? 0) * 100)}%`;
  const n = (k: number) => `${k} trade${k === 1 ? "" : "s"}`;

  const mc = mistakeCost(rows);
  const worstMistake = mc.tags.find((t) => t.netPnl < 0 && t.trades >= 2);
  if (worstMistake) out.push({ id: "mistake", tone: "bad", title: `“${worstMistake.tag}” has cost you ${fmt(Math.abs(worstMistake.netPnl))}`, body: `Across ${n(worstMistake.trades)}, ${pctx(worstMistake.winRate)} won. Fixing this one habit is the cheapest improvement available.`, href: "/app/analytics#mistake-cost" });

  const byHour = new Map<number, Row[]>();
  for (const t of rows) { const h = localDayHour(t.openedAt, tz).hour; byHour.set(h, [...(byHour.get(h) ?? []), t]); }
  const hours = [...byHour.entries()].map(([h, ts]) => ({ h, s: summarizeResults(ts) })).filter((x) => x.s.tradeCount >= 3).sort((a, b) => b.s.netPnl - a.s.netPnl);
  const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;
  if (hours.length >= 2 && hours[0].s.netPnl > 0) out.push({ id: "hour-best", tone: "good", title: `Your best hour to enter is ${hh(hours[0].h)}`, body: `${n(hours[0].s.tradeCount)}, ${pctx(hours[0].s.winRate)} won, ${fmt(hours[0].s.netPnl)} net.`, href: "/app/analytics#heatmap" });
  const worstH = hours[hours.length - 1];
  if (hours.length >= 2 && worstH.s.netPnl < 0) out.push({ id: "hour-worst", tone: "bad", title: `Entries around ${hh(worstH.h)} are losing you money`, body: `${n(worstH.s.tradeCount)}, ${fmt(worstH.s.netPnl)} net. Try sitting this hour out for your next 10 trades.`, href: "/app/analytics#heatmap" });

  const emo = Object.entries(tagResults(rows, (t) => t.emotions)).filter(([, s]) => s.tradeCount >= 3).sort((a, b) => a[1].netPnl - b[1].netPnl);
  if (emo[0] && emo[0][1].netPnl < 0) out.push({ id: "emotion", tone: "bad", title: `When you trade feeling “${emo[0][0]}”, you lose`, body: `${n(emo[0][1].tradeCount)}, ${pctx(emo[0][1].winRate)} won, ${fmt(emo[0][1].netPnl)} net.` });
  const goodEmo = emo[emo.length - 1];
  if (goodEmo && goodEmo[1].netPnl > 0 && goodEmo !== emo[0]) out.push({ id: "emotion-good", tone: "good", title: `You trade best feeling “${goodEmo[0]}”`, body: `${n(goodEmo[1].tradeCount)}, ${pctx(goodEmo[1].winRate)} won, ${fmt(goodEmo[1].netPnl)} net.` });

  if (mc.withMistake.trades >= 3 && mc.withoutMistake.trades >= 3 && mc.withMistake.avgPerTrade !== null && mc.withoutMistake.avgPerTrade !== null && mc.withoutMistake.avgPerTrade > mc.withMistake.avgPerTrade)
    out.push({ id: "clean", tone: "info", title: `A clean trade is worth ${fmt(mc.withoutMistake.avgPerTrade - mc.withMistake.avgPerTrade)} more to you`, body: `No mistake tagged: ${fmt(mc.withoutMistake.avgPerTrade)} average (${n(mc.withoutMistake.trades)}). With a mistake: ${fmt(mc.withMistake.avgPerTrade)} (${n(mc.withMistake.trades)}).` });

  const adh = adherenceAnalysis(rows);
  const [all, , few] = adh.buckets;
  if (all.summary.tradeCount >= 3 && few.summary.tradeCount >= 3 && (all.summary.expectancy ?? 0) > (few.summary.expectancy ?? 0))
    out.push({ id: "playbook", tone: "info", title: "Following your playbook pays", body: `All rules followed: ${fmt(all.summary.expectancy ?? 0)} per trade. Few rules followed: ${fmt(few.summary.expectancy ?? 0)} per trade.`, href: "/app/analytics#adherence" });

  const hold = holdTimeBuckets(rows).buckets.filter((b) => b.summary.tradeCount >= 3).sort((a, b) => b.summary.netPnl - a.summary.netPnl);
  if (hold.length >= 2 && hold[0].summary.netPnl > 0) out.push({ id: "hold", tone: "good", title: `Your money is made holding ${hold[0].label.toLowerCase()}`, body: `${n(hold[0].summary.tradeCount)}, ${fmt(hold[0].summary.netPnl)} net. Weakest: ${hold[hold.length - 1].label.toLowerCase()} (${fmt(hold[hold.length - 1].summary.netPnl)}).`, href: "/app/analytics#hold-time" });

  const sym = Object.entries(tagResults(rows, (t) => [t.symbol])).filter(([, s]) => s.tradeCount >= 3).sort((a, b) => b[1].netPnl - a[1].netPnl);
  if (sym.length >= 2 && sym[sym.length - 1][1].netPnl < 0) { const [w, ws] = sym[sym.length - 1]; out.push({ id: "symbol", tone: "bad", title: `${w} is your weakest instrument`, body: `${n(ws.tradeCount)}, ${fmt(ws.netPnl)} net, while ${sym[0][0]} made ${fmt(sym[0][1].netPnl)}.` }); }

  const days = [...dailyNet(rows, tz).values()];
  const afterRed = days.slice(1).filter((_, i) => days[i] < 0);
  if (afterRed.length >= 3) { const avg = afterRed.reduce((x, d) => x + d, 0) / afterRed.length; if (avg < 0) out.push({ id: "tilt", tone: "bad", title: "Red days tend to follow red days", body: `Your average day after a losing day is ${fmt(avg)}. A daily loss limit could break the chain.`, href: "/app/calendar" }); }

  const order = { bad: 0, info: 1, good: 2 } as const;
  return out.sort((a, b) => order[a.tone] - order[b.tone]);
}

export type { Summary };
