/**
 * TradeNotes metrics engine. Pure functions, no I/O.
 * Every formula is documented in docs/PRODUCT_SPEC.md §Metrics and tested in metrics.test.ts.
 *
 * Conventions:
 * - All money is in the ACCOUNT currency. Trades in a different currency must carry
 *   `fxToAccount` (multiply instrument-currency P&L by it). Missing fx => trade excluded
 *   and reported in `excluded`, never silently mixed.
 * - Fees are always subtracted. Net P&L is the headline number.
 * - Partial exits: a trade is "closed" only when exited quantity == entry quantity.
 *   Open / partially-open trades are excluded from closed-trade statistics.
 * - Breakeven trades (net == 0) count toward trade count but are neither wins nor losses.
 * - R-multiple requires `initialRisk` (> 0, account currency). Trades without it are
 *   excluded from R stats only, and `rCoverage` reports how many had it.
 */

export type Side = "long" | "short";

export interface Exit {
  quantity: number;
  price: number;
}

export interface TradeInput {
  id: string;
  side: Side;
  quantity: number;
  entryPrice: number;
  exits: Exit[];
  /** Total commissions + fees + swaps, positive number, instrument currency. */
  fees: number;
  /** Contract/point multiplier (1 for stocks/crypto, e.g. 50 for ES, 100000 per lot FX if qty in lots). */
  multiplier?: number;
  /** Planned risk in account currency (entry to stop × size × multiplier). */
  initialRisk?: number | null;
  /** Multiply instrument-currency P&L by this to get account currency. Default 1 when same currency. */
  fxToAccount?: number | null;
  sameCurrencyAsAccount?: boolean;
  closedAt?: string | null; // ISO, used for ordering/equity curve
}

export type ExclusionReason = "open_or_partial" | "missing_fx" | "invalid";

export interface TradeResult {
  id: string;
  netPnl: number;
  grossPnl: number;
  fees: number;
  r: number | null;
  closedAt: string | null;
}

const EPS = 1e-9;

export function exitedQuantity(t: TradeInput): number {
  return t.exits.reduce((s, e) => s + e.quantity, 0);
}

export function evaluateTrade(t: TradeInput): TradeResult | ExclusionReason {
  if (!(t.quantity > 0) || !(t.entryPrice > 0) || t.fees < 0 || t.exits.some((e) => !(e.quantity > 0) || !(e.price > 0))) {
    return "invalid";
  }
  const exited = exitedQuantity(t);
  if (exited - t.quantity > EPS) return "invalid"; // over-exited
  if (Math.abs(exited - t.quantity) > EPS) return "open_or_partial";

  let fx = 1;
  if (t.sameCurrencyAsAccount === false) {
    if (!t.fxToAccount || t.fxToAccount <= 0) return "missing_fx";
    fx = t.fxToAccount;
  }
  const dir = t.side === "long" ? 1 : -1;
  const mult = t.multiplier ?? 1;
  const grossInstr = t.exits.reduce((s, e) => s + dir * (e.price - t.entryPrice) * e.quantity * mult, 0);
  const grossPnl = grossInstr * fx;
  const fees = t.fees * fx;
  const netPnl = grossPnl - fees;
  const r = t.initialRisk && t.initialRisk > 0 ? netPnl / t.initialRisk : null;
  return { id: t.id, netPnl: round(netPnl), grossPnl: round(grossPnl), fees: round(fees), r, closedAt: t.closedAt ?? null };
}

export interface Summary {
  tradeCount: number;
  wins: number;
  losses: number;
  breakevens: number;
  /** wins / (wins + losses + breakevens). null if no trades. */
  winRate: number | null;
  netPnl: number;
  grossPnl: number;
  totalFees: number;
  avgWin: number | null;
  avgLoss: number | null; // negative number
  /** gross profit of winners / |gross loss of losers| (net of fees). null if no losers. */
  profitFactor: number | null;
  /** netPnl / tradeCount */
  expectancy: number | null;
  avgR: number | null;
  rCoverage: { withR: number; total: number };
  /** Largest peak-to-trough decline of cumulative net P&L, as positive number. */
  maxDrawdown: number;
  maxWinStreak: number;
  maxLossStreak: number;
  equityCurve: { id: string; closedAt: string | null; cumulative: number }[];
  excluded: Record<ExclusionReason, string[]>;
  /** True when sample is too small to draw conclusions (< 30 closed trades). */
  smallSample: boolean;
}

export const SMALL_SAMPLE_THRESHOLD = 30;

export function summarize(trades: TradeInput[]): Summary {
  const excluded: Record<ExclusionReason, string[]> = { open_or_partial: [], missing_fx: [], invalid: [] };
  const results: TradeResult[] = [];
  for (const t of trades) {
    const r = evaluateTrade(t);
    if (typeof r === "string") excluded[r].push(t.id);
    else results.push(r);
  }
  return summarizeResults(results, excluded);
}

/**
 * Every aggregate (counts, win rate, profit factor, expectancy, R, drawdown, streaks, equity curve) is computed here, from per-trade
 * results. `summarize` feeds it results computed by `evaluateTrade`; the database loader (trades-data.ts) feeds it results computed in
 * SQL with the same per-trade formula (asserted equal on a seeded 10,000-trade set in aggregate.db.test.ts). So there is exactly one
 * place where an aggregate formula lives.
 */
export function summarizeResults(input: readonly TradeResult[], excluded: Record<ExclusionReason, string[]> = { open_or_partial: [], missing_fx: [], invalid: [] }): Summary {
  // Order by close time (nulls last, stable).
  const results = [...input].sort((a, b) => {
    if (a.closedAt === b.closedAt) return 0;
    if (a.closedAt === null) return 1;
    if (b.closedAt === null) return -1;
    return a.closedAt < b.closedAt ? -1 : 1;
  });

  const winners = results.filter((r) => r.netPnl > 0);
  const losers = results.filter((r) => r.netPnl < 0);
  const n = results.length;
  const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
  const grossWin = sum(winners.map((r) => r.netPnl));
  const grossLoss = sum(losers.map((r) => r.netPnl));
  const netPnl = sum(results.map((r) => r.netPnl));
  const withR = results.filter((r) => r.r !== null);

  let cum = 0, peak = 0, maxDd = 0, ws = 0, ls = 0, maxWs = 0, maxLs = 0;
  const equityCurve: Summary["equityCurve"] = [];
  for (const r of results) {
    cum += r.netPnl;
    peak = Math.max(peak, cum);
    maxDd = Math.max(maxDd, peak - cum);
    equityCurve.push({ id: r.id, closedAt: r.closedAt, cumulative: round(cum) });
    if (r.netPnl > 0) { ws++; ls = 0; } else if (r.netPnl < 0) { ls++; ws = 0; } else { ws = 0; ls = 0; }
    maxWs = Math.max(maxWs, ws);
    maxLs = Math.max(maxLs, ls);
  }

  return {
    tradeCount: n,
    wins: winners.length,
    losses: losers.length,
    breakevens: n - winners.length - losers.length,
    winRate: n ? winners.length / n : null,
    netPnl: round(netPnl),
    grossPnl: round(sum(results.map((r) => r.grossPnl))),
    totalFees: round(sum(results.map((r) => r.fees))),
    avgWin: winners.length ? round(grossWin / winners.length) : null,
    avgLoss: losers.length ? round(grossLoss / losers.length) : null,
    profitFactor: losers.length ? grossWin / Math.abs(grossLoss) : null,
    expectancy: n ? round(netPnl / n) : null,
    avgR: withR.length ? sum(withR.map((r) => r.r as number)) / withR.length : null,
    rCoverage: { withR: withR.length, total: n },
    maxDrawdown: round(maxDd),
    maxWinStreak: maxWs,
    maxLossStreak: maxLs,
    equityCurve,
    excluded,
    smallSample: n < SMALL_SAMPLE_THRESHOLD,
  };
}

/** Group per-trade results by a key and summarize each (same as groupSummary, for results that are already computed). */
export function groupResults<T extends TradeResult>(rows: readonly T[], key: (t: T) => string | null | undefined): Record<string, Summary> {
  const groups: Record<string, T[]> = {};
  for (const t of rows) (groups[key(t) || "Untagged"] ||= []).push(t);
  return Object.fromEntries(Object.entries(groups).map(([k, ts]) => [k, summarizeResults(ts)]));
}

/** Summaries per tag. A trade carrying several tags counts under each of them (so the rows do not add up to the total). */
export function tagResults<T extends TradeResult>(rows: readonly T[], tags: (t: T) => readonly string[]): Record<string, Summary> {
  const groups: Record<string, T[]> = {};
  for (const t of rows) for (const tag of tags(t)) (groups[tag] ||= []).push(t);
  return Object.fromEntries(Object.entries(groups).map(([k, ts]) => [k, summarizeResults(ts)]));
}

/** Group closed trades by a key (strategy, session, weekday, symbol, side, timeframe) and summarize each. */
export function groupSummary<T extends TradeInput>(trades: T[], key: (t: T) => string | null | undefined): Record<string, Summary> {
  const groups: Record<string, T[]> = {};
  for (const t of trades) {
    const k = key(t) || "Untagged";
    (groups[k] ||= []).push(t);
  }
  return Object.fromEntries(Object.entries(groups).map(([k, ts]) => [k, summarize(ts)]));
}

function round(x: number): number {
  return Math.round(x * 1e8) / 1e8;
}
