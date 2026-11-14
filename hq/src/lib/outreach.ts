/** Outreach rules from docs/SALES_PLAYBOOK.md, as pure functions. Manual outreach only — nothing here sends anything. */
export const PLATFORMS = ["tiktok", "instagram", "youtube", "other"] as const;
export type Platform = (typeof PLATFORMS)[number];
export const PLATFORM_LABEL: Record<string, string> = { tiktok: "TikTok", instagram: "Instagram", youtube: "YouTube", other: "Other" };
/** ?src= tags from PAID_TEST.md / SALES_PLAYBOOK.md. The customer app stores the first tag a visitor arrives with. */
export const DM_TAG: Record<string, string> = { tiktok: "tt-dm", instagram: "ig-dm" };
export const SRC_RE = /^[a-z0-9-]{1,24}$/;

export const STAGES = ["found", "engaged", "dm_sent", "replied", "interested", "signed_up", "activated", "paying", "lost", "not_now"] as const;
export type Stage = (typeof STAGES)[number];
export const STAGE_LABEL: Record<Stage, string> = { found: "Found", engaged: "Commented / followed", dm_sent: "DM sent", replied: "Replied", interested: "Interested", signed_up: "Signed up", activated: "Logged a trade", paying: "Paying", lost: "Lost", not_now: "Not now" };
export const STAGE_RANK: Record<Stage, number> = { found: 0, engaged: 1, dm_sent: 2, replied: 3, interested: 4, signed_up: 5, activated: 6, paying: 7, lost: -1, not_now: -1 };
export const FOLLOWUP_DAYS = 3;

export type Touch = { kind: string; body: string | null; at: string };
export type ProspectLite = { platform: string; stage: Stage; do_not_contact: boolean };

export const buildLink = (site: string, tag: string): string | null => (SRC_RE.test(tag) ? `${site.replace(/\/+$/, "")}/?src=${tag}` : null);
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

/** Fill {name}, {specific thing}, {SITE}, {link}. Returns the text and any placeholders still unfilled. */
export function mergeTemplate(body: string, v: { name?: string | null; specific?: string | null; site: string; link?: string | null }) {
  const map: Record<string, string | null | undefined> = { name: v.name, "specific thing": v.specific, specific: v.specific, SITE: v.site.replace(/\/+$/, ""), link: v.link };
  const missing = new Set<string>();
  const text = body.replace(/\{([^}]+)\}/g, (m, k: string) => { const val = map[k.trim()]; if (val && val.trim()) return val.trim(); missing.add(m); return m; });
  return { text, missing: [...missing] };
}

export function followUpDueAt(touches: Touch[]): Date | null {
  const dms = touches.filter((t) => t.kind === "dm").sort((a, b) => a.at.localeCompare(b.at));
  if (!dms.length) return null;
  if (touches.some((t) => t.kind === "followup" || t.kind === "reply")) return null;
  return new Date(new Date(dms[0].at).getTime() + FOLLOWUP_DAYS * 86_400_000);
}
export const followUpIsDue = (touches: Touch[], now = new Date()) => { const d = followUpDueAt(touches); return d !== null && d <= now; };

export type SendCheck = { ok: true; warnings: string[] } | { ok: false; reason: string };
/** Can this DM / follow-up be logged for this person? Enforces: no spam to opted-out people, first DM once, ONE follow-up, never the same text twice. */
export function checkSend(p: ProspectLite, touches: Touch[], kind: "dm" | "followup", body: string, now = new Date(), force = false): SendCheck {
  const text = body.trim();
  if (!text) return { ok: false, reason: "Message is empty." };
  if (p.do_not_contact) return { ok: false, reason: "Marked do-not-contact." };
  if (p.stage === "lost") return { ok: false, reason: "Marked lost. Reopen them first if that was a mistake." };
  if (touches.some((t) => (t.kind === "dm" || t.kind === "followup") && t.body && norm(t.body) === norm(text))) return { ok: false, reason: "You already sent this exact message to this person. Never send the same message twice." };
  const warnings: string[] = [];
  if (kind === "dm") {
    if (touches.some((t) => t.kind === "dm")) return { ok: false, reason: "First DM already logged. Use the day-3 follow-up (once) or log their reply." };
    if (p.platform === "instagram" && /https?:\/\/|\.\w{2,}\/\?src=/.test(text)) warnings.push("Instagram: for new accounts, skip the link in the very first message — ask first, send the link after they reply.");
    if (!/\b(you|your|you're|saw|noticed)\b/i.test(text)) warnings.push("Doesn't look personalised. The playbook says reference something they actually said.");
  } else {
    if (!touches.some((t) => t.kind === "dm")) return { ok: false, reason: "No first DM logged yet." };
    if (touches.some((t) => t.kind === "followup")) return { ok: false, reason: "Follow-up already sent. The playbook says follow up once, then stop." };
    if (touches.some((t) => t.kind === "reply")) return { ok: false, reason: "They already replied — continue the conversation instead of a follow-up." };
    if (!followUpIsDue(touches, now) && !force) return { ok: false, reason: `Too early: the follow-up is due ${FOLLOWUP_DAYS} days after the first DM.` };
  }
  return { ok: true, warnings };
}

/** Stage only moves forward automatically; lost / not_now are set explicitly. */
export function advanceStage(current: Stage, to: Stage): Stage {
  if (current === "lost" || current === "not_now") return current;
  return STAGE_RANK[to] > STAGE_RANK[current] ? to : current;
}
export const stageForTouch = (kind: string): Stage | null => ({ comment: "engaged", follow: "engaged", dm: "dm_sent", followup: "dm_sent", reply: "replied" } as Record<string, Stage>)[kind] ?? null;

export type FunnelRow = { stage: Stage; hasDm: boolean; hasReply: boolean };
export function funnel(rows: FunnelRow[]) {
  const r = (s: Stage) => STAGE_RANK[s];
  const steps = [
    { key: "found", label: "Found", n: rows.length },
    { key: "dm", label: "DM sent", n: rows.filter((x) => x.hasDm || r(x.stage) >= 2).length },
    { key: "reply", label: "Replied", n: rows.filter((x) => x.hasReply || r(x.stage) >= 3).length },
    { key: "interested", label: "Interested", n: rows.filter((x) => r(x.stage) >= 4).length },
    { key: "signed_up", label: "Signed up", n: rows.filter((x) => r(x.stage) >= 5).length },
    { key: "activated", label: "Logged a trade", n: rows.filter((x) => r(x.stage) >= 6).length },
    { key: "paying", label: "Paying", n: rows.filter((x) => r(x.stage) >= 7).length },
  ];
  return steps.map((s, i) => ({ ...s, rate: i === 0 || steps[i - 1].n === 0 ? null : s.n / steps[i - 1].n }));
}
/** Parse a pasted list: one prospect per line, "handle | what they posted" (also accepts tab or " - "). */
export function parseProspectLines(text: string): { handle: string; source: string | null }[] {
  const out: { handle: string; source: string | null }[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim(); if (!line) continue;
    const [h, ...rest] = line.split(/\s*(?:\||\t| - )\s*/);
    const handle = h.replace(/^@/, "").replace(/\s+/g, "").slice(0, 60);
    if (handle) out.push({ handle, source: rest.join(" — ").trim() || null });
  }
  return out;
}
