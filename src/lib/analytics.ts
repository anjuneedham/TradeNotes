/**
 * Advanced analytics built on top of the metrics engine. Pure functions, no I/O.
 * Input: closed-trade results joined with journal context (tags, times, discipline).
 */
import { evaluateTrade, summarize, type TradeInput, type Summary } from "./metrics";

export interface JournalTrade extends TradeInput {
  symbol: string;
  session: string | null;
  strategy: string | null;
  openedAt: string;
  emotions: string[];
  mistakes: string[];
  followedPlan: boolean | null;
  discipline: number | null;
}

export interface ClosedTrade extends JournalTrade { netPnl: number; r: number | null }

export function closedTrades(trades: JournalTrade[]): ClosedTrade[] {
  const out: ClosedTrade[] = [];
  for (const t of trades) {
    const r = evaluateTrade(t);
    if (typeof r !== "string") out.push({ ...t, netPnl: r.netPnl, r: r.r });
  }
  return out.sort((a, b) => ((a.closedAt ?? "") < (b.closedAt ?? "") ? -1 : 1));
}

/** Net P&L and trade count per UTC calendar day (by close time). */
export function dailyPnl(ts: ClosedTrade[]): Record<string, { pnl: number; trades: number; wins: number }> {
  const out: Record<string, { pnl: number; trades: number; wins: number }> = {};
  for (const t of ts) {
    if (!t.closedAt) continue;
    const d = t.closedAt.slice(0, 10);
    const o = (out[d] ||= { pnl: 0, trades: 0, wins: 0 });
    o.pnl = round(o.pnl + t.netPnl); o.trades++; if (t.netPnl > 0) o.wins++;
  }
  return out;
}

/** Calendar grid for a month: weeks of 7 cells (Sunday first), null = outside month. */
export function monthGrid(year: number, month: number): (string | null)[][] {
  const first = new Date(Date.UTC(year, month, 1));
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (string | null)[] = Array(first.getUTCDay()).fill(null);
  for (let d = 1; d <= days; d++) cells.push(new Date(Date.UTC(year, month, d)).toISOString().slice(0, 10));
  while (cells.length % 7) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export interface Bucket { label: string; trades: number; pnl: number; winRate: number }
function bucketize<T extends ClosedTrade>(ts: T[], key: (t: T) => string | null, order?: string[]): Bucket[] {
  const m = new Map<string, T[]>();
  for (const t of ts) { const k = key(t); if (k === null) continue; m.set(k, [...(m.get(k) ?? []), t]); }
  const keys = order ? order.filter((k) => m.has(k)) : [...m.keys()];
  return keys.map((k) => {
    const g = m.get(k)!;
    return { label: k, trades: g.length, pnl: round(g.reduce((s, t) => s + t.netPnl, 0)), winRate: g.filter((t) => t.netPnl > 0).length / g.length };
  });
}

export const HOLD_BUCKETS = ["< 5m", "5–30m", "30m–2h", "2–8h", "8h–1d", "> 1d"];
export function holdBucket(openedAt: string, closedAt: string | null): string | null {
  if (!closedAt) return null;
  const m = (new Date(closedAt).getTime() - new Date(openedAt).getTime()) / 60000;
  if (!(m >= 0)) return null;
  return m < 5 ? HOLD_BUCKETS[0] : m < 30 ? HOLD_BUCKETS[1] : m < 120 ? HOLD_BUCKETS[2] : m < 480 ? HOLD_BUCKETS[3] : m < 1440 ? HOLD_BUCKETS[4] : HOLD_BUCKETS[5];
}
export const byHoldTime = (ts: ClosedTrade[]) => bucketize(ts, (t) => holdBucket(t.openedAt, t.closedAt ?? null), HOLD_BUCKETS);

const HOURS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`);
export const byEntryHour = (ts: ClosedTrade[]) => bucketize(ts, (t) => HOURS[new Date(t.openedAt).getUTCHours()], HOURS);

export const R_BUCKETS = ["≤ -2R", "-2 to -1R", "-1 to 0R", "0 to 1R", "1 to 2R", "2 to 3R", "≥ 3R"];
export function rBucket(r: number): string {
  return r <= -2 ? R_BUCKETS[0] : r <= -1 ? R_BUCKETS[1] : r < 0 ? R_BUCKETS[2] : r < 1 ? R_BUCKETS[3] : r < 2 ? R_BUCKETS[4] : r < 3 ? R_BUCKETS[5] : R_BUCKETS[6];
}
export const rDistribution = (ts: ClosedTrade[]) => R_BUCKETS.map((label) => ({ label, count: ts.filter((t) => t.r !== null && rBucket(t.r) === label).length }));

/** Total P&L of trades carrying each tag. A tag on a losing trade = what that habit is costing you. */
export function tagImpact(ts: ClosedTrade[], field: "mistakes" | "emotions"): Bucket[] {
  const tags = new Set(ts.flatMap((t) => t[field]));
  return [...tags].map((tag) => {
    const g = ts.filter((t) => t[field].includes(tag));
    return { label: tag, trades: g.length, pnl: round(g.reduce((s, t) => s + t.netPnl, 0)), winRate: g.filter((t) => t.netPnl > 0).length / g.length };
  }).sort((a, b) => a.pnl - b.pnl);
}

export function planAdherence(ts: ClosedTrade[]) {
  const followed = ts.filter((t) => t.followedPlan === true), broke = ts.filter((t) => t.followedPlan === false);
  const avg = (g: ClosedTrade[]) => (g.length ? round(g.reduce((s, t) => s + t.netPnl, 0) / g.length) : null);
  return { followed: followed.length, broke: broke.length, avgFollowed: avg(followed), avgBroke: avg(broke) };
}

/**
 * TradeNotes Score (0–100): six equally weighted axes, each scaled 0–100.
 * Rewards edge (profit factor, win/loss ratio), safety (drawdown vs. gains), consistency (green days),
 * discipline (plan adherence + self-score).
 */
export interface ScoreAxis { key: string; label: string; value: number; raw: string }
export function tradeScore(s: Summary, ts: ClosedTrade[]): { total: number; axes: ScoreAxis[] } | null {
  if (s.tradeCount < 5) return null;
  const clamp = (x: number) => Math.max(0, Math.min(100, Math.round(x)));
  const pf = s.profitFactor ?? (s.wins > 0 ? 3 : 0);
  const wl = s.avgWin !== null && s.avgLoss ? s.avgWin / Math.abs(s.avgLoss) : s.avgWin ? 3 : 0;
  const days = Object.values(dailyPnl(ts));
  const green = days.length ? days.filter((d) => d.pnl > 0).length / days.length : 0;
  const grossUp = ts.filter((t) => t.netPnl > 0).reduce((x, t) => x + t.netPnl, 0);
  const ddRatio = grossUp > 0 ? s.maxDrawdown / grossUp : 1;
  const tagged = ts.filter((t) => t.followedPlan !== null || t.discipline !== null);
  const disc = tagged.length
    ? tagged.reduce((x, t) => x + (t.followedPlan === true ? 50 : t.followedPlan === false ? 0 : 25) + (t.discipline ? (t.discipline - 1) * 12.5 : 25), 0) / tagged.length
    : 50;
  const axes: ScoreAxis[] = [
    { key: "pf", label: "Profit factor", value: clamp((pf / 2.5) * 100), raw: pf.toFixed(2) },
    { key: "wl", label: "Avg win / loss", value: clamp((wl / 2.5) * 100), raw: wl.toFixed(2) },
    { key: "wr", label: "Win rate", value: clamp(((s.winRate ?? 0) / 0.6) * 100), raw: `${Math.round((s.winRate ?? 0) * 100)}%` },
    { key: "cons", label: "Consistency", value: clamp((green / 0.65) * 100), raw: `${Math.round(green * 100)}% green days` },
    { key: "dd", label: "Drawdown control", value: clamp((1 - ddRatio) * 100), raw: `${Math.round(ddRatio * 100)}% of gains` },
    { key: "disc", label: "Discipline", value: clamp(disc), raw: tagged.length ? `${tagged.length} rated` : "not rated" },
  ];
  return { total: Math.round(axes.reduce((x, a) => x + a.value, 0) / axes.length), axes };
}

export interface Insight { id: string; tone: "good" | "bad" | "info"; title: string; body: string }
/** Plain-language findings, most actionable first. Each one is a fact about the user's own data. */
export function insights(ts: ClosedTrade[], cur: string): Insight[] {
  const out: Insight[] = [];
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n);
  if (ts.length < 3) return out;

  const worstMistake = tagImpact(ts, "mistakes").find((b) => b.pnl < 0 && b.trades >= 2);
  if (worstMistake) out.push({ id: "mistake", tone: "bad", title: `“${worstMistake.label}” has cost you ${fmt(Math.abs(worstMistake.pnl))}`, body: `Across ${worstMistake.trades} trades tagged with it. Removing just this habit is the fastest improvement available to you.` });

  const hours = byEntryHour(ts).filter((b) => b.trades >= 3).sort((a, b) => b.pnl - a.pnl);
  if (hours.length >= 2) {
    const best = hours[0], worst = hours[hours.length - 1];
    if (best.pnl > 0) out.push({ id: "hour-best", tone: "good", title: `Your best entry hour is ${best.label} UTC`, body: `${best.trades} trades, ${Math.round(best.winRate * 100)}% win rate, ${fmt(best.pnl)} net.` });
    if (worst.pnl < 0) out.push({ id: "hour-worst", tone: "bad", title: `Trades entered around ${worst.label} UTC are losing`, body: `${worst.trades} trades, ${fmt(worst.pnl)} net. Consider sitting this hour out.` });
  }

  const emo = tagImpact(ts, "emotions").filter((b) => b.trades >= 2);
  const badEmo = emo[0];
  if (badEmo && badEmo.pnl < 0) out.push({ id: "emotion", tone: "bad", title: `When you feel “${badEmo.label}”, you lose`, body: `${badEmo.trades} trades, ${Math.round(badEmo.winRate * 100)}% win rate, ${fmt(badEmo.pnl)} net.` });

  const pa = planAdherence(ts);
  if (pa.followed >= 2 && pa.broke >= 2 && pa.avgFollowed !== null && pa.avgBroke !== null && pa.avgFollowed > pa.avgBroke)
    out.push({ id: "plan", tone: "info", title: `Following your plan is worth ${fmt(pa.avgFollowed - pa.avgBroke)} per trade`, body: `Plan followed: ${fmt(pa.avgFollowed)} avg (${pa.followed} trades). Plan broken: ${fmt(pa.avgBroke)} avg (${pa.broke} trades).` });

  const hold = byHoldTime(ts).filter((b) => b.trades >= 3).sort((a, b) => b.pnl - a.pnl);
  if (hold.length >= 2 && hold[0].pnl > 0) out.push({ id: "hold", tone: "good", title: `You make the most holding ${hold[0].label}`, body: `${hold[0].trades} trades, ${fmt(hold[0].pnl)} net. Your worst hold window is ${hold[hold.length - 1].label}.` });

  const sym = [...new Set(ts.map((t) => t.symbol))].map((s) => ({ s, ...summarize(ts.filter((t) => t.symbol === s)) })).filter((x) => x.tradeCount >= 3).sort((a, b) => b.netPnl - a.netPnl);
  if (sym.length >= 2 && sym[sym.length - 1].netPnl < 0) out.push({ id: "symbol", tone: "bad", title: `${sym[sym.length - 1].s} is your weakest instrument`, body: `${sym[sym.length - 1].tradeCount} trades, ${fmt(sym[sym.length - 1].netPnl)} net, while ${sym[0].s} made ${fmt(sym[0].netPnl)}.` });

  const days = Object.entries(dailyPnl(ts));
  const afterLoss = days.slice(1).filter((_, i) => days[i][1].pnl < 0);
  if (afterLoss.length >= 3) {
    const avg = afterLoss.reduce((x, [, d]) => x + d.pnl, 0) / afterLoss.length;
    if (avg < 0) out.push({ id: "tilt", tone: "bad", title: "Red days tend to follow red days", body: `Your average day after a losing day is ${fmt(avg)}. A daily loss limit could break the chain.` });
  }
  return out;
}

function round(x: number) { return Math.round(x * 100) / 100; }
