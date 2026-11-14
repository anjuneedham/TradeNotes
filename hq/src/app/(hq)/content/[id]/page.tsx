import Link from "next/link";
import { notFound } from "next/navigation";
import { getContent, postsFor } from "@/lib/content-data";
import { approvalBlockers, CHECKS, estimateSeconds, FORMATS, FORMAT_IDS, scanClaims, STATUSES, STATUS_LABEL } from "@/lib/content";
import { addPost, deleteContent, deletePost, moveContent, saveContent, updatePost } from "@/app/actions/content";
import { Badge, Card, Field, Flash, Notice, PageHeader, btnCls, btnGhostCls, btnSmCls, dangerCls, fmtDateTime, inputCls } from "@/components/ui";

const numCls = "w-24 rounded-md border border-border bg-bg px-2 py-1 text-sm";
export default async function ContentItemPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { id } = await params; const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const it = await getContent(id); if (!it) notFound();
  const posts = await postsFor(id);
  const blockers = approvalBlockers(it); const scan = scanClaims(it.hook, it.voiceover, it.tt_caption, it.yt_title, it.talking_points, it.cta);
  const secs = estimateSeconds(it.voiceover); const f = FORMATS[it.format as keyof typeof FORMATS];
  const idx = STATUSES.indexOf(it.status); const next = STATUSES[idx + 1]; const prev = STATUSES[idx - 1];
  return (
    <>
      <PageHeader title={`#${it.code} · ${it.title}`} sub={`${it.format} — ${f?.name} · ${f?.seconds}s · ${f?.beats}`}>
        <Link href="/content" className={btnGhostCls}>← Board</Link>
        {it.voiceover && <Link href={`/prompter/${it.id}`} className={btnGhostCls} target="_blank">Teleprompter</Link>}
      </PageHeader>
      <Flash sp={sp} />
      {it.claims?.startsWith("BLOCKED") && <Notice kind="error">{it.claims}</Notice>}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted">Status:</span><Badge tone="accent">{STATUS_LABEL[it.status]}</Badge>
        {prev && <form action={moveContent}><input type="hidden" name="id" value={it.id} /><input type="hidden" name="to" value={prev} /><button className={btnSmCls}>← {STATUS_LABEL[prev]}</button></form>}
        {next && <form action={moveContent}><input type="hidden" name="id" value={it.id} /><input type="hidden" name="to" value={next} /><button className={btnSmCls}>→ {STATUS_LABEL[next]}</button></form>}
      </div>
      {it.status === "scripted" && blockers.length > 0 && <Notice kind="warn"><strong>Before this can be approved:</strong><ul className="ml-5 list-disc">{blockers.map((b) => <li key={b}>{b}</li>)}</ul></Notice>}
      {(scan.hard.length > 0 || scan.soft.length > 0) && <Notice kind={scan.hard.length ? "error" : "warn"}>{scan.hard.length > 0 && <>Banned wording: {scan.hard.join(", ")}. </>}{scan.soft.length > 0 && <>Check: {scan.soft.join("; ")}.</>}</Notice>}
      <form action={saveContent} className="space-y-4">
        <input type="hidden" name="id" value={it.id} />
        <Card title="Script">
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Title" className="md:col-span-2"><input name="title" defaultValue={it.title} className={inputCls} /></Field>
            <Field label="Format"><select name="format" defaultValue={it.format} className={inputCls}>{FORMAT_IDS.map((x) => <option key={x} value={x}>{x} — {FORMATS[x].name}</option>)}</select></Field>
            <Field label="Hook (≤2 s, on-screen + spoken)" className="md:col-span-3"><input name="hook" defaultValue={it.hook ?? ""} className={inputCls} /></Field>
            <Field label="Talking points (max 3)" className="md:col-span-3"><textarea name="talking_points" rows={3} defaultValue={it.talking_points ?? ""} className={inputCls} /></Field>
            <Field label={`Full voice-over (~${secs}s spoken; target 20–45s)`} className="md:col-span-3"><textarea name="voiceover" rows={7} defaultValue={it.voiceover ?? ""} className={inputCls} /></Field>
            <Field label="Screen recording plan (what to click, in order)" className="md:col-span-3"><textarea name="screen_plan" rows={3} defaultValue={it.screen_plan ?? ""} className={inputCls} /></Field>
            <Field label="On-screen captions / big numbers"><textarea name="captions_note" rows={3} defaultValue={it.captions_note ?? ""} className={inputCls} /></Field>
            <Field label="CTA" hint="Free journal — link in bio · Comment ‘JOURNAL’ · Follow for day-by-day"><textarea name="cta" rows={3} defaultValue={it.cta ?? ""} className={inputCls} /></Field>
            <Field label="Editing notes"><textarea name="editing_notes" rows={3} defaultValue={it.editing_notes ?? ""} className={inputCls} /></Field>
            <Field label="Shorts title"><input name="yt_title" defaultValue={it.yt_title ?? ""} className={inputCls} /></Field>
            <Field label="TikTok caption + hashtags" className="md:col-span-2"><input name="tt_caption" defaultValue={it.tt_caption ?? ""} className={inputCls} /></Field>
            <Field label="Claims to verify before posting" className="md:col-span-2"><textarea name="claims" rows={2} defaultValue={it.claims ?? ""} className={inputCls} /></Field>
            <Field label="Planned post date"><input type="date" name="planned_for" defaultValue={it.planned_for ?? ""} className={inputCls} /></Field>
          </div>
        </Card>
        <Card title="Compliance checklist (all required to approve)">
          <div className="space-y-2">{CHECKS.map((c) => <label key={c.key} className="flex items-start gap-2 text-sm"><input type="checkbox" name={`chk_${c.key}`} defaultChecked={Boolean((it.checks as Record<string, boolean>)[c.key])} className="mt-1" /> {c.label}</label>)}</div>
          <p className="mt-2 text-xs text-muted">Source: docs/CONTENT_ENGINE.md §0. The founder approves every claim before posting — ticking these is that approval.</p>
        </Card>
        <button className={btnCls}>Save script</button>
      </form>
      <Card title={`Posts (${posts.length})`}>
        <p className="mb-3 text-xs text-muted">Log each post and its numbers (from the platform’s analytics, usually after 24–48 h). Only enter what the platform shows you.</p>
        <div className="space-y-3">
          {posts.map((p) => (
            <form key={p.id} action={updatePost} className="flex flex-wrap items-end gap-2 rounded-md border border-border p-2 text-sm">
              <input type="hidden" name="post_id" value={p.id} /><input type="hidden" name="back" value={`/content/${it.id}`} />
              <div className="w-40"><Badge tone="accent">{p.platform}</Badge><div className="text-xs text-muted">{fmtDateTime(p.posted_at)}</div></div>
              <label className="text-xs text-muted">URL<input name="url" defaultValue={p.url ?? ""} className="mt-1 block w-48 rounded-md border border-border bg-bg px-2 py-1 text-sm" /></label>
              {([["views", "Views", p.views], ["view_rate_3s", "3s view %", p.view_rate_3s], ["avg_watch_pct", "Avg watch %", p.avg_watch_pct], ["saves", "Saves", p.saves], ["link_clicks", "Link clicks", p.link_clicks], ["signups", "Signups", p.signups]] as [string, string, number | null][]).map(([k, l, v]) =>
                <label key={k} className="text-xs text-muted">{l}<input name={k} type="number" step="any" min={0} defaultValue={v ?? ""} className={`${numCls} mt-1 block`} /></label>)}
              <button className={btnSmCls}>Update</button><button formAction={deletePost} className={btnSmCls}>Remove</button>
            </form>))}
        </div>
        <form action={addPost} className="mt-4 flex flex-wrap items-end gap-2 border-t border-border pt-4 text-sm">
          <input type="hidden" name="content_id" value={it.id} />
          <label className="text-xs text-muted">Platform<select name="platform" className="mt-1 block rounded-md border border-border bg-bg px-2 py-1.5 text-sm"><option value="tiktok">TikTok</option><option value="youtube">YouTube Shorts</option><option value="instagram">Instagram</option></select></label>
          <label className="text-xs text-muted">URL<input name="url" className="mt-1 block w-56 rounded-md border border-border bg-bg px-2 py-1.5 text-sm" /></label>
          <label className="text-xs text-muted">Views<input name="views" type="number" min={0} defaultValue={0} className={`${numCls} mt-1 block`} /></label>
          <button className={btnCls}>Log post</button>
        </form>
      </Card>
      <form action={deleteContent}><input type="hidden" name="id" value={it.id} /><button className={dangerCls}>Delete this item</button></form>
    </>
  );
}
