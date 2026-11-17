import { createHmac, timingSafeEqual } from "node:crypto";
import { effectivePlan } from "./entitlements";
import { PLANS } from "./plans";
import { currentStart, shiftStart } from "./reviews";

/**
 * Opt-in weekly review reminder (pure helpers). Rules: opt-in only, at most one email per 6 days per user, only for plans that include reviews,
 * only when last week's review has not been written, and a hard cap per run and per rolling 30 days so total sends stay inside Resend's free limits
 * (about 100 a day and 3,000 a month). The email carries NO trading figures, only a link.
 */
export const REMINDER_MIN_GAP_DAYS = 6;
export const DAILY_CAP = 90;
export const MONTHLY_CAP = 2500;
/** Is the scheduler configured? The settings switch and the pricing copy appear only then, so nothing is promised that cannot be delivered. */
export const remindersLive = (env: Record<string, string | undefined> = process.env) => Boolean(env.CRON_SECRET && env.RESEND_API_KEY);

// ---- unsubscribe token: "<userId>.<hex HMAC-SHA256>" signed with the server secret (no database lookup, cannot be forged or guessed)
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const sign = (userId: string, secret: string) => createHmac("sha256", secret).update(`review-reminder-unsubscribe:${userId}`).digest("hex");
export function unsubscribeToken(userId: string, secret: string): string { return `${userId}.${sign(userId, secret)}`; }
/** Returns the user id if the token is genuine, else null. */
export function verifyUnsubscribeToken(token: string, secret: string): string | null {
  const i = token.lastIndexOf(".");
  if (i < 0 || !secret) return null;
  const id = token.slice(0, i), sig = token.slice(i + 1);
  if (!UUID.test(id) || !/^[0-9a-f]{64}$/.test(sig)) return null;
  const want = Buffer.from(sign(id, secret), "hex"), got = Buffer.from(sig, "hex");
  return want.length === got.length && timingSafeEqual(want, got) ? id : null;
}

/** Constant-time check of the cron bearer token. */
export function cronAuthorized(header: string | null, secret: string | undefined): boolean {
  if (!secret || !header?.startsWith("Bearer ")) return false;
  const a = Buffer.from(header.slice(7)), b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface Candidate {
  id: string; email: string; timezone: string;
  plan: string; status: string; current_period_end: string | null;
  review_reminder_sent_at: string | null;
}
/** The week to review: the full Monday-to-Sunday week before the one that contains `now` in the user's zone. */
export const lastWeekStart = (now: Date, tz: string) => shiftStart("week", currentStart("week", now, tz), -1);

/** Candidates who are due, before the "already wrote last week's review" check (a database lookup done by the caller). */
export function dueCandidates(cands: readonly Candidate[], now: Date): Candidate[] {
  return cands.filter((c) => {
    if (!PLANS[effectivePlan({ plan: c.plan, status: c.status, current_period_end: c.current_period_end }, now)].reviews) return false;
    if (c.review_reminder_sent_at && now.getTime() - new Date(c.review_reminder_sent_at).getTime() < REMINDER_MIN_GAP_DAYS * 86400000) return false;
    return true;
  });
}
/** How many more may be sent now, given what was already sent in the last 24 h and 30 days. */
export const sendBudget = (sentLast24h: number, sentLast30d: number) => Math.max(0, Math.min(DAILY_CAP - sentLast24h, MONTHLY_CAP - sentLast30d));
