import Link from "next/link";
import { postsWithFormat } from "@/lib/content-data";
import { FORMATS, MIN_POSTS_TO_JUDGE, rollupFormats } from "@/lib/content";
import { pct } from "@/lib/report";
import { updatePost } from "@/app/actions/content";
import { Badge, Card, Flash, PageHeader, Table, btnGhostCls, btnSmCls, fmtDateTime, td, th } from "@/components/ui";

export const metadata = { title: "Content performance — HQ" };
const VERDICT = { double_down: ["Double down", "good"], review: ["Review / consider cutting", "bad"], keep: ["Keep", "muted"], too_early: ["Too early", "muted"] } as const;
export default async function Performance({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const sp = await searchParams; const posts = await postsWithFormat();
  const rows = rollupFormats(posts.filter((p) => p.format).map((p) => ({ format: p.format!, views: p.views, view_rate_3s: p.view_rate_3s, avg_watch_pct: p.avg_watch_pct, saves: p.saves, link_clicks: p.link_clicks, signups: p.signups })));
  return (
    <>
      <PageHeader title="Content performance" sub={`Friday review. Playbook rule: after ${MIN_POSTS_TO_JUDGE} posts, kill formats with weak hooks and double down on the top 2. Hook strength here = average 3-second view rate.`}><Link href="/content" className={btnGhostCls}>← Board</Link></PageHeader>
      <Flash sp={sp} />
      <Table>
        <thead><tr><th className={th}>Format</th><th className={th}>Posts</th><th className={th}>Views</th><th className={th}>3s view</th><th className={th}>Avg watch</th><th className={th}>Save rate</th><th className={th}>Click rate</th><th className={th}>Signups</th><th className={th}>Verdict</th></tr></thead>
        <tbody className="divide-y divide-border">{rows.map((r) => (
          <tr key={r.format}><td className={td}>{r.format} · {FORMATS[r.format as keyof typeof FORMATS].name}</td><td className={td}>{r.posts}</td><td className={td}>{r.views.toLocaleString()}</td><td className={td}>{r.rate3s === null ? "—" : `${r.rate3s.toFixed(1)}%`}</td><td className={td}>{r.watch === null ? "—" : `${r.watch.toFixed(1)}%`}</td><td className={td}>{pct(r.saveRate, 1)}</td><td className={td}>{pct(r.clickRate, 2)}</td><td className={td}>{r.signups}</td>
            <td className={td}><Badge tone={VERDICT[r.verdict][1]}>{VERDICT[r.verdict][0]}</Badge></td></tr>))}</tbody>
      </Table>
      <p className="text-xs text-muted">These are a heuristic to focus your attention, not statistics. Low view counts make rankings noisy; “review” means look at the hooks, not automatically delete the format.</p>
      <Card title="All posts">
        {posts.length === 0 ? <p className="text-sm text-muted">No posts logged yet. Log them from the content item page.</p> : (
          <div className="space-y-2">{posts.slice(0, 60).map((p) => (
            <form key={p.id} action={updatePost} className="flex flex-wrap items-end gap-2 text-sm">
              <input type="hidden" name="post_id" value={p.id} /><input type="hidden" name="url" value={p.url ?? ""} /><input type="hidden" name="back" value="/content/performance" />
              <div className="w-56"><Badge tone="accent">{p.platform}</Badge> {p.content_id ? <Link href={`/content/${p.content_id}`} className="hover:text-accent">#{p.code} {p.title?.slice(0, 28)}</Link> : "—"}<div className="text-xs text-muted">{fmtDateTime(p.posted_at)}</div></div>
              {([["views", "Views", p.views], ["view_rate_3s", "3s %", p.view_rate_3s], ["avg_watch_pct", "Watch %", p.avg_watch_pct], ["saves", "Saves", p.saves], ["link_clicks", "Clicks", p.link_clicks], ["signups", "Signups", p.signups]] as [string, string, number | null][]).map(([k, l, v]) =>
                <label key={k} className="text-xs text-muted">{l}<input name={k} type="number" step="any" min={0} defaultValue={v ?? ""} className="mt-1 block w-20 rounded-md border border-border bg-bg px-2 py-1 text-sm" /></label>)}
              <button className={btnSmCls}>Update</button>
            </form>))}</div>)}
      </Card>
    </>
  );
}
