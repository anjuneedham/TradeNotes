import Link from "next/link";
import { dueFollowUps, funnelRows, listProspects, syncProspectStages, todayCounts } from "@/lib/outreach-data";
import { funnel, PLATFORMS, PLATFORM_LABEL, STAGES, STAGE_LABEL, type Stage } from "@/lib/outreach";
import { getSettings } from "@/lib/settings";
import { addProspect, bulkAdd } from "@/app/actions/outreach";
import { Badge, Card, Field, Flash, PageHeader, Progress, Stat, Table, btnCls, btnGhostCls, fmtDateTime, inputCls, td, th } from "@/components/ui";

export const metadata = { title: "Outreach — HQ" };
const stageTone = (s: Stage) => (s === "paying" ? "good" : s === "lost" || s === "not_now" ? "bad" : s === "replied" || s === "interested" ? "accent" : "muted") as "good" | "bad" | "accent" | "muted";

export default async function Outreach({ searchParams }: { searchParams: Promise<{ stage?: string; platform?: string; s?: string; ok?: string; err?: string }> }) {
  const sp = await searchParams; const set = await getSettings();
  await syncProspectStages();
  const [counts, due, rows, fr] = await Promise.all([todayCounts(set.tz), dueFollowUps(), listProspects({ stage: sp.stage, platform: sp.platform, s: sp.s }), funnelRows()]);
  const f = funnel(fr);
  const waiting = rows.filter((r) => r.stage === "replied").length;
  return (
    <>
      <PageHeader title="Outreach" sub="Manual, personalised, spread through the day. HQ never sends DMs for you — it tracks them and enforces the playbook (one follow-up, never the same message twice)." />
      <Flash sp={sp} />
      <div className="grid gap-3 md:grid-cols-4">
        <Card><p className="text-xs uppercase text-muted">TikTok DMs today</p><p className="my-1 text-2xl font-semibold">{counts.dmTiktok}<span className="text-base text-muted"> / {set.dm_target_tiktok}</span></p><Progress value={counts.dmTiktok} max={set.dm_target_tiktok} /></Card>
        <Card><p className="text-xs uppercase text-muted">Instagram DMs today</p><p className="my-1 text-2xl font-semibold">{counts.dmInstagram}<span className="text-base text-muted"> / {set.dm_target_instagram}</span></p><Progress value={counts.dmInstagram} max={set.dm_target_instagram} /></Card>
        <Stat label="Follow-ups due" value={due.length} tone={due.length ? "warn" : undefined} sub="day 3, once only" />
        <Stat label="Replies to answer" value={waiting} tone={waiting ? "warn" : undefined} sub={`${counts.replies} logged today`} />
      </div>
      <p className="text-xs text-muted">Platforms limit DMs and I haven’t verified current limits: comment/follow first, stop for the day if a platform warns you, and spread messages through the day.</p>

      {due.length > 0 && (
        <Card title={`Follow-ups due (${due.length})`}>
          <ul className="divide-y divide-border text-sm">{due.slice(0, 15).map((p) => <li key={p.id} className="flex items-center justify-between gap-3 py-2"><span><Link className="font-medium hover:text-accent" href={`/outreach/${p.id}`}>@{p.handle}</Link> <span className="text-muted">· {PLATFORM_LABEL[p.platform]} · DM’d {fmtDateTime(p.first_dm, set.tz)}</span></span><Link href={`/outreach/${p.id}`} className={btnGhostCls}>Open</Link></li>)}</ul>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Add one">
          <form action={addProspect} className="grid grid-cols-2 gap-3">
            <Field label="Platform"><select name="platform" className={inputCls}>{PLATFORMS.map((p) => <option key={p} value={p}>{PLATFORM_LABEL[p]}</option>)}</select></Field>
            <Field label="Handle"><input name="handle" required className={inputCls} placeholder="@handle" /></Field>
            <Field label="Name (optional)"><input name="name" className={inputCls} /></Field>
            <Field label="What they posted (for personalising)" className="col-span-2"><input name="source_note" className={inputCls} placeholder="e.g. lost 3 in a row, says he needs a journal" /></Field>
            <div className="col-span-2"><button className={btnCls}>Add prospect</button></div>
          </form>
        </Card>
        <Card title="Add many (paste your 25)">
          <form action={bulkAdd} className="space-y-3">
            <Field label="Platform"><select name="platform" className={inputCls}>{PLATFORMS.map((p) => <option key={p} value={p}>{PLATFORM_LABEL[p]}</option>)}</select></Field>
            <Field label="One per line: handle | what they posted"><textarea name="lines" rows={5} className={inputCls} placeholder={"@sam_fx | revenge traded after a loss\nlena.t | asking for a journal app"} /></Field>
            <button className={btnCls}>Add all</button>
          </form>
        </Card>
      </div>

      <Card title="Funnel (all prospects)">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-7">{f.map((s) => <div key={s.key}><p className="text-xs text-muted">{s.label}</p><p className="text-xl font-semibold">{s.n}</p><p className="text-xs text-muted">{s.rate === null ? "" : `${Math.round(s.rate * 100)}% of previous`}</p></div>)}</div>
        <p className="mt-2 text-xs text-muted">With small numbers these rates swing wildly — treat them as direction, not proof. Later stages update automatically for prospects whose signup email you’ve linked.</p>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <Link href="/outreach" className={`rounded-full border px-3 py-1 text-sm ${!sp.stage ? "border-accent text-accent" : "border-border text-muted"}`}>All</Link>
        {STAGES.map((s) => <Link key={s} href={`/outreach?stage=${s}`} className={`rounded-full border px-3 py-1 text-sm ${sp.stage === s ? "border-accent text-accent" : "border-border text-muted hover:text-fg"}`}>{STAGE_LABEL[s]}</Link>)}
        <form className="ml-auto flex gap-2">{sp.stage && <input type="hidden" name="stage" value={sp.stage} />}<input name="s" defaultValue={sp.s} placeholder="Search" className={`${inputCls} w-48`} /><button className={btnGhostCls}>Go</button></form>
      </div>
      <Table>
        <thead><tr><th className={th}>Prospect</th><th className={th}>Stage</th><th className={th}>What they posted</th><th className={th}>Last activity</th></tr></thead>
        <tbody className="divide-y divide-border">
          {rows.length === 0 && <tr><td className={td} colSpan={4}><span className="text-muted">Nobody here yet. Add the people you plan to message today.</span></td></tr>}
          {rows.map((p) => (
            <tr key={p.id}>
              <td className={td}><Link href={`/outreach/${p.id}`} className="font-medium hover:text-accent">@{p.handle}</Link><div className="text-xs text-muted">{PLATFORM_LABEL[p.platform]}{p.name ? ` · ${p.name}` : ""}{p.do_not_contact ? " · do not contact" : ""}</div></td>
              <td className={td}><Badge tone={stageTone(p.stage)}>{STAGE_LABEL[p.stage]}</Badge></td>
              <td className={`${td} max-w-xs truncate text-muted`}>{p.source_note ?? "—"}</td>
              <td className={td}>{fmtDateTime(p.last_touch, set.tz)}</td>
            </tr>))}
        </tbody>
      </Table>
    </>
  );
}
