import type { Q } from "./db";
/** Month-to-date AI spend for the signed-in user (row-level security scopes the sum), in micro-dollars. Calendar month, UTC. */
export async function monthSpendMicros(q: Q): Promise<number> {
  const [r] = await q<{ m: string }>("select coalesce(sum(cost_micros), 0)::text m from tradenotes.ai_messages where created_at >= date_trunc('month', now() at time zone 'utc') at time zone 'utc'");
  return Number(r.m);
}
/** First day of next month (UTC), when the allowance refills. */
export const nextReset = (now = new Date()) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
