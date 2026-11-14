"use server";
import { guarded, int, num, opt, str, uuid } from "@/lib/flash";
import { q } from "@/lib/db";
import { canMove, CHECKS, FORMAT_IDS, STATUSES, type Status } from "@/lib/content";
import { getContent } from "@/lib/content-data";

export async function createContent(fd: FormData) {
  return guarded("/content", async () => {
    const format = str(fd, "format"); const title = str(fd, "title");
    if (!FORMAT_IDS.includes(format as never)) throw new Error("Pick a format."); if (!title) throw new Error("Give it a title / hook.");
    await q("insert into hq.content_items (format, title, hook) values ($1,$2,$2)", [format, title]);
    return "Added to the idea bank.";
  });
}
export async function saveContent(fd: FormData) {
  const id = uuid(str(fd, "id"));
  return guarded(`/content/${id}`, async () => {
    const checks: Record<string, boolean> = {}; for (const c of CHECKS) checks[c.key] = str(fd, `chk_${c.key}`) === "on";
    await q(`update hq.content_items set title=$2, format=$3, hook=$4, talking_points=$5, voiceover=$6, screen_plan=$7, captions_note=$8, cta=$9, yt_title=$10, tt_caption=$11, claims=$12, editing_notes=$13, planned_for=$14, checks=$15::jsonb, updated_at=now() where id=$1`,
      [id, str(fd, "title") || "Untitled", str(fd, "format"), opt(fd, "hook"), opt(fd, "talking_points"), opt(fd, "voiceover"), opt(fd, "screen_plan"), opt(fd, "captions_note"), opt(fd, "cta"), opt(fd, "yt_title"), opt(fd, "tt_caption"), opt(fd, "claims"), opt(fd, "editing_notes"), opt(fd, "planned_for"), JSON.stringify(checks)]);
    // Saving edits an approved script: if the compliance gate no longer holds, drop it back to "scripted".
    const it = await getContent(id);
    if (it && it.status === "approved" && !canMove("scripted", "approved", it).ok) { await q("update hq.content_items set status='scripted' where id=$1", [id]); return "Saved — it no longer passes the approval checks, so it went back to Scripted."; }
  });
}
export async function moveContent(fd: FormData) {
  const id = uuid(str(fd, "id")); const back = str(fd, "back") || `/content/${id}`;
  return guarded(back, async () => {
    const to = str(fd, "to") as Status; if (!STATUSES.includes(to)) throw new Error("Unknown status.");
    const it = await getContent(id); if (!it) throw new Error("Not found.");
    const [{ n }] = await q<{ n: number }>("select count(*)::int n from hq.posts where content_id=$1 and views > 0", [id]);
    const r = canMove(it.status, to, it, n); if (!r.ok) throw new Error(r.reason);
    await q("update hq.content_items set status=$2, updated_at=now() where id=$1", [id, to]);
    return `Moved to ${to}.`;
  });
}
export async function deleteContent(fd: FormData) {
  const id = uuid(str(fd, "id"));
  return guarded("/content", async () => { await q("delete from hq.content_items where id=$1", [id]); return "Deleted."; });
}
const pct = (fd: FormData, k: string) => { const n = num(fd, k); if (n !== null && (n < 0 || n > 100)) throw new Error("Percentages must be 0–100."); return n; };
export async function addPost(fd: FormData) {
  const id = uuid(str(fd, "content_id"));
  return guarded(`/content/${id}`, async () => {
    const pl = str(fd, "platform"); if (!["tiktok", "youtube", "instagram"].includes(pl)) throw new Error("Pick a platform.");
    await q(`insert into hq.posts (content_id, platform, url, views, view_rate_3s, avg_watch_pct, saves, link_clicks, signups, notes) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [id, pl, opt(fd, "url"), int(fd, "views"), pct(fd, "view_rate_3s"), pct(fd, "avg_watch_pct"), int(fd, "saves"), int(fd, "link_clicks"), int(fd, "signups"), opt(fd, "notes")]);
    await q(`update hq.content_items set status = 'posted', updated_at = now() where id = $1 and status in ('idea','scripted','approved','recorded','edited')`, [id]);
    return "Post logged.";
  });
}
export async function updatePost(fd: FormData) {
  const pid = uuid(str(fd, "post_id")); const back = str(fd, "back") || "/content/performance";
  return guarded(back, async () => {
    await q(`update hq.posts set url=$2, views=$3, view_rate_3s=$4, avg_watch_pct=$5, saves=$6, link_clicks=$7, signups=$8 where id=$1`, [pid, opt(fd, "url"), int(fd, "views"), pct(fd, "view_rate_3s"), pct(fd, "avg_watch_pct"), int(fd, "saves"), int(fd, "link_clicks"), int(fd, "signups")]);
  });
}
export async function deletePost(fd: FormData) {
  const pid = uuid(str(fd, "post_id")); const back = str(fd, "back") || "/content/performance";
  return guarded(back, async () => { await q("delete from hq.posts where id=$1", [pid]); return "Post removed."; });
}
