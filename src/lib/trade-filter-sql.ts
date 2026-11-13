import { dateWindow, type Filters } from "./filters";

/**
 * Turns a parsed filter state into a SQL condition on `tradenotes.trades` aliased `t`, with every value as a bound parameter
 * (nothing from the URL is ever concatenated into SQL). Row-level security still scopes every query to the signed-in user;
 * these conditions only narrow it further.
 *
 * Date semantics: a trade belongs to the day it CLOSED; a trade that has not closed belongs to the day it was opened.
 * That is what the calendar shows and what "last 30 days" means, and it is the expression the 12_ index covers.
 */
export const TRADE_DATE_SQL = "coalesce(t.closed_at, t.opened_at)";

export interface Where { sql: string; params: unknown[] }

/**
 * @param accountIds accounts in scope (null = all of the user's accounts)
 * @param skipDate   leave the date window out (used by "last 30 days vs the 30 before", which has its own window)
 * @param params     parameters already used by the caller's query; new ones are appended and numbered after them
 */
export function tradeWhere(f: Filters, accountIds: string[] | null, tz: string, opts: { now?: Date; skipDate?: boolean; params?: unknown[] } = {}): Where {
  const params = opts.params ?? [];
  const add = (v: unknown) => { params.push(v); return `$${params.length}`; };
  const c: string[] = ["true"];
  if (accountIds) c.push(`t.account_id = any(${add(accountIds)}::uuid[])`);
  if (!opts.skipDate) {
    const w = dateWindow(f, tz, opts.now);
    if (w.start) c.push(`${TRADE_DATE_SQL} >= ${add(w.start.toISOString())}::timestamptz`);
    if (w.end) c.push(`${TRADE_DATE_SQL} < ${add(w.end.toISOString())}::timestamptz`);
  }
  if (f.strategy) c.push(`exists (select 1 from tradenotes.strategies fs where fs.id = t.strategy_id and fs.name = ${add(f.strategy)})`);
  if (f.symbol) c.push(`t.symbol = ${add(f.symbol)}`);
  if (f.side) c.push(`t.side = ${add(f.side)}`);
  if (f.session) c.push(`t.session = ${add(f.session)}`);
  if (f.tags.length) { const p = add(f.tags); c.push(`(t.mistakes && ${p}::text[] or t.emotions && ${p}::text[])`); }
  return { sql: c.join(" and "), params };
}
