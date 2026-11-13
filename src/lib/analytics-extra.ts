import { orderByClose, summarizeResults, SMALL_SAMPLE_THRESHOLD, type Summary, type TradeResult } from "./metrics";
import { localDayHour } from "./timezone";

/**
 * Phase 2 analytics. Pure functions over per-trade results (no I/O). Every number is hand-checked in analytics-extra.test.ts.
 * Aggregates that already exist in metrics.ts (expectancy, streaks, profit factor, max drawdown) are NOT re-implemented here:
 * these functions either call `summarizeResults` or are checked against it in tests.
 * All of it describes recorded past trades; none of it is a prediction.
 */

// ---------------------------------------------------------------------------------------------------------------- R distribution
export interface RBucket { label: string; /** inclusive lower bound (null = open) */ from: number | null; /** exclusive upper bound (null = open) */ to: number | null; count: number; share: number }
export interface RDistribution { buckets: RBucket[]; withR: number; withoutR: number; total: number }

/** Edges in R. A trade is in the bucket where from <= r < to, so exactly 0R and exactly 1R fall in the bucket that STARTS at them. */
const R_EDGES: (number | null)[] = [null, -3, -2, -1, 0, 1, 2, 3, null];
const rLabel = (lo: number | null, hi: number | null) => (lo === null ? `Below ${hi}R` : hi === null ? `${lo}R or more` : `${lo}R to ${hi}R`).replace(/-/g, "−");

export function rDistribution(rows: readonly Pick<TradeResult, "r">[]): RDistribution {
  const buckets: RBucket[] = [];
  for (let i = 0; i < R_EDGES.length - 1; i++) buckets.push({ label: rLabel(R_EDGES[i], R_EDGES[i + 1]), from: R_EDGES[i], to: R_EDGES[i + 1], count: 0, share: 0 });
  let withR = 0;
  for (const t of rows) {
    if (t.r === null || !Number.isFinite(t.r)) continue;
    withR++;
    const b = buckets.find((x) => (x.from === null || t.r! >= x.from) && (x.to === null || t.r! < x.to))!;
    b.count++;
  }
  for (const b of buckets) b.share = withR ? b.count / withR : 0;
  return { buckets, withR, withoutR: rows.length - withR, total: rows.length };
}

// ---------------------------------------------------------------------------------------------------------------- heatmap
export interface HeatCell { trades: number; netPnl: number }
export interface Heatmap {
  /** cells[day][hour]; day 0 = Sunday, hour 0-23, both in the user's time zone, by ENTRY time. */
  cells: HeatCell[][];
  maxAbs: number;
  trades: number;
}
/** Net P&L and trade count by weekday x hour of ENTRY in `tz` (so "when do I enter, and how does it go"). */
export function weekdayHourHeatmap(rows: readonly (Pick<TradeResult, "netPnl"> & { openedAt: string })[], tz: string): Heatmap {
  const cells: HeatCell[][] = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => ({ trades: 0, netPnl: 0 })));
  for (const t of rows) {
    const { day, hour } = localDayHour(t.openedAt, tz);
    const c = cells[day][hour];
    c.trades++; c.netPnl += t.netPnl;
  }
  let maxAbs = 0;
  for (const row of cells) for (const c of row) { c.netPnl = Math.round(c.netPnl * 1e8) / 1e8; maxAbs = Math.max(maxAbs, Math.abs(c.netPnl)); }
  return { cells, maxAbs, trades: rows.length };
}

/** 0 = nothing/zero, 1 = small, 2 = medium, 3 = large (relative to the largest absolute value shown). Shared by the heatmap and the calendar. */
export function intensityLevel(value: number, maxAbs: number): 0 | 1 | 2 | 3 {
  if (!(maxAbs > 0) || value === 0) return 0;
  const f = Math.abs(value) / maxAbs;
  return f < 1 / 3 ? 1 : f < 2 / 3 ? 2 : 3;
}
export const INTENSITY_WORDS = ["none", "small", "medium", "large"] as const;

// ---------------------------------------------------------------------------------------------------------------- hold time
export interface HoldBucket { label: string; /** inclusive lower bound, minutes */ fromMin: number; /** exclusive upper bound, minutes (null = open) */ toMin: number | null; summary: Summary }
export interface HoldTime { buckets: HoldBucket[]; /** trades with no close time or a close before the open (not bucketed) */ skipped: number }

const HOLD_EDGES: [string, number, number | null][] = [
  ["Under 5 min", 0, 5], ["5 to 15 min", 5, 15], ["15 to 60 min", 15, 60], ["1 to 4 hours", 60, 240], ["4 to 24 hours", 240, 1440], ["1 to 7 days", 1440, 10080], ["7 days or more", 10080, null],
];
/** Results grouped by how long the trade was held (close time minus entry time). */
export function holdTimeBuckets(rows: readonly (TradeResult & { openedAt: string })[]): HoldTime {
  const groups: TradeResult[][] = HOLD_EDGES.map(() => []);
  let skipped = 0;
  for (const t of rows) {
    if (!t.closedAt) { skipped++; continue; }
    const min = (new Date(t.closedAt).getTime() - new Date(t.openedAt).getTime()) / 60000;
    if (!(min >= 0)) { skipped++; continue; }
    const i = HOLD_EDGES.findIndex(([, lo, hi]) => min >= lo && (hi === null || min < hi));
    groups[i].push(t);
  }
  return { buckets: HOLD_EDGES.map(([label, fromMin, toMin], i) => ({ label, fromMin, toMin, summary: summarizeResults(groups[i]) })), skipped };
}

// ---------------------------------------------------------------------------------------------------------------- mistake cost
export interface MistakeRow { tag: string; trades: number; netPnl: number; /** sum of the negative trades only (always <= 0) */ lossTotal: number; avgPerTrade: number; winRate: number }
export interface MistakeCost {
  /** Costliest first (lowest net P&L). A trade with several tags is counted under EACH of them, so these rows do not add up to a total. */
  tags: MistakeRow[];
  /** Distinct trades, each counted once, so these two do add up to all trades. */
  withMistake: { trades: number; netPnl: number; avgPerTrade: number | null };
  withoutMistake: { trades: number; netPnl: number; avgPerTrade: number | null };
}
export function mistakeCost(rows: readonly (TradeResult & { mistakes: readonly string[] })[]): MistakeCost {
  const by = new Map<string, TradeResult[]>();
  const withM = { trades: 0, netPnl: 0 }, without = { trades: 0, netPnl: 0 };
  for (const t of rows) {
    const tags = [...new Set(t.mistakes)];
    if (tags.length) { withM.trades++; withM.netPnl += t.netPnl; } else { without.trades++; without.netPnl += t.netPnl; }
    for (const tag of tags) { const l = by.get(tag); if (l) l.push(t); else by.set(tag, [t]); }
  }
  const round = (x: number) => Math.round(x * 1e8) / 1e8;
  const tags: MistakeRow[] = [...by.entries()].map(([tag, ts]) => {
    const net = ts.reduce((s, t) => s + t.netPnl, 0);
    return { tag, trades: ts.length, netPnl: round(net), lossTotal: round(ts.filter((t) => t.netPnl < 0).reduce((s, t) => s + t.netPnl, 0)), avgPerTrade: round(net / ts.length), winRate: ts.filter((t) => t.netPnl > 0).length / ts.length };
  }).sort((a, b) => a.netPnl - b.netPnl || a.tag.localeCompare(b.tag));
  const g = (x: { trades: number; netPnl: number }) => ({ trades: x.trades, netPnl: round(x.netPnl), avgPerTrade: x.trades ? round(x.netPnl / x.trades) : null });
  return { tags, withMistake: g(withM), withoutMistake: g(without) };
}

// ---------------------------------------------------------------------------------------------------------------- drawdown
export interface DrawdownDetail {
  /** Largest peak-to-trough fall of cumulative net P&L (same definition as Summary.maxDrawdown: the curve starts at 0). */
  maxDrawdown: number;
  /** Trade number (1-based, in close order) at which the peak before the worst fall was reached; 0 = the starting level. Null when there was no fall. */
  peakAfterTrade: number | null;
  troughAfterTrade: number | null;
  peakAt: string | null;
  troughAt: string | null;
  peakValue: number | null;
  troughValue: number | null;
  /** The close time of the first trade that brought the curve back to the old peak; null while it has not recovered. */
  recoveredAt: string | null;
  recoveredAfterTrade: number | null;
  recovered: boolean;
  /** Trades from the trough to the recovery (null if not recovered). */
  tradesToRecover: number | null;
  /** Where the curve is now relative to its highest point so far. */
  current: { drawdown: number; fromPeak: boolean };
}

export function drawdownDetail(rows: readonly TradeResult[]): DrawdownDetail {
  const r = orderByClose(rows);
  let cum = 0, peak = 0, peakIdx = 0, maxDd = 0, bestPeakIdx = 0, troughIdx = 0, bestPeakVal = 0, troughVal = 0;
  const curve: number[] = [];
  for (let i = 0; i < r.length; i++) {
    cum += r[i].netPnl; curve.push(cum);
    if (cum > peak) { peak = cum; peakIdx = i + 1; }
    if (peak - cum > maxDd) { maxDd = peak - cum; bestPeakIdx = peakIdx; troughIdx = i + 1; bestPeakVal = peak; troughVal = cum; }
  }
  const round = (x: number) => Math.round(x * 1e8) / 1e8;
  const at = (idx: number) => (idx === 0 ? null : r[idx - 1].closedAt);
  const cur = { drawdown: round(peak - cum), fromPeak: peak - cum > 0 };
  if (maxDd <= 0) return { maxDrawdown: 0, peakAfterTrade: null, troughAfterTrade: null, peakAt: null, troughAt: null, peakValue: null, troughValue: null, recoveredAt: null, recoveredAfterTrade: null, recovered: false, tradesToRecover: null, current: cur };
  let recIdx: number | null = null;
  for (let i = troughIdx; i < r.length; i++) if (curve[i] >= bestPeakVal - 1e-9) { recIdx = i + 1; break; }
  return {
    maxDrawdown: round(maxDd), peakAfterTrade: bestPeakIdx, troughAfterTrade: troughIdx, peakAt: at(bestPeakIdx), troughAt: at(troughIdx),
    peakValue: round(bestPeakVal), troughValue: round(troughVal),
    recoveredAt: recIdx === null ? null : at(recIdx), recoveredAfterTrade: recIdx, recovered: recIdx !== null, tradesToRecover: recIdx === null ? null : recIdx - troughIdx, current: cur,
  };
}

// ---------------------------------------------------------------------------------------------------------------- profit factor
export type PfWarning = "no_losses" | "small_sample" | "few_losses" | null;
export interface ProfitFactorInfo {
  /** gross profit / |gross loss| (net of fees). null when there is no losing trade: never Infinity. */
  value: number | null;
  grossProfit: number; grossLoss: number; wins: number; losses: number; trades: number;
  warning: PfWarning;
  message: string | null;
}
export const FEW_LOSSES_THRESHOLD = 5;
export function profitFactorInfo(rows: readonly TradeResult[]): ProfitFactorInfo {
  const s = summarizeResults(rows); // the one place the formula lives
  const trades = s.tradeCount, losses = s.losses;
  let warning: PfWarning = null, message: string | null = null;
  if (trades === 0) { /* nothing to warn about yet */ }
  else if (losses === 0) { warning = "no_losses"; message = "No losing trade yet, so profit factor has no value (it would be infinite). It appears after your first loss."; }
  else if (trades < SMALL_SAMPLE_THRESHOLD) { warning = "small_sample"; message = `Based on only ${trades} closed trade${trades === 1 ? "" : "s"} (under ${SMALL_SAMPLE_THRESHOLD}). Treat it as a rough guide, not a verdict.`; }
  else if (losses < FEW_LOSSES_THRESHOLD) { warning = "few_losses"; message = `Only ${losses} losing trade${losses === 1 ? "" : "s"}: one more loss would move this number a lot.`; }
  return { value: s.profitFactor, grossProfit: s.grossProfit, grossLoss: s.grossLoss, wins: s.wins, losses, trades, warning, message };
}

// ---------------------------------------------------------------------------------------------------------------- playbook adherence
export interface AdherenceInput { checksDone: number | null; checksTotal: number | null }
export interface AdherenceBucket { label: string; summary: Summary }
export interface Adherence {
  /** trades that have at least one checklist answer / trades without any */
  checked: number; unchecked: number;
  /** checked / all trades (null with no trades) */
  coverage: number | null;
  /** mean of each checked trade's followed / answered (null when nothing is checked) */
  avgAdherence: number | null;
  /** results by how much of the checklist was followed; only checked trades appear here */
  buckets: AdherenceBucket[];
}
export const ADHERENCE_BUCKETS = ["All rules followed (100%)", "Most followed (50% to 99%)", "Few followed (under 50%)"] as const;

/** Per-trade adherence = rules followed / rules answered. Trades with no answers are "unchecked" and left out of the percentages. */
export function adherenceAnalysis(rows: readonly (TradeResult & AdherenceInput)[]): Adherence {
  const groups: TradeResult[][] = ADHERENCE_BUCKETS.map(() => []);
  let checked = 0, sum = 0;
  for (const t of rows) {
    if (!t.checksTotal || t.checksTotal <= 0 || t.checksDone === null) continue;
    const a = t.checksDone / t.checksTotal;
    checked++; sum += a;
    groups[a >= 1 ? 0 : a >= 0.5 ? 1 : 2].push(t);
  }
  return {
    checked, unchecked: rows.length - checked, coverage: rows.length ? checked / rows.length : null, avgAdherence: checked ? sum / checked : null,
    buckets: ADHERENCE_BUCKETS.map((label, i) => ({ label, summary: summarizeResults(groups[i]) })),
  };
}

export interface StrategyAdherence { strategy: string; checkedTrades: number; avgAdherence: number }
export function adherenceByStrategy(rows: readonly (TradeResult & AdherenceInput & { strategy: string | null })[]): StrategyAdherence[] {
  const by = new Map<string, { n: number; sum: number }>();
  for (const t of rows) {
    if (!t.checksTotal || t.checksTotal <= 0 || t.checksDone === null) continue;
    const k = t.strategy ?? "No strategy";
    const e = by.get(k) ?? { n: 0, sum: 0 };
    e.n++; e.sum += t.checksDone / t.checksTotal; by.set(k, e);
  }
  return [...by.entries()].map(([strategy, e]) => ({ strategy, checkedTrades: e.n, avgAdherence: e.sum / e.n })).sort((a, b) => b.avgAdherence - a.avgAdherence || a.strategy.localeCompare(b.strategy));
}
