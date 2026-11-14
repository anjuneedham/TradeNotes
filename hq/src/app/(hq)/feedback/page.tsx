import Link from "next/link";
import { q } from "@/lib/db";
import { listCustomers } from "@/lib/customers";
import { addFeedback, deleteFeedback, setFeedbackStatus } from "@/app/actions/misc";
import { Badge, Card, Field, Flash, PageHeader, btnCls, btnSmCls, fmtDate, inputCls } from "@/components/ui";

export const metadata = { title: "Feedback — HQ" };
const KINDS = ["feedback", "bug", "question", "objection", "feature", "testimonial"] as const;
export default async function Feedback({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string; k?: string; all?: string }> }) {
  const sp = await searchParams;
  const rows = await q<{ id: string; kind: string; source: string | null; who: string | null; body: string; tag: string | null; status: string; created_at: string }>(
    `select * from hq.feedback ${sp.k ? "where kind = $1" : ""} order by (status = 'open') desc, created_at desc limit 200`, sp.k ? [sp.k] : []);
  const cs = await listCustomers(true);
  const founding = cs.filter((c) => c.is_founding_member);
  const tags = await q<{ tag: string; n: number }>("select tag, count(*)::int n from hq.feedback where tag is not null group by 1 order by 2 desc limit 8");
  return (
    <>
      <PageHeader title="Feedback & support" sub="Log what people tell you: confusion, objections, bugs, requests. Tag recurring questions — they become glossary/knowledge-base entries. Reply to support within 24 h." />
      <Flash sp={sp} />
      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Log" className="md:col-span-1">
          <form action={addFeedback} className="space-y-3">
            <Field label="Type"><select name="kind" className={inputCls}>{KINDS.map((k) => <option key={k}>{k}</option>)}</select></Field>
            <Field label="Who (handle or email)"><input name="who" className={inputCls} /></Field>
            <Field label="Where from"><input name="source" className={inputCls} placeholder="DM, email, call, comment…" /></Field>
            <Field label="What they said"><textarea name="body" rows={4} required className={inputCls} /></Field>
            <Field label="Tag" hint="e.g. pricing, import, confusing-metric"><input name="tag" className={inputCls} /></Field>
            <button className={btnCls}>Log it</button>
          </form>
          <p className="mt-3 text-xs text-muted">Never use feedback as a testimonial without written permission (set it on the customer page).</p>
        </Card>
        <div className="space-y-3 md:col-span-2">
          <div className="flex flex-wrap gap-2 text-sm"><Link href="/feedback" className={`rounded-full border px-3 py-1 ${!sp.k ? "border-accent text-accent" : "border-border text-muted"}`}>All</Link>{KINDS.map((k) => <Link key={k} href={`/feedback?k=${k}`} className={`rounded-full border px-3 py-1 ${sp.k === k ? "border-accent text-accent" : "border-border text-muted hover:text-fg"}`}>{k}</Link>)}</div>
          {tags.length > 0 && <p className="text-xs text-muted">Top tags: {tags.map((t) => `${t.tag} (${t.n})`).join(" · ")}</p>}
          {rows.length === 0 ? <Card><p className="text-sm text-muted">Nothing logged yet.</p></Card> : rows.map((r) => (
            <Card key={r.id} className={r.status !== "open" ? "opacity-60" : ""}>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted"><span><Badge tone={r.kind === "bug" ? "bad" : r.kind === "objection" ? "warn" : "accent"}>{r.kind}</Badge> {r.who ?? "someone"}{r.source ? ` · ${r.source}` : ""} · {fmtDate(r.created_at)}{r.tag ? ` · #${r.tag}` : ""}</span>
                <span className="flex gap-1">{r.status === "open" ? <form action={setFeedbackStatus}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value="done" /><button className={btnSmCls}>Mark done</button></form> : <form action={setFeedbackStatus}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value="open" /><button className={btnSmCls}>Reopen</button></form>}
                  <form action={deleteFeedback}><input type="hidden" name="id" value={r.id} /><button className={btnSmCls}>×</button></form></span></div>
              <p className="mt-2 whitespace-pre-wrap text-sm">{r.body}</p>
            </Card>))}
        </div>
      </div>
      <Card title={`Founding members (${founding.length}/10)`}>
        {founding.length === 0 ? <p className="text-sm text-muted">No founding members yet. Offer: 50% off for 12 months in exchange for a 20-minute feedback call each month — only after someone has logged trades.</p> : (
          <ul className="space-y-1 text-sm">{founding.map((c) => <li key={c.id}><Link href={`/customers/${c.id}`} className="hover:text-accent">{c.email}</Link> · call: {c.founding_call_at ? fmtDate(c.founding_call_at) : <span className="text-warn">not booked</span>} · testimonial: {c.testimonial.replace("_", " ")}</li>)}</ul>)}
      </Card>
    </>
  );
}
