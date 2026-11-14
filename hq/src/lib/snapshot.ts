import "server-only";
import { q } from "./db";
import { listCustomers, summarize, type Customer } from "./customers";
import { FOUNDING } from "./plans";
import type { Snapshot } from "./report";

const localDay = (iso: string, tz: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: tz });
export const todayIn = (tz: string) => new Date().toLocaleDateString("en-CA", { timeZone: tz });

export async function snapshotFor(day: string, tz: string, customers?: Customer[]): Promise<Snapshot> {
  const cs = customers ?? (await listCustomers(false)); const sum = summarize(cs);
  const signups = cs.filter((c) => localDay(c.created_at, tz) === day);
  const bySrc = new Map<string, { signups: number; activated: number }>();
  for (const c of signups) { const k = c.signup_source ?? "(none)"; const r = bySrc.get(k) ?? { signups: 0, activated: 0 }; r.signups++; if (c.trades > 0) r.activated++; bySrc.set(k, r); }
  const touch = await q<{ platform: string; kind: string; n: number }>(`select p.platform, t.kind, count(*)::int n from hq.touches t join hq.prospects p on p.id = t.prospect_id where (t.at at time zone $1)::date = $2::date group by 1,2`, [tz, day]);
  const tc = (pl: string | null, kinds: string[]) => touch.filter((r) => (pl === null || r.platform === pl) && kinds.includes(r.kind)).reduce((a, r) => a + r.n, 0);
  const posts = await q<{ platform: string; n: number; views: number }>(`select platform, count(*)::int n, coalesce(sum(views),0)::int views from hq.posts where (posted_at at time zone $1)::date = $2::date group by 1`, [tz, day]);
  const pc = (p: string) => posts.find((r) => r.platform === p)?.n ?? 0;
  const [ad] = await q<{ spend: number; clicks: number }>(`select coalesce(sum(spend),0)::float8 spend, coalesce(sum(clicks),0)::int clicks from hq.ad_spend where day = $1`, [day]);
  const [fb] = await q<{ n: number }>(`select count(*)::int n from hq.feedback where status = 'open' and kind in ('bug','feedback','question','feature')`);
  return {
    day, signups: signups.length, signupsBySource: [...bySrc].map(([source, v]) => ({ source, ...v })).sort((a, b) => b.signups - a.signups), activations: sum.activated, paying: sum.paying, mrr: sum.mrr,
    foundingUsed: sum.foundingUsed, foundingSeats: FOUNDING.seats, dms: { tiktok: tc("tiktok", ["dm"]), instagram: tc("instagram", ["dm"]) }, followups: tc(null, ["followup"]), replies: tc(null, ["reply"]), demos: tc(null, ["demo"]),
    posts: { tiktok: pc("tiktok"), youtube: pc("youtube"), instagram: pc("instagram") }, views: posts.reduce((a, r) => a + r.views, 0), adSpend: Number(ad.spend), adClicks: ad.clicks, openFeedback: fb.n,
  };
}
