import type { Q } from "./db";
import { evaluateTrade, summarize, type Summary, type TradeInput } from "./metrics";
import { toTradeInputs, type TradeRow, type ExitRow } from "./trade-schema";

/**
 * Read model shared by the Dashboard and Analytics pages. Presentation-side only:
 * one read query (unchanged from the original dashboard, plus opened_at/mistakes/emotions columns)
 * and pure helpers over the existing metrics engine. No writes, no schema assumptions beyond db/paste.
 */
export interface StatRow extends TradeRow {
  symbol: string; session: string | null; strategy_name: string | null; opened_at: string;
  mistakes: string[] | null; emotions: string[] | null; exits: ExitRow[]; account_id: string; account_currency: string;
}
export type Ext = TradeInput & { symbol: string; session: string | null; strategy: string | null; openedAt: string; mistakes: string[]; emotions: string[] };

export const TRADE_LIMIT = 10000;

export async function loadTrades(db: <T>(fn: (q: Q) => Promise<T>) => Promise<T>, accountIds: string[] | null = null): Promise<{ rows: StatRow[]; truncated: boolean }> {
  const all = await db((q) => q<StatRow>(
    `select t.id, t.side, t.quantity, t.entry_price, t.fees, t.multiplier, t.initial_risk, t.currency, t.fx_to_account, t.closed_at, t.opened_at, t.symbol, t.session, t.mistakes, t.emotions, s.name as strategy_name,
       t.account_id, a.currency as account_currency,
       coalesce((select json_agg(json_build_object('trade_id', e.trade_id, 'quantity', e.quantity, 'price', e.price)) from tradenotes.trade_exits e where e.trade_id = t.id), '[]'::json) as exits
     from tradenotes.trades t join tradenotes.accounts a on a.id = t.account_id left join tradenotes.strategies s on s.id = t.strategy_id
     where ($1::uuid[] is null or t.account_id = any($1)) order by t.opened_at limit ${TRADE_LIMIT + 1}`, [accountIds]));
  const truncated = all.length > TRADE_LIMIT;
  return { rows: truncated ? all.slice(0, TRADE_LIMIT) : all, truncated };
}

/**
 * Rows -> metrics input in the display currency. A trade whose own account uses a different currency cannot be converted
 * (no FX source), so it is marked as needing a rate and excluded with a disclosure rather than silently mixed.
 */
export function toExt(rows: StatRow[], displayCurrency: string): Ext[] {
  const inputs = rows.map((r) => {
    const own = r.account_currency ?? displayCurrency;
    const t = toTradeInputs([r], r.exits, own)[0];
    return own === displayCurrency ? t : { ...t, sameCurrencyAsAccount: false, fxToAccount: null };
  });
  return inputs.map((t, i) => ({ ...t, symbol: rows[i].symbol, session: rows[i].session, strategy: rows[i].strategy_name, openedAt: rows[i].opened_at, mistakes: rows[i].mistakes ?? [], emotions: rows[i].emotions ?? [] }));
}

export const RANGES = [
  { value: "all", label: "All time" },
  { value: "ytd", label: "This year" },
  { value: "90d", label: "90 days" },
  { value: "30d", label: "30 days" },
] as const;
export type RangeId = (typeof RANGES)[number]["value"];
export const parseRange = (v: string | undefined): RangeId => (RANGES.some((r) => r.value === v) ? (v as RangeId) : "all");

export function rangeStart(range: RangeId, now = new Date()): Date | null {
  if (range === "all") return null;
  if (range === "ytd") return new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  return new Date(now.getTime() - (range === "90d" ? 90 : 30) * 86400000);
}
/** Keep trades closed on/after `start`. Trades with no close time are kept so they are still disclosed as open. */
export function inRange<T extends TradeInput>(trades: T[], start: Date | null, end?: Date): T[] {
  if (!start && !end) return trades;
  return trades.filter((t) => {
    if (!t.closedAt) return !end;
    const c = new Date(t.closedAt);
    return (!start || c >= start) && (!end || c < end);
  });
}

/** Summaries per tag. A trade carrying several tags counts under each of them (so rows do not add up to the total). */
export function tagSummary<T extends TradeInput>(trades: T[], tags: (t: T) => string[]): Record<string, Summary> {
  const groups: Record<string, T[]> = {};
  for (const t of trades) for (const tag of tags(t)) (groups[tag] ||= []).push(t);
  return Object.fromEntries(Object.entries(groups).map(([k, ts]) => [k, summarize(ts)]));
}

/** Largest single closed loss, or null. */
export function worstTrade<T extends TradeInput>(trades: T[]): { trade: T; netPnl: number } | null {
  let worst: { trade: T; netPnl: number } | null = null;
  for (const t of trades) {
    const r = evaluateTrade(t);
    if (typeof r !== "string" && r.netPnl < 0 && (!worst || r.netPnl < worst.netPnl)) worst = { trade: t, netPnl: r.netPnl };
  }
  return worst;
}
