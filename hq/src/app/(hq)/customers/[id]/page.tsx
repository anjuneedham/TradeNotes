import Link from "next/link";
import { notFound } from "next/navigation";
import { audit, effPlan, foundingSeatsUsed, getCustomer, left } from "@/lib/customers";
import { q } from "@/lib/db";
import { FOUNDING, PRICES, SUB_PERIOD_DAYS } from "@/lib/plans";
import { stepLabel } from "@/lib/nurture";
import { extend, saveMeta, setPlan } from "@/app/actions/customers";
import { Badge, Card, Field, Flash, PageHeader, btnCls, btnGhostCls, fmtDate, fmtDateTime, inputCls } from "@/components/ui";

export default async function CustomerPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; err?: string; plan?: string }> }) {
  const { id } = await params; const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const c = await getCustomer(id); if (!c) notFound();
  const [log, msgs, prospect, used] = await Promise.all([
    audit(id),
    q<{ step: string; status: string; at: string; error: string | null }>("select step, status, at, error from hq.messages where user_id = $1 order by id desc limit 20", [id]),
    q<{ id: string; platform: string; handle: string }>("select id, platform, handle from hq.prospects where lower(customer_email) = lower($1) limit 1", [c.email]),
    foundingSeatsUsed(),
  ]);
  const plan = effPlan(c); const d = left(c); const want = ["starter", "pro"].includes(sp.plan ?? "") ? sp.plan! : c.plan !== "free" ? c.plan : "starter";
  return (
    <>
      <PageHeader title={c.email} sub={`${c.name ?? "No name"} · signed up ${fmtDate(c.created_at)}${c.signup_source ? ` · source ${c.signup_source}` : ""}${c.verified ? "" : " · email unverified"}`}>
        <Link href="/customers" className={btnGhostCls}>← Customers</Link>
      </PageHeader>
      <Flash sp={sp} />
      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Activity">
          <p className="text-3xl font-semibold">{c.trades}</p><p className="text-xs text-muted">trades logged{c.last_trade ? ` · last ${fmtDate(c.last_trade)}` : ""}</p>
          <p className="mt-2 text-sm">{c.onboarded ? "Finished onboarding" : "Has not finished onboarding"}</p>
          {prospect[0] && <p className="mt-2 text-sm">Outreach: <Link className="text-accent underline" href={`/outreach/${prospect[0].id}`}>@{prospect[0].handle} ({prospect[0].platform})</Link></p>}
        </Card>
        <Card title="Plan">
          <p className="text-3xl font-semibold capitalize">{plan}</p>
          <p className="text-xs text-muted">Recorded: {c.plan} / {c.status}{c.current_period_end ? ` · ends ${fmtDate(c.current_period_end)}${d !== null ? ` (${d < 0 ? `lapsed ${-d}d ago` : `${d}d left`})` : ""}` : ""}</p>
          <div className="mt-2 flex flex-wrap gap-2">{c.is_founding_member && <Badge tone="accent">founding member</Badge>}{c.plan !== "free" && plan === "free" && <Badge tone="bad">lapsed → Free</Badge>}</div>
          {c.plan !== "free" && <form action={extend} className="mt-3 space-y-2"><input type="hidden" name="id" value={c.id} /><input name="ref" placeholder="Handypay reference (optional)" className={inputCls} /><button className={btnCls}>Extend +{SUB_PERIOD_DAYS} days</button></form>}
        </Card>
        <Card title="Founding seats"><p className="text-3xl font-semibold">{used}/{FOUNDING.seats}</p><p className="text-xs text-muted">{FOUNDING.discountPct}% off for {FOUNDING.months} months. Offer only after they have logged trades.</p></Card>
      </div>
      <Card title="Change plan (audited)" className="scroll-mt-16"><div id="plan" />
        <form action={setPlan} className="grid gap-3 md:grid-cols-4">
          <input type="hidden" name="id" value={c.id} />
          <Field label="Plan"><select name="plan" defaultValue={want} className={inputCls}><option value="free">Free</option><option value="starter">Starter ${PRICES.starter}</option><option value="pro">Pro ${PRICES.pro}</option></select></Field>
          <Field label="Days to add" hint="35 per monthly payment"><input name="days" type="number" min={1} max={400} defaultValue={SUB_PERIOD_DAYS} className={inputCls} /></Field>
          <Field label="Payment reference"><input name="ref" placeholder="Handypay ref / note" className={inputCls} /></Field>
          <div className="space-y-2 pt-6 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" name="founding" defaultChecked={c.is_founding_member} /> Founding member (50%)</label>
            {c.trades === 0 && <label className="flex items-center gap-2 text-warn"><input type="checkbox" name="confirm" /> They have logged no trades — offer founding anyway</label>}
          </div>
          <div className="md:col-span-4"><button className={btnCls}>Save plan</button><span className="ml-3 text-xs text-muted">Writes tradenotes.subscriptions and an audit entry. Moving to Free keeps all their data.</span></div>
        </form>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Notes & consent">
          <form action={saveMeta} className="space-y-3">
            <input type="hidden" name="id" value={c.id} />
            <Field label="Private notes"><textarea name="notes" rows={4} defaultValue={c.notes ?? ""} className={inputCls} /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="email_ok" defaultChecked={c.email_ok} /> I’ve confirmed this address is really theirs (allows nurture email)</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="email_opt_out" defaultChecked={c.email_opt_out} /> Opted out of email</label>
            <Field label="Testimonial permission" hint="Never use feedback as a testimonial without written permission."><select name="testimonial" defaultValue={c.testimonial} className={inputCls}><option value="none">None</option><option value="asked">Asked</option><option value="written_permission">Written permission received</option></select></Field>
            <Field label="Founding feedback call"><input type="datetime-local" name="founding_call_at" defaultValue={c.founding_call_at?.slice(0, 16) ?? ""} className={inputCls} /></Field>
            <button className={btnCls}>Save</button>
          </form>
        </Card>
        <div className="space-y-4">
          <Card title="Plan history">{log.length === 0 ? <p className="text-sm text-muted">No HQ changes yet.</p> : <ul className="space-y-1 text-sm">{log.map((l, i) => <li key={i}><span className="text-muted">{fmtDateTime(l.at)}</span> · {l.action.replace("hq.", "")} · {String(l.detail?.from)} → {String(l.detail?.to)}{l.detail?.ref ? ` · ${String(l.detail.ref)}` : ""}</li>)}</ul>}</Card>
          <Card title="Emails sent">{msgs.length === 0 ? <p className="text-sm text-muted">None.</p> : <ul className="space-y-1 text-sm">{msgs.map((m, i) => <li key={i}><span className="text-muted">{fmtDateTime(m.at)}</span> · {stepLabel(m.step)} · {m.status}{m.error ? ` (${m.error})` : ""}</li>)}</ul>}</Card>
        </div>
      </div>
    </>
  );
}
