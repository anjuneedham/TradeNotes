"use server";
import { guarded, opt, str, uuid } from "@/lib/flash";
import { q } from "@/lib/db";
import { saveSettings, type Settings } from "@/lib/settings";
import { DEFAULT_TEMPLATES } from "@/lib/templates";
import { DEFAULT_NURTURE } from "@/lib/nurture";
import { snapshotFor } from "@/lib/snapshot";
import { redirect } from "next/navigation";

export async function addFeedback(fd: FormData) {
  return guarded("/feedback", async () => {
    const kind = str(fd, "kind"); if (!["feedback", "bug", "question", "objection", "testimonial", "feature"].includes(kind)) throw new Error("Pick a type.");
    const body = str(fd, "body"); if (!body) throw new Error("Write what was said.");
    await q("insert into hq.feedback (kind, source, who, body, tag) values ($1,$2,$3,$4,$5)", [kind, opt(fd, "source"), opt(fd, "who"), body, opt(fd, "tag")]);
    return "Logged.";
  });
}
export async function setFeedbackStatus(fd: FormData) {
  const id = uuid(str(fd, "id")); const s = str(fd, "status");
  return guarded("/feedback", async () => { if (!["open", "done", "wontfix"].includes(s)) throw new Error("Bad status."); await q("update hq.feedback set status=$2 where id=$1", [id, s]); });
}
export async function deleteFeedback(fd: FormData) {
  const id = uuid(str(fd, "id"));
  return guarded("/feedback", async () => { await q("delete from hq.feedback where id=$1", [id]); return "Deleted."; });
}
export async function toggleTask(fd: FormData) {
  const id = uuid(str(fd, "id"));
  return guarded("/launch", async () => { await q("update hq.tasks set done = not done, done_at = case when done then null else now() end where id=$1", [id]); });
}
export async function addTask(fd: FormData) {
  return guarded("/launch", async () => {
    const title = str(fd, "title"); if (!title) throw new Error("Describe the task.");
    await q("insert into hq.tasks (area, title, detail, owner, sort) values ('launch', $1, $2, $3, 500)", [title, opt(fd, "detail"), str(fd, "owner") === "claude" ? "claude" : "you"]);
    return "Added.";
  });
}
export async function deleteTask(fd: FormData) {
  const id = uuid(str(fd, "id"));
  return guarded("/launch", async () => { await q("delete from hq.tasks where id=$1", [id]); return "Removed."; });
}
export async function saveReport(fd: FormData) {
  const day = str(fd, "day"); if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error("Bad date.");
  return guarded(`/reports?day=${day}`, async () => {
    const tz = str(fd, "tz") || "America/Jamaica";
    const snap = await snapshotFor(day, tz);
    await q(`insert into hq.daily_reports (day, blockers, bugs, notes, snapshot, saved_at) values ($1,$2,$3,$4,$5::jsonb,now()) on conflict (day) do update set blockers=excluded.blockers, bugs=excluded.bugs, notes=excluded.notes, snapshot=excluded.snapshot, saved_at=now()`,
      [day, opt(fd, "blockers"), opt(fd, "bugs"), opt(fd, "notes"), JSON.stringify(snap)]);
    return "Report saved.";
  });
}
export async function saveSettingsAction(fd: FormData) {
  return guarded("/settings", async () => {
    const n = (k: string, min: number, max: number) => { const v = parseInt(str(fd, k), 10); if (!Number.isFinite(v) || v < min || v > max) throw new Error(`${k.replace(/_/g, " ")} must be ${min}–${max}.`); return v; };
    const site = str(fd, "site_url").replace(/\/+$/, ""); if (!/^https:\/\/[^\s/]+$/.test(site) && !/^http:\/\/localhost(:\d+)?$/.test(site)) throw new Error("Site URL must look like https://tradenotes.dev");
    const tz = str(fd, "tz"); try { new Intl.DateTimeFormat("en", { timeZone: tz }); } catch { throw new Error("Unknown time zone (use e.g. America/Jamaica)."); }
    const goal_date = str(fd, "goal_date"); if (!/^\d{4}-\d{2}-\d{2}$/.test(goal_date)) throw new Error("Goal date must be YYYY-MM-DD.");
    const p: Partial<Settings> = {
      site_url: site, tz, goal_date, goal_paying: n("goal_paying", 1, 10000), dm_target_tiktok: n("dm_target_tiktok", 0, 200), dm_target_instagram: n("dm_target_instagram", 0, 200),
      post_target_tiktok: n("post_target_tiktok", 0, 20), post_target_youtube: n("post_target_youtube", 0, 20), business_name: str(fd, "business_name"), support_email: str(fd, "support_email"),
      sender_name: str(fd, "sender_name") || "Andrew", calendly_url: str(fd, "calendly_url"), show_test_accounts: str(fd, "show_test_accounts") === "on",
    };
    if (p.support_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.support_email)) throw new Error("Support email looks wrong.");
    await saveSettings(p);
  });
}
export async function saveTemplate(fd: FormData) {
  const key = str(fd, "key"); const body = str(fd, "body");
  return guarded("/settings", async () => {
    const isNurture = key.startsWith("nurture_"); const def = isNurture ? DEFAULT_NURTURE[key.slice(8) as keyof typeof DEFAULT_NURTURE] : DEFAULT_TEMPLATES.find((t) => t.key === key);
    if (!def) throw new Error("Unknown template.");
    if (str(fd, "reset") === "1") { await q("delete from hq.templates where key=$1", [key]); return "Reset to default."; }
    if (!body) throw new Error("Template can't be empty.");
    const title = isNurture ? (str(fd, "subject") || (def as { subject: string }).subject) : (def as { title: string }).title;
    await q(`insert into hq.templates (key, title, body, updated_at) values ($1,$2,$3,now()) on conflict (key) do update set title=excluded.title, body=excluded.body, updated_at=now()`, [key, title, body]);
    return "Template saved.";
  });
}
export async function goToDay(fd: FormData) { redirect(`/reports?day=${encodeURIComponent(str(fd, "day"))}`); }
