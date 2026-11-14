import Link from "next/link";
import { listCustomers, paying, foundingSeatsUsed } from "@/lib/customers";
import { q } from "@/lib/db";
import { canEmail, dueStep, footerFor, nameFor, renderMail, stepLabel, STEPS, type StepKey } from "@/lib/nurture";
import { getNurtureTemplates, getSettings } from "@/lib/settings";
import { emailConfigured } from "@/lib/mail";
import { FOUNDING } from "@/lib/plans";
import { sendNurture, skipNurture } from "@/app/actions/nurture";
import { Badge, Card, Flash, Notice, PageHeader, btnCls, btnSmCls, fmtDateTime } from "@/components/ui";

export const metadata = { title: "Nurture — HQ" };
export default async function Nurture({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const sp = await searchParams; const set = await getSettings();
  const [cs, sent, tpls, used, recent] = await Promise.all([
    listCustomers(false), q<{ user_id: string; step: string }>("select user_id, step from hq.messages where status in ('sent','skipped')"), getNurtureTemplates(), foundingSeatsUsed(),
    q<{ email: string; step: string; status: string; at: string; error: string | null }>(`select u.email, m.step, m.status, m.at, m.error from hq.messages m join public.tn_user u on u.id = m.user_id order by m.id desc limit 15`),
  ]);
  const sentBy = new Map<string, string[]>(); for (const r of sent) sentBy.set(r.user_id, [...(sentBy.get(r.user_id) ?? []), r.step]);
  const rows = cs.map((c) => ({ c, due: dueStep({ createdAt: c.created_at, plan: c.plan, paying: paying(c), verified: c.verified, emailOk: c.email_ok, optOut: c.email_opt_out, sent: sentBy.get(c.id) ?? [] }) })).filter((r) => r.due);
  const identityOk = Boolean(set.business_name.trim() && set.support_email.trim()); const mailOk = emailConfigured();
  return (
    <>
      <PageHeader title="Nurture" sub="Onboarding emails from the playbook: D0 welcome · D2 expectancy · D5 tag mistakes · D10 review + feedback · D14 upgrade (free). You click send on each one — nothing goes out automatically." />
      <Flash sp={sp} />
      {!mailOk && <Notice kind="warn">Sending is off: set <code>RESEND_API_KEY</code> and <code>EMAIL_FROM</code> on the HQ deployment (after the domain is verified in Resend). You can still preview every email below.</Notice>}
      {!identityOk && <Notice kind="warn">Add your business name and support email in <Link className="underline" href="/settings">Settings</Link> — they appear in every email’s footer and sending is blocked until they’re set.</Notice>}
      <p className="text-xs text-muted">Rules built in: only the latest due step is offered (never a burst); each step is sent at most once per person; opted-out people are never listed; only verified or owner-confirmed addresses can be emailed; the founding-offer line appears only for people who have logged trades.</p>
      {rows.length === 0 ? <Card><p className="text-sm text-muted">Nobody has an email due right now.</p></Card> : (
        <div className="space-y-3">{rows.map(({ c, due }) => {
          const ok = canEmail({ verified: c.verified, emailOk: c.email_ok, optOut: c.email_opt_out });
          const mail = renderMail(tpls[due!.step.key as StepKey], { name: nameFor(c.name, c.email), sender: set.sender_name || "Andrew", trades: c.trades, foundingLeft: Math.max(0, FOUNDING.seats - used) }, footerFor({ business_name: set.business_name || "[business name]", support_email: set.support_email || "[support email]" }));
          return (
            <Card key={c.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><Link href={`/customers/${c.id}`} className="font-medium hover:text-accent">{c.email}</Link><div className="mt-1 flex flex-wrap gap-2 text-xs"><Badge tone="accent">{due!.step.label}</Badge><Badge>{c.trades} trades</Badge>{!ok && <Badge tone="warn">address unconfirmed</Badge>}{due!.skipOlder.length > 0 && <Badge>will skip {due!.skipOlder.map(stepLabel).length} older</Badge>}</div></div>
                <div className="flex gap-2">
                  <form action={skipNurture}><input type="hidden" name="id" value={c.id} /><button className={btnSmCls}>Skip</button></form>
                  <form action={sendNurture}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="step" value={due!.step.key} /><button className={btnCls} disabled={!ok || !mailOk || !identityOk}>Send</button></form>
                </div>
              </div>
              <details className="mt-3 text-sm"><summary className="cursor-pointer text-muted">Preview — {mail.subject}</summary><pre className="mt-2 whitespace-pre-wrap rounded bg-bg p-3 text-xs">{mail.body}</pre></details>
              {!ok && <p className="mt-2 text-xs text-muted">The customer app hasn’t verified this email. If they replied to your DM and you know it’s them, tick “I’ve confirmed this address” on their customer page.</p>}
            </Card>);
        })}</div>)}
      <Card title="Schedule"><ol className="list-inside list-decimal text-sm text-muted">{STEPS.map((s) => <li key={s.key}>Day {s.day}: {s.label}</li>)}</ol></Card>
      <Card title="Recent sends">{recent.length === 0 ? <p className="text-sm text-muted">None yet.</p> : <ul className="space-y-1 text-sm">{recent.map((m, i) => <li key={i}><span className="text-muted">{fmtDateTime(m.at, set.tz)}</span> · {m.email} · {stepLabel(m.step)} · {m.status}{m.error ? ` (${m.error})` : ""}</li>)}</ul>}</Card>
    </>
  );
}
