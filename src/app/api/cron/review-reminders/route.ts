import { NextResponse, type NextRequest } from "next/server";
import { pool } from "@/lib/db";
import { emailEnabled } from "@/lib/email";
import { sendTemplate } from "@/lib/email-templates";
import { report } from "@/lib/monitor";
import { cronAuthorized, dueCandidates, lastWeekStart, sendBudget, unsubscribeToken, type Candidate, DAILY_CAP, MONTHLY_CAP } from "@/lib/reminders";

export const dynamic = "force-dynamic";
const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? process.env.BETTER_AUTH_URL ?? "https://tradenotes.dev";

/**
 * Weekly review reminder sender. Called by the GitHub Actions workflow (.github/workflows/review-reminders.yml) with `Authorization: Bearer $CRON_SECRET`.
 * Opt-in users only, plans with reviews only, at most one email per 6 days, skipped when last week's review is already written,
 * capped per day and per 30 days (Resend free limits). Uses the owner connection (no signed-in user); the response contains counts only.
 */
export async function POST(req: NextRequest) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "not configured" }, { status: 503 });
  if (!cronAuthorized(req.headers.get("authorization"), process.env.CRON_SECRET)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!emailEnabled() || !process.env.BETTER_AUTH_SECRET) return NextResponse.json({ error: "email not configured" }, { status: 503 });

  const now = new Date();
  const sent24 = Number((await pool.query("select count(*)::int n from tradenotes.audit_log where action = 'review_reminder' and created_at > now() - interval '24 hours'")).rows[0].n);
  const sent30 = Number((await pool.query("select count(*)::int n from tradenotes.audit_log where action = 'review_reminder' and created_at > now() - interval '30 days'")).rows[0].n);
  let budget = sendBudget(sent24, sent30);
  if (sent30 >= MONTHLY_CAP * 0.9 || sent24 >= DAILY_CAP * 0.9) console.warn(`review reminders near the email cap (last 24h ${sent24}/${DAILY_CAP}, last 30 days ${sent30}/${MONTHLY_CAP})`);

  const cands = (await pool.query<Candidate>(
    `select p.id, u.email, p.timezone, s.plan, s.status, s.current_period_end, p.review_reminder_sent_at
       from tradenotes.profiles p join public.tn_user u on u.id = p.id left join tradenotes.subscriptions s on s.user_id = p.id
      where p.review_reminders and u."emailVerified" is true order by p.review_reminder_sent_at nulls first limit 1000`)).rows;
  const due = dueCandidates(cands.map((c) => ({ ...c, plan: c.plan ?? "free", status: c.status ?? "active" })), now);

  let sent = 0, alreadyReviewed = 0, failed = 0, deferred = 0;
  for (const c of due) {
    if (budget <= 0) { deferred++; continue; }
    const week = lastWeekStart(now, c.timezone);
    const had = (await pool.query("select 1 from tradenotes.reviews where user_id = $1 and period = 'week' and period_start = $2", [c.id, week])).rowCount;
    if (had) { alreadyReviewed++; continue; }
    try {
      await sendTemplate(c.email, "review_reminder", { url: `${site()}/app/reviews/week/${week}`, unsubscribeUrl: `${site()}/reminders/unsubscribe?t=${encodeURIComponent(unsubscribeToken(c.id, process.env.BETTER_AUTH_SECRET))}` });
      await pool.query("update tradenotes.profiles set review_reminder_sent_at = now() where id = $1", [c.id]);
      await pool.query("insert into tradenotes.audit_log (user_id, action, detail) values ($1, 'review_reminder', $2::jsonb)", [c.id, JSON.stringify({ week })]);
      sent++; budget--;
    } catch (e) { failed++; report(e instanceof Error ? e : new Error("reminder send failed"), "review-reminders", {}); }
  }
  return NextResponse.json({ optedIn: cands.length, due: due.length, sent, alreadyReviewed, failed, deferred });
}
