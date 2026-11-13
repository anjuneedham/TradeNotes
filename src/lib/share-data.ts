import { pool, withUser } from "./db";
import { NO_FILTERS } from "./filters";
import { loadResults } from "./trades-data";
import { buildReport, scopeRange, type ShareReport } from "./share";
import { hashToken, isTokenShape } from "./share-token";

/**
 * Resolve a public token to its report, or null (unknown, malformed, revoked or expired: callers answer 404 for all of them, so a
 * probe cannot tell which). Only the hash is looked up, through the SECURITY DEFINER function resolve_share_link, which itself refuses
 * revoked and expired links. The owner's data is then read under that owner's row-level security, and ONLY the aggregate report is returned.
 */
export async function loadSharedReport(token: unknown): Promise<ShareReport | null> {
  if (!isTokenShape(token)) return null;
  const { rows } = await pool.query<{ user_id: string; scope: string }>("select user_id, scope from tradenotes.resolve_share_link($1)", [hashToken(token)]);
  const link = rows[0];
  if (!link) return null;
  return withUser(link.user_id, async (q) => {
    const [p] = await q<{ timezone: string }>("select timezone from tradenotes.profiles where id = $1", [link.user_id]);
    const [a] = await q<{ currency: string }>("select currency from tradenotes.accounts order by created_at limit 1");
    const currency = a?.currency ?? "USD";
    // All of the owner's accounts that share the first account's currency (the same rule the app's "All accounts" view uses); nothing about the accounts is returned.
    const loaded = await loadResults(<T,>(fn: (qq: typeof q) => Promise<T>) => fn(q), null, currency, { ...NO_FILTERS, range: scopeRange(link.scope) }, p?.timezone ?? "UTC");
    return buildReport(loaded.rows, link.scope, currency);
  });
}
