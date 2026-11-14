import "server-only";
import { q } from "./db";
import { advanceStage, type Stage, type Touch, STAGE_RANK } from "./outreach";
import { effectivePlan } from "./plans";

export type Prospect = {
  id: string; platform: string; handle: string; name: string | null; source_note: string | null; stage: Stage; objection: string | null; do_not_contact: boolean;
  customer_email: string | null; notes: string | null; created_at: string; updated_at: string;
};
export type ProspectRow = Prospect & { first_dm: string | null; has_followup: boolean; has_reply: boolean; last_touch: string | null; dm_count: number };

export async function listProspects(f: { stage?: string; platform?: string; s?: string; limit?: number } = {}): Promise<ProspectRow[]> {
  const where: string[] = []; const p: unknown[] = [];
  if (f.stage) { p.push(f.stage); where.push(`p.stage = $${p.length}`); }
  if (f.platform) { p.push(f.platform); where.push(`p.platform = $${p.length}`); }
  if (f.s) { p.push(`%${f.s.toLowerCase()}%`); where.push(`(lower(p.handle) like $${p.length} or lower(coalesce(p.name,'')) like $${p.length} or lower(coalesce(p.source_note,'')) like $${p.length})`); }
  return q<ProspectRow>(`select p.*,
      (select min(at) from hq.touches t where t.prospect_id = p.id and t.kind = 'dm') as first_dm,
      exists (select 1 from hq.touches t where t.prospect_id = p.id and t.kind = 'followup') as has_followup,
      exists (select 1 from hq.touches t where t.prospect_id = p.id and t.kind = 'reply') as has_reply,
      (select max(at) from hq.touches t where t.prospect_id = p.id) as last_touch,
      (select count(*)::int from hq.touches t where t.prospect_id = p.id and t.kind in ('dm','followup')) as dm_count
    from hq.prospects p ${where.length ? "where " + where.join(" and ") : ""} order by p.updated_at desc limit ${f.limit ?? 500}`, p);
}
export async function getProspect(id: string): Promise<{ p: Prospect; touches: (Touch & { id: string; kind: string; link_tag: string | null })[] } | null> {
  const [p] = await q<Prospect>("select * from hq.prospects where id = $1", [id]);
  if (!p) return null;
  const touches = await q<Touch & { id: string; link_tag: string | null }>("select id, kind, body, link_tag, at from hq.touches where prospect_id = $1 order by at asc, id", [id]);
  return { p, touches };
}
/** Counts for "today" in the configured timezone. */
export async function todayCounts(tz: string) {
  const rows = await q<{ platform: string; kind: string; n: number }>(`select p.platform, t.kind, count(*)::int n from hq.touches t join hq.prospects p on p.id = t.prospect_id
    where (t.at at time zone $1)::date = (now() at time zone $1)::date group by 1, 2`, [tz]);
  const get = (pl: string, k: string[]) => rows.filter((r) => r.platform === pl && k.includes(r.kind)).reduce((a, r) => a + r.n, 0);
  const all = (k: string) => rows.filter((r) => r.kind === k).reduce((a, r) => a + r.n, 0);
  return { dmTiktok: get("tiktok", ["dm", "followup"]), dmInstagram: get("instagram", ["dm", "followup"]), newDmTiktok: get("tiktok", ["dm"]), newDmInstagram: get("instagram", ["dm"]), followups: all("followup"), replies: all("reply"), demos: all("demo") };
}
export async function dueFollowUps(): Promise<ProspectRow[]> {
  const rows = await listProspects({ limit: 2000 });
  const now = Date.now();
  return rows.filter((r) => r.first_dm && !r.has_followup && !r.has_reply && !r.do_not_contact && r.stage !== "lost" && r.stage !== "not_now" && new Date(r.first_dm).getTime() + 3 * 86_400_000 <= now)
    .sort((a, b) => a.first_dm!.localeCompare(b.first_dm!));
}
/** Pull stages forward from real customer data for prospects linked by email (never backwards, never reopens lost). */
export async function syncProspectStages(): Promise<number> {
  const rows = await q<{ id: string; stage: Stage; trades: number; plan: string; status: string; current_period_end: string | null }>(`
    select p.id, p.stage, (select count(*)::int from tradenotes.trades t where t.user_id = u.id) as trades,
           coalesce(s.plan,'free') as plan, coalesce(s.status,'active') as status, s.current_period_end
    from hq.prospects p join public.tn_user u on lower(u.email) = lower(p.customer_email) left join tradenotes.subscriptions s on s.user_id = u.id
    where p.customer_email is not null`);
  let changed = 0;
  for (const r of rows) {
    const paying = effectivePlan({ plan: r.plan, status: r.status, current_period_end: r.current_period_end }) !== "free";
    const target: Stage = paying ? "paying" : r.trades > 0 ? "activated" : "signed_up";
    const next = advanceStage(r.stage, target);
    if (next !== r.stage && STAGE_RANK[next] > STAGE_RANK[r.stage]) { await q("update hq.prospects set stage = $2, updated_at = now() where id = $1", [r.id, next]); changed++; }
  }
  return changed;
}
export async function funnelRows() {
  return q<{ stage: Stage; hasDm: boolean; hasReply: boolean }>(`select p.stage, exists (select 1 from hq.touches t where t.prospect_id = p.id and t.kind in ('dm','followup')) as "hasDm", exists (select 1 from hq.touches t where t.prospect_id = p.id and t.kind = 'reply') as "hasReply" from hq.prospects p`);
}
