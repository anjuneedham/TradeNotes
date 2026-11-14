import "server-only";
import { q } from "./db";
import type { Checks, Status } from "./content";

export type ContentItem = {
  id: string; code: number; idea_no: number | null; format: string; pillar: string | null; title: string; hook: string | null; talking_points: string | null; voiceover: string | null;
  screen_plan: string | null; captions_note: string | null; cta: string | null; yt_title: string | null; tt_caption: string | null; claims: string | null; checks: Checks;
  editing_notes: string | null; status: Status; planned_for: string | null; created_at: string;
};
export type Post = { id: string; content_id: string | null; platform: string; url: string | null; posted_at: string; views: number; view_rate_3s: number | null; avg_watch_pct: number | null; saves: number; link_clicks: number; signups: number; notes: string | null };

export const listContent = (status?: string) => q<ContentItem>(`select * from hq.content_items ${status ? "where status = $1" : ""} order by coalesce(planned_for, '2999-01-01'), code`, status ? [status] : []);
export const getContent = async (id: string) => (await q<ContentItem>("select * from hq.content_items where id = $1", [id]))[0] ?? null;
export const postsFor = (id: string) => q<Post>("select * from hq.posts where content_id = $1 order by posted_at desc", [id]);
export const postsWithFormat = () => q<Post & { format: string | null; code: number | null; title: string | null }>(`select p.*, c.format, c.code, c.title from hq.posts p left join hq.content_items c on c.id = p.content_id order by p.posted_at desc limit 300`);
export async function postsToday(tz: string) {
  const rows = await q<{ platform: string; n: number; views: number }>(`select platform, count(*)::int n, coalesce(sum(views),0)::int views from hq.posts where (posted_at at time zone $1)::date = (now() at time zone $1)::date group by 1`, [tz]);
  const g = (p: string) => rows.find((r) => r.platform === p)?.n ?? 0;
  return { tiktok: g("tiktok"), youtube: g("youtube"), instagram: g("instagram"), views: rows.reduce((a, r) => a + r.views, 0) };
}
