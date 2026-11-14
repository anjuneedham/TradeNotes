import "server-only";
import { q } from "./db";
import { DEFAULT_TEMPLATES } from "./templates";
import { SEED_TASKS } from "./report";
import { SEED_IDEAS, FORMATS } from "./content";

export type Settings = {
  site_url: string; tz: string; dm_target_tiktok: number; dm_target_instagram: number; post_target_tiktok: number; post_target_youtube: number;
  goal_paying: number; goal_date: string; business_name: string; support_email: string; sender_name: string; calendly_url: string; show_test_accounts: boolean;
};
export const DEFAULT_SETTINGS: Settings = {
  site_url: (process.env.NEXT_PUBLIC_SITE_URL || "https://tradenotes.dev").replace(/\/+$/, ""), tz: "America/Jamaica", dm_target_tiktok: 25, dm_target_instagram: 25, post_target_tiktok: 3, post_target_youtube: 2,
  goal_paying: 10, goal_date: "2026-11-15", business_name: "", support_email: process.env.EMAIL_REPLY_TO ?? "", sender_name: "Andrew", calendly_url: "", show_test_accounts: false,
};
export async function getSettings(): Promise<Settings> {
  await ensureSeeds();
  const rows = await q<{ key: string; value: unknown }>("select key, value from hq.settings");
  const out: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const r of rows) if (r.key in DEFAULT_SETTINGS && typeof r.value === typeof (DEFAULT_SETTINGS as Record<string, unknown>)[r.key]) out[r.key] = r.value;
  return out as Settings;
}
export async function saveSettings(p: Partial<Settings>) {
  for (const [k, v] of Object.entries(p)) {
    if (!(k in DEFAULT_SETTINGS) || v === undefined) continue;
    await q(`insert into hq.settings (key, value, updated_at) values ($1, $2::jsonb, now()) on conflict (key) do update set value = excluded.value, updated_at = now()`, [k, JSON.stringify(v)]);
  }
}
export async function getTemplates() {
  const rows = await q<{ key: string; title: string; body: string }>("select key, title, body from hq.templates");
  const over = new Map(rows.map((r) => [r.key, r]));
  return DEFAULT_TEMPLATES.map((t) => ({ ...t, body: over.get(t.key)?.body ?? t.body, custom: over.has(t.key) }));
}
export async function getNurtureTemplates() {
  const { DEFAULT_NURTURE } = await import("./nurture");
  const rows = await q<{ key: string; title: string; body: string }>("select key, title, body from hq.templates where key like 'nurture_%'");
  const over = new Map(rows.map((r) => [r.key.replace("nurture_", ""), r]));
  return Object.fromEntries(Object.entries(DEFAULT_NURTURE).map(([k, m]) => [k, over.has(k) ? { subject: over.get(k)!.title, body: over.get(k)!.body } : m])) as typeof DEFAULT_NURTURE;
}

let seeded = false;
/** One-time seeding of launch gates + the 33-idea bank (guarded by a settings flag so deleted items stay deleted). */
export async function ensureSeeds() {
  if (seeded) return;
  const [f] = await q("select 1 from hq.settings where key = 'seeded_v1'");
  if (!f) {
    for (const t of SEED_TASKS) await q(`insert into hq.tasks (area, title, detail, owner, sort, seed_key) values ($1,$2,$3,$4,$5,$6) on conflict (seed_key) do nothing`, [t.area, t.title, t.detail, t.owner, t.sort, t.key]);
    for (const i of SEED_IDEAS) await q(`insert into hq.content_items (idea_no, format, pillar, title, hook, claims) values ($1,$2,$3,$4,$5,$6) on conflict (idea_no) where idea_no is not null do nothing`, [i.n, i.f, FORMATS[i.f].pillar, i.hook, i.hook, i.note ?? null]);
    await q(`insert into hq.settings (key, value) values ('seeded_v1', 'true'::jsonb) on conflict do nothing`);
  }
  seeded = true;
}
