import Link from "next/link";
import { notFound } from "next/navigation";
import { getProspect } from "@/lib/outreach-data";
import { buildLink, DM_TAG, followUpDueAt, followUpIsDue, mergeTemplate, PLATFORM_LABEL, STAGES, STAGE_LABEL } from "@/lib/outreach";
import { getSettings, getTemplates } from "@/lib/settings";
import { findCustomerByEmail } from "@/lib/customers";
import { deleteProspect, linkCustomer, logTouch, saveProspect, setStage, toggleDnc } from "@/app/actions/outreach";
import CopyButton from "@/components/CopyButton";
import { Badge, Card, Field, Flash, Notice, PageHeader, btnCls, btnGhostCls, dangerCls, fmtDateTime, inputCls } from "@/components/ui";

export default async function ProspectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; err?: string; tpl?: string }> }) {
  const { id } = await params; const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const data = await getProspect(id); if (!data) notFound();
  const { p, touches } = data; const set = await getSettings(); const tpls = (await getTemplates()).filter((t) => !t.for || t.for.includes(p.platform));
  const hasDm = touches.some((t) => t.kind === "dm"); const hasReply = touches.some((t) => t.kind === "reply"); const hasFollowup = touches.some((t) => t.kind === "followup");
  const due = followUpDueAt(touches); const dueNow = followUpIsDue(touches);
  const suggested = hasReply ? "link_after_reply" : hasDm ? "followup" : p.platform === "instagram" ? "ig_dm" : "cold_dm";
  const tpl = tpls.find((t) => t.key === (sp.tpl ?? suggested)) ?? tpls[0];
  const link = DM_TAG[p.platform] ? buildLink(set.site_url, DM_TAG[p.platform]) : null;
  const merged = tpl ? mergeTemplate(tpl.body, { name: p.name ?? p.handle, specific: p.source_note, site: set.site_url, link }) : { text: "", missing: [] as string[] };
  const kind = hasReply ? "note" : hasDm ? "followup" : "dm";
  const customer = p.customer_email ? await findCustomerByEmail(p.customer_email) : null;
  return (
    <>
      <PageHeader title={`@${p.handle}`} sub={`${PLATFORM_LABEL[p.platform]}${p.name ? ` · ${p.name}` : ""}`}>
        <Link href="/outreach" className={btnGhostCls}>← Outreach</Link>
      </PageHeader>
      <Flash sp={sp} />
      {p.do_not_contact && <Notice kind="error">Marked do-not-contact. HQ will refuse to log messages to them.</Notice>}
      {hasDm && !hasReply && !hasFollowup && due && <Notice kind={dueNow ? "warn" : "info"}>{dueNow ? "Follow-up is due now (once only, then stop)." : `Follow-up due ${fmtDateTime(due.toISOString(), set.tz)}.`}</Notice>}
      {hasFollowup && !hasReply && <Notice>Follow-up sent. The playbook says stop here unless they reply.</Notice>}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-4 md:col-span-2">
          <Card title="Message composer">
            <div className="mb-3 flex flex-wrap gap-2">{tpls.map((t) => <Link key={t.key} href={`/outreach/${p.id}?tpl=${t.key}`} className={`rounded-full border px-3 py-1 text-xs ${tpl?.key === t.key ? "border-accent text-accent" : "border-border text-muted hover:text-fg"}`}>{t.title}</Link>)}</div>
            {merged.missing.length > 0 && <div className="mb-3"><Notice kind="warn">Still to fill in before sending: {merged.missing.join(", ")}. {merged.missing.includes("{specific thing}") && "Add what they posted on the right → “Details”."}</Notice></div>}
            <form action={logTouch} className="space-y-3">
              <input type="hidden" name="id" value={p.id} /><input type="hidden" name="kind" value={kind} />
              <textarea name="body" rows={7} defaultValue={merged.text} className={inputCls} aria-label="Message" />
              <div className="flex flex-wrap items-center gap-2">
                <button className={btnCls}>{kind === "dm" ? "I sent this DM — log it" : kind === "followup" ? "I sent this follow-up — log it" : "Log message"}</button>
                <CopyButton text={merged.text} label="Copy original" />
                {kind === "followup" && !dueNow && <label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" name="force" value="1" /> send early anyway</label>}
              </div>
              <p className="text-xs text-muted">Copy it, personalise it, send it yourself in the app, then log it. Edits you make above are what gets logged.{link && <> Tagged link for this platform: <code>{link}</code></>}</p>
            </form>
          </Card>
          <Card title="Timeline">
            {touches.length === 0 ? <p className="text-sm text-muted">Nothing logged yet.</p> : (
              <ol className="space-y-3 text-sm">{touches.map((t) => (
                <li key={t.id} className="border-l-2 border-border pl-3"><div className="text-xs text-muted">{fmtDateTime(t.at, set.tz)} · <Badge tone={t.kind === "reply" ? "accent" : "muted"}>{t.kind}</Badge>{t.link_tag && <> · {t.link_tag}</>}</div>{t.body && <p className="mt-1 whitespace-pre-wrap">{t.body}</p>}</li>))}</ol>)}
            <form action={logTouch} className="mt-4 grid gap-2 border-t border-border pt-4 md:grid-cols-[10rem_1fr_auto]">
              <input type="hidden" name="id" value={p.id} />
              <select name="kind" className={inputCls} aria-label="Type"><option value="reply">They replied</option><option value="comment">I commented</option><option value="follow">I followed</option><option value="demo">Demo / call done</option><option value="note">Note</option></select>
              <input name="body" className={inputCls} placeholder="What they said / what happened" aria-label="Detail" />
              <button className={btnGhostCls}>Log</button>
            </form>
          </Card>
        </div>
        <div className="space-y-4">
          <Card title="Stage">
            <form action={setStage} className="space-y-2"><input type="hidden" name="id" value={p.id} />
              <select name="stage" defaultValue={p.stage} className={inputCls}>{STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}</select>
              <input name="objection" defaultValue={p.objection ?? ""} placeholder="Objection / reason (if lost or not now)" className={inputCls} />
              <button className={btnGhostCls}>Set stage</button></form>
          </Card>
          <Card title="Signed up?">
            <form action={linkCustomer} className="space-y-2"><input type="hidden" name="id" value={p.id} />
              <input name="email" type="email" defaultValue={p.customer_email ?? ""} placeholder="Their TradeNotes signup email" className={inputCls} />
              <button className={btnGhostCls}>Link account</button></form>
            {customer ? <p className="mt-2 text-sm">Linked: <Link className="text-accent underline" href={`/customers/${customer.id}`}>{customer.email}</Link> · {customer.trades} trades · {customer.plan}</p> : <p className="mt-2 text-xs text-muted">Link their email and the stage follows their real activity (signed up → logged a trade → paying).</p>}
          </Card>
          <Card title="Details">
            <form action={saveProspect} className="space-y-2"><input type="hidden" name="id" value={p.id} /><input type="hidden" name="objection" value={p.objection ?? ""} />
              <Field label="Name"><input name="name" defaultValue={p.name ?? ""} className={inputCls} /></Field>
              <Field label="What they posted"><textarea name="source_note" rows={3} defaultValue={p.source_note ?? ""} className={inputCls} /></Field>
              <Field label="Notes"><textarea name="notes" rows={3} defaultValue={p.notes ?? ""} className={inputCls} /></Field>
              <button className={btnGhostCls}>Save</button></form>
          </Card>
          <Card title="Danger zone">
            <div className="flex flex-wrap gap-2">
              <form action={toggleDnc}><input type="hidden" name="id" value={p.id} /><button className={btnGhostCls}>{p.do_not_contact ? "Allow contact again" : "Do not contact"}</button></form>
              <form action={deleteProspect}><input type="hidden" name="id" value={p.id} /><button className={dangerCls}>Delete</button></form>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
