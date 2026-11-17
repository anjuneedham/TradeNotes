import { z } from "zod";
import { pool } from "./db";
import { emailEnabled, sendEmail } from "./email";
import { buildDailyEmail, dayKey, noteForDay, siteUrl } from "./newsletter";
import { cleanSrc } from "./db-config";
import { JAMES } from "./james";

export const emailSchema = z.string().trim().toLowerCase().email().max(254);
const TOKEN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const unsubscribeUrl = (token: string) => `${siteUrl()}/newsletter/unsubscribe?token=${token}`;
const confirmUrl = (token: string) => `${siteUrl()}/newsletter/confirm?token=${token}`;

export type SubscribeResult = "check_email" | "saved_no_email" | "invalid";

/**
 * Double opt-in: store as pending, email a confirm link. Re-submitting never reveals whether an address is already subscribed
 * (always the same answer) and re-sends a confirm link at most every 10 minutes.
 */
export async function subscribe(rawEmail: string, source?: string | null): Promise<SubscribeResult> {
  const p = emailSchema.safeParse(rawEmail);
  if (!p.success) return "invalid";
  const email = p.data;
  const { rows } = await pool.query(
    `insert into public.tn_subscriber (email, source) values ($1,$2)
     on conflict (email) do update set status = case when tn_subscriber.status = 'unsubscribed' then 'pending' else tn_subscriber.status end,
                                       token = case when tn_subscriber.status = 'unsubscribed' then gen_random_uuid() else tn_subscriber.token end
     returning status, token, confirm_sent_at`,
    [email, cleanSrc(source ?? null) ?? null],
  );
  const s = rows[0] as { status: string; token: string; confirm_sent_at: string | null };
  if (s.status === "confirmed") return "check_email"; // same answer as a new signup: never reveal who is subscribed
  if (!emailEnabled()) return "saved_no_email";
  if (s.confirm_sent_at && Date.now() - new Date(s.confirm_sent_at).getTime() < 10 * 60_000) return "check_email";
  await sendEmail(email, `Confirm your subscription to ${JAMES.newsletterName}`,
    `Hi, it's James.\n\nTap to confirm you want my daily notes (one short article or story a day):\n\n${confirmUrl(s.token)}\n\nIf this wasn't you, ignore this email and nothing will be sent.`);
  await pool.query("update public.tn_subscriber set confirm_sent_at = now() where email = $1", [email]);
  return "check_email";
}

export async function confirm(token: string): Promise<boolean> {
  if (!TOKEN.test(token)) return false;
  const r = await pool.query("update public.tn_subscriber set status='confirmed', confirmed_at = coalesce(confirmed_at, now()), unsubscribed_at = null where token=$1 returning id", [token]);
  return (r.rowCount ?? 0) > 0;
}
export async function unsubscribe(token: string): Promise<boolean> {
  if (!TOKEN.test(token)) return false;
  const r = await pool.query("update public.tn_subscriber set status='unsubscribed', unsubscribed_at = now() where token=$1 returning id", [token]);
  return (r.rowCount ?? 0) > 0;
}
export async function confirmedCount(): Promise<number> {
  return (await pool.query("select count(*)::int n from public.tn_subscriber where status='confirmed'")).rows[0].n;
}

/**
 * Send today's note to confirmed subscribers who have not had it yet. Idempotent: last_sent_on is set per subscriber after a successful send,
 * so re-running (or a retried cron) never double-sends. Sends nothing if there is no note for today.
 */
export async function sendDailyNote(now: Date = new Date(), batch = 200): Promise<{ date: string; note: string | null; sent: number; failed: number }> {
  const date = dayKey(now);
  const note = noteForDay(date);
  if (!note) return { date, note: null, sent: 0, failed: 0 };
  if (!emailEnabled()) throw new Error("Email is not configured");
  const { rows } = await pool.query(
    "select id, email, token from public.tn_subscriber where status='confirmed' and (last_sent_on is null or last_sent_on < $1::date) order by created_at limit $2", [date, batch]);
  let sent = 0, failed = 0;
  for (const r of rows as { id: string; email: string; token: string }[]) {
    try {
      const url = unsubscribeUrl(r.token);
      const m = buildDailyEmail(note, url);
      await sendEmail(r.email, m.subject, m.text, { "List-Unsubscribe": `<${url}>` });
      await pool.query("update public.tn_subscriber set last_sent_on = $1::date where id = $2", [date, r.id]);
      sent++;
    } catch (e) { failed++; console.error("daily note send failed", r.id, e instanceof Error ? e.message : e); }
  }
  return { date, note: note.slug, sent, failed };
}
