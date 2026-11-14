import Link from "next/link";
import { q } from "@/lib/db";
import { listCustomers, summarize } from "@/lib/customers";
import { dueFollowUps, syncProspectStages, todayCounts } from "@/lib/outreach-data";
import { postsToday } from "@/lib/content-data";
import { getSettings } from "@/lib/settings";
import { FOUNDING } from "@/lib/plans";
import { dueStep } from "@/lib/nurture";
import { paying } from "@/lib/customers";
import { snapshotFor, todayIn } from "@/lib/snapshot";
import { Badge, Card, PageHeader, Progress, Stat, money, fmtDate } from "@/components/ui";

export const metadata = { title: "Today — HQ" };
const row = (done: boolean, label: React.ReactNode, href: string, right?: React.ReactNode) => (
  <li key={href + String(label)} className="flex items-center justify-between gap-3 py-2 text-sm">
    <span className="flex items-center gap-2"><span aria-hidden className={`inline-block h-4 w-4 rounded-full border text-center text-[10px] leading-[14px] ${done ? "border-win bg-win/20 text-win" : "border-border"}`}>{done ? "✓" : ""}</span><Link href={href} className="hover:text-accent">{label}</Link></span>{right}
  </li>
);

export default async function Today() {
  const set = await getSettings(); const today = todayIn(set.tz);
  await syncProspectStages();
  const [cs, counts, due, posts] = await Promise.all([listCustomers(false), todayCounts(set.tz), dueFollowUps(), postsToday(set.tz)]);
  const sum = summarize(cs); const snap = await snapshotFor(today, set.tz, cs);
  const [pipe, fb, gates, sentRows, replied] = await Promise.all([
    q<{ status: string; n: number }>("select status, count(*)::int n from hq.content_items group by 1"),
    q<{ n: number }>("select count(*)::int n from hq.feedback where status='open'"),
    q<{ n: number }>("select count(*)::int n from hq.tasks where not done"),
    q<{ user_id: string; step: string }>("select user_id, step from hq.messages where status in ('sent','skipped')"),
    q<{ n: number }>("select count(*)::int n from hq.prospects where stage = 'replied' and not do_not_contact"),
  ]);
  const st = (s: string) => pipe.find((p) => p.status === s)?.n ?? 0;
  const sentBy = new Map<string, string[]>(); for (const r of sentRows) sentBy.set(r.user_id, [...(sentBy.get(r.user_id) ?? []), r.step]);
  const nurtureDue = cs.filter((c) => dueStep({ createdAt: c.created_at, plan: c.plan, paying: paying(c), verified: c.verified, emailOk: c.email_ok, optOut: c.email_opt_out, sent: sentBy.get(c.id) ?? [] })).length;
  const days = Math.round((new Date(set.goal_date).getTime() - new Date(today).getTime()) / 86_400_000);
  const stuck = cs.filter((c) => c.trades === 0 && Date.now() - new Date(c.created_at).getTime() > 2 * 86_400_000).slice(0, 5);
  const hour = Number(new Date().toLocaleString("en-GB", { timeZone: set.tz, hour: "2-digit", hour12: false }));
  return (
    <>
      <PageHeader title={hour < 12 ? "Good morning" : hour < 18 ? "Today" : "Evening wrap-up"} sub={`${today} · ${set.tz}. Do the next unchecked thing.`} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Paying" value={`${sum.paying} / ${set.goal_paying}`} tone={sum.paying >= set.goal_paying ? "good" : undefined} sub={days > 0 ? `${days}d to goal` : days === 0 ? "goal date is today" : "past goal date"} href="/launch" />
        <Stat label="MRR (recorded)" value={money(sum.mrr)} href="/customers" />
        <Stat label="Founding seats" value={`${sum.foundingUsed} / ${FOUNDING.seats}`} href="/launch" />
        <Stat label="Signups" value={sum.total} sub={`${snap.signups} today · ${sum.activated} logged a trade`} href="/customers" />
        <Stat label="Launch gates open" value={gates[0].n} tone={gates[0].n ? "warn" : "good"} href="/launch" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Money">
          <ul className="divide-y divide-border">
            {row(false, "Check Handypay for new payments → record the plan", "/customers", <Badge>manual</Badge>)}
            {row(sum.expiring.length === 0, `Renewals expiring within 7 days: ${sum.expiring.length}`, "/customers?f=expiring", sum.expiring.length ? <Badge tone="warn">extend after payment</Badge> : null)}
            {row(sum.lapsed.length === 0, `Lapsed back to Free: ${sum.lapsed.length}`, "/customers?f=lapsed")}
            {row(nurtureDue === 0, `Nurture emails due: ${nurtureDue}`, "/nurture")}
          </ul>
        </Card>
        <Card title="Outreach">
          <ul className="divide-y divide-border">
            {row(counts.dmTiktok >= set.dm_target_tiktok, `TikTok DMs ${counts.dmTiktok} / ${set.dm_target_tiktok}`, "/outreach")}
            {row(counts.dmInstagram >= set.dm_target_instagram, `Instagram DMs ${counts.dmInstagram} / ${set.dm_target_instagram}`, "/outreach")}
            {row(due.length === 0, `Follow-ups due (once, day 3): ${due.length}`, "/outreach")}
            {row(replied[0].n === 0, `Replies waiting for you: ${replied[0].n}`, "/outreach?stage=replied")}
          </ul>
          <div className="mt-2"><Progress value={counts.dmTiktok + counts.dmInstagram} max={set.dm_target_tiktok + set.dm_target_instagram} /></div>
        </Card>
        <Card title="Content">
          <ul className="divide-y divide-border">
            {row(posts.tiktok >= set.post_target_tiktok, `TikToks posted ${posts.tiktok} / ${set.post_target_tiktok}`, "/content")}
            {row(posts.youtube >= set.post_target_youtube, `Shorts posted ${posts.youtube} / ${set.post_target_youtube}`, "/content")}
            {row(st("scripted") === 0, `Scripts waiting for your approval: ${st("scripted")}`, "/content")}
            {row(st("approved") === 0, `Approved, ready to record: ${st("approved")}`, "/content/record")}
            {row(st("recorded") + st("edited") === 0, `Recorded/edited, ready to finish & post: ${st("recorded") + st("edited")}`, "/content")}
          </ul>
        </Card>
        <Card title="Support & product">
          <ul className="divide-y divide-border">
            {row(fb[0].n === 0, `Open feedback / bugs: ${fb[0].n}`, "/feedback")}
            {row(stuck.length === 0, `Signed up but no trade after 2 days: ${stuck.length}`, "/customers?f=stuck")}
          </ul>
          {stuck.length > 0 && <ul className="mt-2 space-y-1 text-xs text-muted">{stuck.map((c) => <li key={c.id}><Link href={`/customers/${c.id}`} className="hover:text-accent">{c.email}</Link> · {fmtDate(c.created_at)} · {c.signup_source ?? "no source"}</li>)}</ul>}
        </Card>
      </div>
      <Card title="Signups today by source">
        {snap.signupsBySource.length === 0 ? <p className="text-sm text-muted">No signups yet today.</p> : <ul className="space-y-1 text-sm">{snap.signupsBySource.map((s) => <li key={s.source}><Badge>{s.source}</Badge> {s.signups} signup{s.signups === 1 ? "" : "s"} · {s.activated} logged a trade</li>)}</ul>}
      </Card>
      <Card title="Daily rhythm (docs/DAILY_OPERATIONS.md)">
        <ul className="list-inside list-disc space-y-1 text-sm text-muted">
          <li><strong className="text-fg">Morning:</strong> error monitoring, Handypay failed/cancelled payments, reconcile subscriptions, support inbox.</li>
          <li><strong className="text-fg">Content:</strong> record 3 VOs; post 3 TikTok + 2 Shorts; reply to every comment in the first hour.</li>
          <li><strong className="text-fg">Sales:</strong> 20–30 personalised DMs, follow-ups, at least one demo.</li>
          <li><strong className="text-fg">Evening:</strong> <Link href="/reports" className="text-accent underline">fill the daily report</Link>.</li>
        </ul>
      </Card>
    </>
  );
}
