import Link from "next/link";
import { listContent } from "@/lib/content-data";
import { FORMATS, FORMAT_IDS, STATUSES, STATUS_LABEL, scanClaims } from "@/lib/content";
import { createContent, moveContent } from "@/app/actions/content";
import { Badge, Card, Field, Flash, PageHeader, btnCls, btnGhostCls, btnSmCls, fmtDate, inputCls } from "@/components/ui";

export const metadata = { title: "Content — HQ" };
export default async function Content({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string; f?: string; show?: string }> }) {
  const sp = await searchParams; const all = await listContent();
  const items = all.filter((i) => !sp.f || i.format === sp.f);
  const cols = STATUSES.filter((s) => s !== "idea" || sp.show === "ideas" || true);
  const counts = Object.fromEntries(STATUSES.map((s) => [s, all.filter((i) => i.status === s).length]));
  return (
    <>
      <PageHeader title="Content studio" sub="Idea → scripted → approved → recorded → edited → posted → measured. Nothing is approved until the compliance checklist is complete.">
        <Link href="/content/record" className={btnCls}>Record session</Link>
        <Link href="/content/performance" className={btnGhostCls}>Performance</Link>
        <Link href="/content/captions" className={btnGhostCls}>Caption tool</Link>
      </PageHeader>
      <Flash sp={sp} />
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link href="/content" className={`rounded-full border px-3 py-1 ${!sp.f ? "border-accent text-accent" : "border-border text-muted"}`}>All formats</Link>
        {FORMAT_IDS.map((f) => <Link key={f} href={`/content?f=${f}`} className={`rounded-full border px-3 py-1 ${sp.f === f ? "border-accent text-accent" : "border-border text-muted hover:text-fg"}`}>{f} · {FORMATS[f].name}</Link>)}
      </div>
      <Card title="New idea">
        <form action={createContent} className="flex flex-wrap items-end gap-3">
          <Field label="Format"><select name="format" className={inputCls}>{FORMAT_IDS.map((f) => <option key={f} value={f}>{f} — {FORMATS[f].name}</option>)}</select></Field>
          <Field label="Hook / working title" className="min-w-72 flex-1"><input name="title" required className={inputCls} /></Field>
          <button className={btnCls}>Add</button>
        </form>
      </Card>
      <div className="grid gap-3 md:grid-cols-7">
        {cols.map((s) => (
          <div key={s} className="min-w-0 rounded-lg border border-border bg-panel/40 p-2">
            <h3 className="mb-2 flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-wide text-muted"><span>{STATUS_LABEL[s]}</span><span>{counts[s]}</span></h3>
            <div className="space-y-2">
              {items.filter((i) => i.status === s).map((i) => {
                const hard = scanClaims(i.hook, i.voiceover, i.tt_caption).hard.length > 0;
                const next = STATUSES[STATUSES.indexOf(s) + 1];
                return (
                  <div key={i.id} className="rounded-md border border-border bg-bg p-2 text-sm">
                    <Link href={`/content/${i.id}`} className="line-clamp-3 hover:text-accent">{i.title}</Link>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1"><Badge tone="accent">{i.format}</Badge>{i.claims?.startsWith("BLOCKED") && <Badge tone="bad">blocked</Badge>}{hard && <Badge tone="bad">banned wording</Badge>}{i.planned_for && <Badge>{fmtDate(i.planned_for)}</Badge>}</div>
                    {next && (
                      <form action={moveContent} className="mt-2"><input type="hidden" name="id" value={i.id} /><input type="hidden" name="to" value={next} /><input type="hidden" name="back" value="/content" /><button className={btnSmCls}>→ {STATUS_LABEL[next]}</button></form>)}
                  </div>);
              })}
            </div>
          </div>))}
      </div>
    </>
  );
}
