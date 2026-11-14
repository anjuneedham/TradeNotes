import { q } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { snapshotFor, todayIn } from "@/lib/snapshot";
import { reportText, type Snapshot } from "@/lib/report";
import { goToDay, saveReport } from "@/app/actions/misc";
import CopyButton from "@/components/CopyButton";
import { Card, Field, Flash, PageHeader, btnCls, btnGhostCls, inputCls } from "@/components/ui";

export const metadata = { title: "Reports — HQ" };
export default async function Reports({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string; day?: string }> }) {
  const sp = await searchParams; const set = await getSettings(); const today = todayIn(set.tz);
  const day = /^\d{4}-\d{2}-\d{2}$/.test(sp.day ?? "") ? sp.day! : today;
  const [saved] = await q<{ blockers: string | null; bugs: string | null; notes: string | null; snapshot: Snapshot }>("select blockers, bugs, notes, snapshot from hq.daily_reports where day = $1", [day]);
  const live = await snapshotFor(day, set.tz);
  // Totals like paying/MRR are "as of now"; for a past day with a saved report show what was saved then.
  const snap = saved && day !== today ? saved.snapshot : live;
  const text = reportText(snap, { blockers: saved?.blockers, bugs: saved?.bugs, notes: saved?.notes });
  const history = await q<{ day: string; snapshot: Snapshot }>("select day, snapshot from hq.daily_reports order by day desc limit 14");
  return (
    <>
      <PageHeader title="Daily report" sub="The evening report from docs/DAILY_OPERATIONS.md, built from real data. Add blockers and bugs, save, copy.">
        <form action={goToDay} className="flex gap-2"><input type="date" name="day" defaultValue={day} className={inputCls} /><button className={btnGhostCls}>Go</button></form>
      </PageHeader>
      <Flash sp={sp} />
      <div className="grid gap-4 md:grid-cols-2">
        <Card title={`Report — ${day}`} action={<CopyButton text={text} label="Copy report" />}>
          <pre className="whitespace-pre-wrap text-sm leading-relaxed">{text}</pre>
          <p className="mt-3 text-xs text-muted">Paying/MRR/activation are totals as recorded in HQ at the time; DMs, posts and ad numbers are for the day. Posts and ad spend only count what you logged.</p>
        </Card>
        <Card title="Your notes for the day">
          <form action={saveReport} className="space-y-3"><input type="hidden" name="day" value={day} /><input type="hidden" name="tz" value={set.tz} />
            <Field label="Bugs / feedback to act on"><textarea name="bugs" rows={3} defaultValue={saved?.bugs ?? ""} className={inputCls} /></Field>
            <Field label="Blockers"><textarea name="blockers" rows={3} defaultValue={saved?.blockers ?? ""} className={inputCls} /></Field>
            <Field label="Other notes / what I’d change"><textarea name="notes" rows={3} defaultValue={saved?.notes ?? ""} className={inputCls} /></Field>
            <button className={btnCls}>Save report</button></form>
        </Card>
      </div>
      <Card title="Saved reports">{history.length === 0 ? <p className="text-sm text-muted">None saved yet.</p> : <ul className="space-y-1 text-sm">{history.map((h) => <li key={h.day}><a className="hover:text-accent" href={`/reports?day=${h.day}`}>{h.day}</a> <span className="text-muted">· {h.snapshot.signups} signups · {h.snapshot.paying} paying · DMs {h.snapshot.dms.tiktok + h.snapshot.dms.instagram} · posts {h.snapshot.posts.tiktok + h.snapshot.posts.youtube + h.snapshot.posts.instagram}</span></li>)}</ul>}</Card>
    </>
  );
}
