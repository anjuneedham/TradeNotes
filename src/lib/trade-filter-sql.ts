import { dateWindow, type DateWindow, type Filters } from "./filters";

/**
 * Turns a parsed filter state into a SQL condition on `tradenotes.trades` aliased `t`, with every value as a bound parameter
 * (nothing from the URL is ever concatenated into SQL). Row-level security still scopes every query to the signed-in user;
 * these conditions only narrow it further.
 *
 * Date semantics: a trade belongs to the day it CLOSED; a trade that has not closed belongs to the day it was opened.
 * That is what the calendar shows and what "last 30 days" means.
 *
 * The date condition is written on the plain columns (closed_at, opened_at) on purpose. The obvious form,
 * coalesce(closed_at, opened_at) >= x, can NEVER use an index under row-level security: Postgres treats COALESCE as leaky and will not
 * push it below the policy qualifier (measured: 100k-trade user, plan shows the range applied as a heap filter). Plain comparisons are
 * leakproof and use trades_user_closed / trades_user_opened (db/paste/12_analytics_indexes.sql).
 */

export interface Where { sql: string; params: unknown[] }

/**
 * @param accountIds accounts in scope (null = all of the user's accounts)
 * @param skipDate   leave the date window out
 * @param window     use this window instead of the one in the filters (used by "last 30 days vs the 30 before")
 * @param params     parameters already used by the caller's query; new ones are appended and numbered after them
 */
export function tradeWhere(f: Filters, accountIds: string[] | null, tz: string, opts: { now?: Date; skipDate?: boolean; window?: DateWindow; params?: unknown[] } = {}): Where {
  const params = opts.params ?? [];
  const add = (v: unknown) => { params.push(v); return `$${params.length}`; };
  const c: string[] = ["true"];
  if (accountIds) c.push(`t.account_id = any(${add(accountIds)}::uuid[])`);
  if (!opts.skipDate) {
    const w = opts.window ?? dateWindow(f, tz, opts.now);
    if (w.start || w.end) {
      const lo = w.start ? `${add(w.start.toISOString())}::timestamptz` : null, hi = w.end ? `${add(w.end.toISOString())}::timestamptz` : null;
      const range = (col: string) => [lo && `${col} >= ${lo}`, hi && `${col} < ${hi}`].filter(Boolean).join(" and ");
      c.push(`((${range("t.closed_at")}) or (t.closed_at is null and ${range("t.opened_at")}))`);
    }
  }
  if (f.strategy) c.push(`exists (select 1 from tradenotes.strategies fs where fs.id = t.strategy_id and fs.name = ${add(f.strategy)})`);
  if (f.symbol) c.push(`t.symbol = ${add(f.symbol)}`);
  if (f.side) c.push(`t.side = ${add(f.side)}`);
  if (f.session) c.push(`t.session = ${add(f.session)}`);
  if (f.tags.length) { const p = add(f.tags); c.push(`(t.mistakes && ${p}::text[] or t.emotions && ${p}::text[])`); }
  return { sql: c.join(" and "), params };
}
