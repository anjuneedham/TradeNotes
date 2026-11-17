import type { Q } from "./db";
import { NO_FILTERS, type DateWindow, type Filters, type FilterOptions } from "./filters";
import { tradeWhere } from "./trade-filter-sql";
import type { ExclusionReason, TradeResult } from "./metrics";

/**
 * Read model for Dashboard, Analytics and Calendar. The database does the filtering (SQL conditions + indexes, see db/paste/12_*.sql),
 * the joins, the exit aggregation and the per-trade result (the same formula as `evaluateTrade` in metrics.ts; the 10,000-trade test in
 * aggregate.db.test.ts asserts they agree). Every AGGREGATE (win rate, profit factor, drawdown, streaks, R, ...) is then computed by
 * metrics.ts `summarizeResults` from those per-trade results, so aggregate formulas exist in exactly one place.
 * No row cap: a filter narrows the data, nothing is silently dropped.
 */
type Db = <T>(fn: (q: Q) => Promise<T>) => Promise<T>;

export interface ResultRow extends TradeResult {
  symbol: string; side: "long" | "short"; session: string | null; strategy: string | null;
  openedAt: string; mistakes: string[]; emotions: string[];
  /** Playbook checklist answers for the trade (rules followed / rules answered). Null unless loaded with `checks: true`. */
  checksDone: number | null; checksTotal: number | null;
}
export type Excluded = Record<ExclusionReason, string[]>;
export interface LoadedResults {
  /** Fully closed trades with a result, in the order the database returned them (opened_at, id). */
  rows: ResultRow[];
  /** Matching trades that cannot be counted, by reason (ids). */
  excluded: Excluded;
}
export interface LatestRow { id: string; symbol: string; side: "long" | "short"; openedAt: string; status: "closed" | ExclusionReason; netPnl: number | null; r: number | null }

interface SqlRow {
  id: string; symbol: string; side: "long" | "short"; session: string | null; strategy: string | null; opened_at: string; closed_at: string | null;
  mistakes: string[]; emotions: string[]; status: "closed" | ExclusionReason; gross: number | null; fees: number | null; net: number | null; r: number | null;
  checks_done?: number | null; checks_total?: number | null;
}

/**
 * One row per matching trade with its result. $1 is the display currency. Mirrors `evaluateTrade` (metrics.ts):
 *   gross (instrument currency) = direction x multiplier x (sum of exit qty*price - entry x sum of exit qty); then x fx; net = gross - fees x fx;
 *   r = net / initial_risk when initial_risk > 0; status precedence: over-exited (invalid) > not fully exited (open_or_partial) > no usable fx (missing_fx).
 *   Account in another currency than the display currency => missing_fx (never mixed). Outputs are rounded to 1e-8 like the engine.
 */
const SELECT_HEAD = `
  select t.id, t.symbol, t.side, t.session, s.name as strategy, t.opened_at, t.closed_at,
         coalesce(t.mistakes, '{}') as mistakes, coalesce(t.emotions, '{}') as emotions,
         c.status, c.gross::float8 as gross, c.fees::float8 as fees, c.net::float8 as net, c.r::float8 as r__CHECKS_COLS__
  from tradenotes.trades t
  join tradenotes.accounts a on a.id = t.account_id
  left join tradenotes.strategies s on s.id = t.strategy_id
  left join lateral (select sum(e.quantity) as q, sum(e.quantity * e.price) as v from tradenotes.trade_exits e where e.trade_id = t.id) x on true
  cross join lateral (select (case t.side when 'long' then 1 else -1 end) * t.multiplier * (x.v - t.entry_price * x.q) as g,
                             case when t.currency is not null and t.currency <> a.currency then t.fx_to_account else 1 end as fx) k
  cross join lateral (select
      case when coalesce(x.q, 0) > t.quantity then 'invalid'
           when coalesce(x.q, 0) < t.quantity then 'open_or_partial'
           when a.currency::text <> $1::text then 'missing_fx'
           when t.currency is not null and t.currency <> a.currency and (t.fx_to_account is null or t.fx_to_account <= 0) then 'missing_fx'
           else 'closed' end as status,
      round(k.g * k.fx, 8) as gross,
      round(t.fees * k.fx, 8) as fees,
      round(k.g * k.fx - t.fees * k.fx, 8) as net,
      case when t.initial_risk > 0 then (k.g * k.fx - t.fees * k.fx) / t.initial_risk end as r) c__CHECKS_JOIN__`;

const CHECKS_COLS = ", ck.done as checks_done, ck.total as checks_total";
const CHECKS_JOIN = `
  left join lateral (select (count(*) filter (where tc.followed))::int as done, count(*)::int as total from tradenotes.trade_checks tc where tc.trade_id = t.id
    and exists (select 1 from tradenotes.playbook_items pi where pi.id = tc.item_id and pi.strategy_id = t.strategy_id)) ck on true`; // answers for a previous strategy's rules do not count
export const RESULT_SELECT = SELECT_HEAD.replace("__CHECKS_COLS__", "").replace("__CHECKS_JOIN__", "");
/** Same query plus the playbook checklist answers per trade (one extra indexed lookup per trade; only analytics needs it). */
export const RESULT_SELECT_WITH_CHECKS = SELECT_HEAD.replace("__CHECKS_COLS__", CHECKS_COLS).replace("__CHECKS_JOIN__", CHECKS_JOIN);

const toRow = (r: SqlRow): ResultRow => ({
  id: r.id, netPnl: r.net as number, grossPnl: r.gross as number, fees: r.fees as number, r: r.r, closedAt: r.closed_at,
  symbol: r.symbol, side: r.side, session: r.session, strategy: r.strategy, openedAt: r.opened_at, mistakes: r.mistakes ?? [], emotions: r.emotions ?? [],
  // no answers at all => null (the lateral count returns 0)
  checksDone: r.checks_total ? (r.checks_done ?? 0) : null, checksTotal: r.checks_total ? r.checks_total : null,
});

export interface LoadOpts { skipDate?: boolean; window?: DateWindow; /** also load the playbook checklist answers (analytics) */ checks?: boolean }

/** All matching trades, split into counted results and exclusions. */
export async function loadResults(db: Db, accountIds: string[] | null, currency: string, filters: Filters = NO_FILTERS, tz = "UTC", opts: LoadOpts = {}): Promise<LoadedResults> {
  const w = tradeWhere(filters, accountIds, tz, { ...opts, params: [currency] });
  const sqlRows = await db((q) => q<SqlRow>(`${opts.checks ? RESULT_SELECT_WITH_CHECKS : RESULT_SELECT} where ${w.sql} order by t.opened_at, t.id`, w.params));
  const rows: ResultRow[] = [];
  const excluded: Excluded = { open_or_partial: [], missing_fx: [], invalid: [] };
  for (const r of sqlRows) { if (r.status === "closed") rows.push(toRow(r)); else excluded[r.status].push(r.id); }
  return { rows, excluded };
}

/** The most recent trades (by entry time), counted or not, for the dashboard's "Latest trades". */
export async function loadLatest(db: Db, accountIds: string[] | null, currency: string, filters: Filters, tz: string, n = 5): Promise<LatestRow[]> {
  const w = tradeWhere(filters, accountIds, tz, { params: [currency] });
  const rows = await db((q) => q<SqlRow>(`${RESULT_SELECT} where ${w.sql} order by t.opened_at desc, t.id limit ${Math.max(1, Math.min(50, Math.floor(n)))}`, w.params));
  return rows.map((r) => ({ id: r.id, symbol: r.symbol, side: r.side, openedAt: r.opened_at, status: r.status, netPnl: r.status === "closed" ? r.net : null, r: r.status === "closed" ? r.r : null }));
}

/** Values for the filter bar's dropdowns (the user's own strategies and instruments; row-level security applies). */
export async function loadFilterOptions(db: Db, accounts: { id: string; name: string }[]): Promise<FilterOptions> {
  const { strategies, symbols } = await db(async (q) => ({
    strategies: await q<{ name: string }>("select name from tradenotes.strategies order by lower(name) limit 200"),
    symbols: await q<{ symbol: string }>("select distinct symbol from tradenotes.trades order by symbol limit 300"),
  }));
  return { accounts: accounts.map((a) => ({ id: a.id, name: a.name })), strategies: strategies.map((r) => r.name), symbols: symbols.map((r) => r.symbol) };
}

/** Largest single closed loss, or null. */
export function worstResult<T extends TradeResult>(rows: readonly T[]): T | null {
  let worst: T | null = null;
  for (const r of rows) if (r.netPnl < 0 && (!worst || r.netPnl < worst.netPnl)) worst = r;
  return worst;
}

/** Keep results closed in [start, end). */
export function closedBetween<T extends TradeResult>(rows: readonly T[], start: Date | null, end: Date | null): T[] {
  return rows.filter((r) => {
    if (!r.closedAt) return false;
    const c = new Date(r.closedAt).getTime();
    return (!start || c >= start.getTime()) && (!end || c < end.getTime());
  });
}
