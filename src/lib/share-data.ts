import { pool, withUser } from "./db";
import { NO_FILTERS } from "./filters";
import { loadResults } from "./trades-data";
import { buildReport, scopeRange, type ShareReport } from "./share";
import { hashToken, isTokenShape } from "./share-token";

/**
 * The link itself is checked on EVERY request (so a revoked or expired link stops working at once), but the heavy part, aggregating the owner's
 * history, is cached for a minute per owner and scope on each server instance, so a flood of requests for one valid link costs one aggregation a minute,
 * not one per request. At most 100 entries (the oldest goes first). The cached value is the aggregate report only.
 */
const CACHE_MS = 60_000, CACHE_MAX = 100;
const cache = new Map<string, { at: number; report: ShareReport }>();
const cached = (key: string, now: number) => { const c = cache.get(key); return c && now - c.at < CACHE_MS ? c.report : null; };
const remember = (key: string, report: ShareReport, now: number) => {
  if (cache.size >= CACHE_MAX) { const oldest = cache.keys().next().value; if (oldest !== undefined) cache.delete(oldest); }
  cache.delete(key); cache.set(key, { at: now, report });
};
/** For tests. */
export const clearShareCache = () => cache.clear();

/**
 * Resolve a public token to its report, or null (unknown, malformed, revoked or expired: callers answer 404 for all of them, so a
 * probe cannot tell which). Only the hash is looked up, through the SECURITY DEFINER function resolve_share_link, which itself refuses
 * revoked and expired links. The owner's data is then read under that owner's row-level security, and ONLY the aggregate report is returned.
 */
export async function loadSharedReport(token: unknown): Promise<ShareReport | null> {
  if (!isTokenShape(token)) return null;
  const { rows } = await pool.query<{ user_id: string; scope: string; show_amounts: boolean }>("select user_id, scope, show_amounts from tradenotes.resolve_share_link($1)", [hashToken(token)]);
  const link = rows[0];
  if (!link) return null;
  const key = `${link.user_id}:${link.scope}:${link.show_amounts}`, now = Date.now();
  const hit = cached(key, now);
  if (hit) return hit;
  const report = await withUser(link.user_id, async (q) => {
    const [p] = await q<{ timezone: string }>("select timezone from tradenotes.profiles where id = $1", [link.user_id]);
    const [a] = await q<{ currency: string }>("select currency from tradenotes.accounts order by created_at limit 1");
    const currency = a?.currency ?? "USD";
    // All of the owner's accounts that share the first account's currency (the same rule the app's "All accounts" view uses); nothing about the accounts is returned.
    const loaded = await loadResults(<T,>(fn: (qq: typeof q) => Promise<T>) => fn(q), null, currency, { ...NO_FILTERS, range: scopeRange(link.scope) }, p?.timezone ?? "UTC");
    return buildReport(loaded.rows, link.scope, currency, { showAmounts: link.show_amounts === true });
  });
  remember(key, report, now);
  return report;
}
