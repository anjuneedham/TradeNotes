import Link from "next/link";
import { listContent } from "@/lib/content-data";
import { FORMATS, FORMAT_IDS, estimateSeconds } from "@/lib/content";
import { moveContent } from "@/app/actions/content";
import { Badge, Card, Flash, PageHeader, Progress, btnCls, btnGhostCls } from "@/components/ui";

export const metadata = { title: "Record session — HQ" };
const PER_FORMAT = 2;   // CONTENT_ENGINE §3: 10 recordings = 2 per format
export default async function RecordSession({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const sp = await searchParams;
  const approved = await listContent("approved"); const recorded = await listContent("recorded");
  const have = Object.fromEntries(FORMAT_IDS.map((f) => [f, approved.filter((i) => i.format === f).length + recorded.filter((i) => i.format === f).length]));
  const ready = approved.length + recorded.length;
  return (
    <>
      <PageHeader title="Record session" sub="The Sunday batch: 10 screen recordings + 10 voice-overs from approved scripts. Record on your own real data or SAMPLE DATA only.">
        <Link href="/content" className={btnGhostCls}>← Board</Link>
      </PageHeader>
      <Flash sp={sp} />
      <Card title={`Batch readiness — ${ready} / ${PER_FORMAT * FORMAT_IDS.length}`}>
        <Progress value={ready} max={PER_FORMAT * FORMAT_IDS.length} />
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">{FORMAT_IDS.map((f) => <div key={f} className="text-sm"><p className="font-medium">{f} · {FORMATS[f].name}</p><p className={have[f] >= PER_FORMAT ? "text-win" : "text-warn"}>{have[f]} / {PER_FORMAT} approved</p></div>)}</div>
        <p className="mt-3 text-xs text-muted">Short on approved scripts? Open the board, finish the checklist on scripted items, approve, then come back.</p>
      </Card>
      <Card title="Checklist before you hit record">
        <ul className="list-inside list-disc space-y-1 text-sm text-muted"><li>Quiet room, phone mic ~15 cm away; 9:16, 1080×1920.</li><li>Demo footage labelled “SAMPLE DATA · NOT REAL TRADES” unless it’s your real data (hide real names).</li><li>“Not financial advice.” in small on-screen text on every video.</li><li>Only show features that exist today.</li></ul>
      </Card>
      <Card title={`Record queue (${approved.length})`}>
        {approved.length === 0 ? <p className="text-sm text-muted">Nothing approved yet.</p> : (
          <ul className="divide-y divide-border">{approved.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
              <div className="min-w-0"><Link href={`/content/${i.id}`} className="font-medium hover:text-accent">{i.title}</Link><div className="mt-1 flex gap-2"><Badge tone="accent">{i.format}</Badge><Badge>~{estimateSeconds(i.voiceover)}s</Badge></div></div>
              <div className="flex gap-2"><Link href={`/prompter/${i.id}`} target="_blank" className={btnGhostCls}>Teleprompter</Link>
                <form action={moveContent}><input type="hidden" name="id" value={i.id} /><input type="hidden" name="to" value="recorded" /><input type="hidden" name="back" value="/content/record" /><button className={btnCls}>Mark recorded</button></form></div>
            </li>))}</ul>)}
      </Card>
      {recorded.length > 0 && <Card title={`Recorded — waiting for edit (${recorded.length})`}><ul className="space-y-1 text-sm">{recorded.map((i) => <li key={i.id}><Link href={`/content/${i.id}`} className="hover:text-accent">{i.title}</Link> <Badge>{i.format}</Badge></li>)}</ul>
        <p className="mt-2 text-xs text-muted">Editing: captions auto-generated then fixed by hand (CapCut or Descript). Use the Caption tool to check line lengths.</p></Card>}
    </>
  );
}
