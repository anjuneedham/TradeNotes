"use server";
import { guarded, str, uuid } from "@/lib/flash";
import { q } from "@/lib/db";
import { getCustomer, paying, foundingSeatsUsed } from "@/lib/customers";
import { canEmail, dueStep, footerFor, nameFor, renderMail, type StepKey } from "@/lib/nurture";
import { getNurtureTemplates, getSettings } from "@/lib/settings";
import { emailConfigured, sendMail } from "@/lib/mail";
import { FOUNDING } from "@/lib/plans";

/** Re-derives everything server-side (never trusts the form): eligibility, which step is due, sender identity, config. */
async function context(userId: string) {
  const c = await getCustomer(userId); if (!c) throw new Error("Customer not found.");
  const sent = (await q<{ step: string }>("select step from hq.messages where user_id=$1 and status in ('sent','skipped')", [userId])).map((r) => r.step);
  const due = dueStep({ createdAt: c.created_at, plan: c.plan, paying: paying(c), verified: c.verified, emailOk: c.email_ok, optOut: c.email_opt_out, sent });
  return { c, due };
}
export async function sendNurture(fd: FormData) {
  const id = uuid(str(fd, "id"));
  return guarded("/nurture", async () => {
    const set = await getSettings();
    if (!emailConfigured()) throw new Error("Email is not configured on the HQ deployment (RESEND_API_KEY, EMAIL_FROM).");
    if (!set.business_name.trim() || !set.support_email.trim()) throw new Error("Set your business name and support email in Settings first — they go in the email footer.");
    const { c, due } = await context(id);
    if (!canEmail({ verified: c.verified, emailOk: c.email_ok, optOut: c.email_opt_out })) throw new Error("This address isn't verified and you haven't confirmed it on the customer page.");
    if (!due) throw new Error("Nothing is due for this person.");
    if (str(fd, "step") !== due.step.key) throw new Error("The due step changed — reload and try again.");
    const tpl = (await getNurtureTemplates())[due.step.key as StepKey];
    const founding = Math.max(0, FOUNDING.seats - (await foundingSeatsUsed()));
    const mail = renderMail(tpl, { name: nameFor(c.name, c.email), sender: set.sender_name || "Andrew", trades: c.trades, foundingLeft: founding }, footerFor(set));
    // Claim first (unique index = never twice), then send; roll the claim back to "failed" if the provider rejects.
    const [row] = await q<{ id: number }>(`insert into hq.messages (user_id, step, subject, status) values ($1,$2,$3,'sent') returning id`, [id, due.step.key, mail.subject]);
    try { await sendMail(c.email, mail.subject, mail.body, set.support_email); }
    catch (e) { await q("update hq.messages set status='failed', error=$2 where id=$1", [row.id, (e as Error).message.slice(0, 200)]); throw new Error(`Send failed: ${(e as Error).message}`); }
    for (const k of due.skipOlder) await q(`insert into hq.messages (user_id, step, subject, status) values ($1,$2,'(skipped — older than the current step)','skipped') on conflict do nothing`, [id, k]);
    return `Sent “${mail.subject}” to ${c.email}.`;
  });
}
export async function skipNurture(fd: FormData) {
  const id = uuid(str(fd, "id"));
  return guarded("/nurture", async () => {
    const { due } = await context(id); if (!due) throw new Error("Nothing is due.");
    for (const k of [...due.skipOlder, due.step.key]) await q(`insert into hq.messages (user_id, step, subject, status) values ($1,$2,'(skipped by owner)','skipped') on conflict do nothing`, [id, k]);
    return "Skipped.";
  });
}
