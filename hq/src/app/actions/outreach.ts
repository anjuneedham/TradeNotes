"use server";
import { guarded, opt, str, uuid } from "@/lib/flash";
import { q, tx } from "@/lib/db";
import { advanceStage, checkSend, parseProspectLines, PLATFORMS, STAGES, stageForTouch, type Stage, type Touch } from "@/lib/outreach";
import { findCustomerByEmail } from "@/lib/customers";
import { syncProspectStages } from "@/lib/outreach-data";

const platform = (v: string) => { if (!(PLATFORMS as readonly string[]).includes(v)) throw new Error("Pick a platform."); return v; };

export async function addProspect(fd: FormData) {
  return guarded("/outreach", async () => {
    const handle = str(fd, "handle").replace(/^@/, "").replace(/\s+/g, ""); if (!handle) throw new Error("Handle is required.");
    await q(`insert into hq.prospects (platform, handle, name, source_note) values ($1,$2,$3,$4)`, [platform(str(fd, "platform")), handle.slice(0, 60), opt(fd, "name"), opt(fd, "source_note")]);
    return `Added @${handle}.`;
  });
}
export async function bulkAdd(fd: FormData) {
  return guarded("/outreach", async () => {
    const pl = platform(str(fd, "platform")); const lines = parseProspectLines(str(fd, "lines")).slice(0, 200);
    if (!lines.length) throw new Error("Paste at least one line: handle | what they posted");
    let added = 0;
    for (const l of lines) added += (await q(`insert into hq.prospects (platform, handle, source_note) values ($1,$2,$3) on conflict (platform, lower(handle)) do nothing returning id`, [pl, l.handle, l.source])).length;
    return `Added ${added} new, skipped ${lines.length - added} already in the list.`;
  });
}
/** Log a touch. DM/follow-up are checked against the playbook rules first (same rules are also enforced by DB unique indexes). */
export async function logTouch(fd: FormData) {
  const id = uuid(str(fd, "id")); const path = `/outreach/${id}`;
  return guarded(path, async () => {
    const kind = str(fd, "kind"); const body = str(fd, "body");
    if (!["comment", "follow", "dm", "followup", "reply", "demo", "call", "note"].includes(kind)) throw new Error("Unknown touch type.");
    const [p] = await q<{ platform: string; stage: Stage; do_not_contact: boolean }>("select platform, stage, do_not_contact from hq.prospects where id = $1", [id]);
    if (!p) throw new Error("Prospect not found.");
    const touches = await q<Touch>("select kind, body, at from hq.touches where prospect_id = $1", [id]);
    let warn = "";
    if (kind === "dm" || kind === "followup") {
      const r = checkSend(p, touches, kind, body, new Date(), str(fd, "force") === "1");
      if (!r.ok) throw new Error(r.reason);
      warn = r.warnings.length ? ` Heads up: ${r.warnings.join(" ")}` : "";
    }
    const tag = /\?src=([a-z0-9-]{1,24})/.exec(body)?.[1] ?? null;
    await tx(async (t) => {
      await t(`insert into hq.touches (prospect_id, kind, body, link_tag) values ($1,$2,$3,$4)`, [id, kind, body || null, tag]);
      const to = stageForTouch(kind);
      const next = to ? advanceStage(p.stage, to) : p.stage;
      await t(`update hq.prospects set stage = $2, updated_at = now() where id = $1`, [id, next]);
    });
    return `Logged ${kind === "followup" ? "follow-up" : kind}.${warn}`;
  });
}
export async function setStage(fd: FormData) {
  const id = uuid(str(fd, "id"));
  return guarded(`/outreach/${id}`, async () => {
    const s = str(fd, "stage"); if (!(STAGES as readonly string[]).includes(s)) throw new Error("Unknown stage.");
    await q("update hq.prospects set stage = $2, objection = coalesce($3, objection), updated_at = now() where id = $1", [id, s, opt(fd, "objection")]);
    return `Stage set to ${s}.`;
  });
}
export async function saveProspect(fd: FormData) {
  const id = uuid(str(fd, "id"));
  return guarded(`/outreach/${id}`, async () => {
    await q("update hq.prospects set name=$2, source_note=$3, notes=$4, objection=$5, updated_at=now() where id=$1", [id, opt(fd, "name"), opt(fd, "source_note"), opt(fd, "notes"), opt(fd, "objection")]);
  });
}
export async function toggleDnc(fd: FormData) {
  const id = uuid(str(fd, "id"));
  return guarded(`/outreach/${id}`, async () => { await q("update hq.prospects set do_not_contact = not do_not_contact, updated_at=now() where id=$1", [id]); });
}
export async function linkCustomer(fd: FormData) {
  const id = uuid(str(fd, "id"));
  return guarded(`/outreach/${id}`, async () => {
    const email = str(fd, "email").toLowerCase();
    if (!email) { await q("update hq.prospects set customer_email = null where id = $1", [id]); return "Unlinked."; }
    const c = await findCustomerByEmail(email); if (!c) throw new Error("No TradeNotes account has that email (yet).");
    await q("update hq.prospects set customer_email = $2, updated_at = now() where id = $1", [id, c.email]);
    await syncProspectStages();
    return `Linked to ${c.email}; stage updated from their real activity.`;
  });
}
export async function deleteProspect(fd: FormData) {
  const id = uuid(str(fd, "id"));
  return guarded("/outreach", async () => { await q("delete from hq.prospects where id = $1", [id]); return "Deleted."; });
}
