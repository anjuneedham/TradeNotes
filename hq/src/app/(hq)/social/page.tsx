import { q } from "@/lib/db";
import { listCustomers, paying } from "@/lib/customers";
import { getSettings } from "@/lib/settings";
import { buildTag, cpc, decide, PLACEMENTS, platformOfTag, shouldPauseAd, PAUSE_RULE } from "@/lib/social";
import { todayIn } from "@/lib/snapshot";
import { deleteAd, logAd, logFollowers, saveAccount } from "@/app/actions/social";
import CopyButton from "@/components/CopyButton";
import { Badge, Card, Field, Flash, Notice, PageHeader, Table, btnCls, btnSmCls, inputCls, money, td, th } from "@/components/ui";

export const metadata = { title: "Social & ads — HQ" };
const PLATS = [["tiktok", "TikTok", "tt"], ["youtube", "YouTube Shorts", "yt"], ["instagram", "Instagram", "ig"]] as const;

export default async function Social({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string; p?: string; place?: string; v?: string }> }) {
  const sp = await searchParams; const set = await getSettings(); const today = todayIn(set.tz);
  const [accounts, snaps, ads, cs, posts, dm] = await Promise.all([
    q<{ platform: string; handle: string | null; profile_url: string | null }>("select platform, handle, profile_url from hq.social_accounts"),
    q<{ platform: string; day: string; followers: number }>("select platform, day, followers from hq.follower_snapshots order by day desc"),
    q<{ id: string; day: string; platform: string; spend: number; impressions: number; clicks: number; note: string | null }>("select id, day, platform, spend, impressions, clicks, note from hq.ad_spend order by day desc limit 30"),
    listCustomers(false),
    q<{ platform: string; n: number; views: number; clicks: number }>("select platform, count(*)::int n, coalesce(sum(views),0)::int views, coalesce(sum(link_clicks),0)::int clicks from hq.posts group by 1"),
    q<{ platform: string; sent: number; replied: number; interested: number }>(`select p.platform, count(*) filter (where exists (select 1 from hq.touches t where t.prospect_id=p.id and t.kind in ('dm','followup')))::int sent,
      count(*) filter (where exists (select 1 from hq.touches t where t.prospect_id=p.id and t.kind='reply'))::int replied, count(*) filter (where p.stage in ('interested','signed_up','activated','paying'))::int interested from hq.prospects p group by 1`),
  ]);
  const prefix = ["tt", "yt", "ig"].includes(sp.p ?? "") ? sp.p! : "tt";
  const built = buildTag(prefix, PLACEMENTS.includes((sp.place ?? "organic") as never) ? (sp.place ?? "organic") : "organic", sp.v);
  const link = built.tag ? `${set.site_url}/?src=${built.tag}` : null;
  const sc = (plat: "tiktok" | "instagram") => {
    const mine = cs.filter((c) => platformOfTag(c.signup_source) === plat);
    return { signups: mine.length, activated: mine.filter((c) => c.trades > 0).length, paid: mine.filter((c) => paying(c)).length };
  };
  const tt = sc("tiktok"), ig = sc("instagram"); const verdict = decide(tt.activated, ig.activated);
  const adIg = ads.filter((a) => a.platform === "instagram"); const adSpend = adIg.reduce((a, r) => a + r.spend, 0); const adClicks = adIg.reduce((a, r) => a + r.clicks, 0);
  const adSignups = cs.filter((c) => c.signup_source === "ig-ad").length;
  const get = <T extends { platform: string }>(rows: T[], p: string) => rows.find((r) => r.platform === p);
  const untagged = cs.filter((c) => !c.signup_source).length;
  return (
    <>
      <PageHeader title="Social & ads" sub="Account basics, tagged links, follower snapshots, the $50 Instagram test and the TikTok-vs-Instagram scorecard (docs/PAID_TEST.md). Nothing here posts for you." />
      <Flash sp={sp} />
      <Card title="Tagged link builder">
        <form className="flex flex-wrap items-end gap-3">
          <Field label="Platform"><select name="p" defaultValue={prefix} className={inputCls}>{PLATS.map(([, l, pf]) => <option key={pf} value={pf}>{l}</option>)}</select></Field>
          <Field label="Where"><select name="place" defaultValue={sp.place ?? "organic"} className={inputCls}>{PLACEMENTS.map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Video # (optional)"><input name="v" defaultValue={sp.v} className={`${inputCls} w-28`} placeholder="e.g. 12" /></Field>
          <button className={btnCls}>Build</button>
        </form>
        <div className="mt-3 flex flex-wrap items-center gap-3">{link ? <><code className="rounded bg-bg px-2 py-1 text-sm">{link}</code><CopyButton text={link} /></> : <span className="text-sm text-loss">{built.error}</span>}</div>
        <p className="mt-2 text-xs text-muted">The customer app saves the first tag a visitor arrives with. Bio links: <code>tt-organic</code>, <code>ig-organic</code>. DMs: <code>tt-dm</code>, <code>ig-dm</code>. Ad: <code>ig-ad</code>.{untagged > 0 && ` ${untagged} signup(s) have no source.`}</p>
      </Card>

      <Card title="Scorecard — TikTok vs Instagram">
        <Table>
          <thead><tr><th className={th}>Signal</th><th className={th}>TikTok (organic + DMs)</th><th className={th}>Instagram (organic + DMs + ad)</th></tr></thead>
          <tbody className="divide-y divide-border text-sm">
            <tr><td className={td}>Posts / views logged</td><td className={td}>{get(posts, "tiktok")?.n ?? 0} / {(get(posts, "tiktok")?.views ?? 0).toLocaleString()}</td><td className={td}>{get(posts, "instagram")?.n ?? 0} / {(get(posts, "instagram")?.views ?? 0).toLocaleString()}</td></tr>
            <tr><td className={td}>Link clicks (from posts)</td><td className={td}>{get(posts, "tiktok")?.clicks ?? 0}</td><td className={td}>{get(posts, "instagram")?.clicks ?? 0}</td></tr>
            <tr><td className={td}>DMs sent / replies / interested</td><td className={td}>{get(dm, "tiktok")?.sent ?? 0} / {get(dm, "tiktok")?.replied ?? 0} / {get(dm, "tiktok")?.interested ?? 0}</td><td className={td}>{get(dm, "instagram")?.sent ?? 0} / {get(dm, "instagram")?.replied ?? 0} / {get(dm, "instagram")?.interested ?? 0}</td></tr>
            <tr><td className={td}>Signups (tag prefix)</td><td className={td}>{tt.signups}</td><td className={td}>{ig.signups}</td></tr>
            <tr><td className={`${td} font-medium`}>Signups who logged a trade</td><td className={`${td} font-medium`}>{tt.activated}</td><td className={`${td} font-medium`}>{ig.activated}</td></tr>
            <tr><td className={td}>Paid conversions</td><td className={td}>{tt.paid}</td><td className={td}>{ig.paid}</td></tr>
            <tr><td className={td}>Ad spend / clicks / CPC / cost per signup</td><td className={td}>n/a</td><td className={td}>{money(adSpend)} / {adClicks} / {cpc(adSpend, adClicks) === null ? "—" : money(cpc(adSpend, adClicks)!)} / {adSignups ? money(adSpend / adSignups) : "—"}</td></tr>
          </tbody>
        </Table>
        <div className="mt-3"><Notice kind={verdict.winner ? "ok" : "info"}>Day-5 rule: {verdict.text}</Notice></div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Instagram ad log ($50 test)">
          {shouldPauseAd(adSpend, adClicks) && <div className="mb-3"><Notice kind="error">Guardrail: ${PAUSE_RULE.spend} spent with zero clicks — pause the ad and look at the creative/audience.</Notice></div>}
          <form action={logAd} className="grid grid-cols-2 gap-2">
            <Field label="Day"><input type="date" name="day" defaultValue={today} className={inputCls} /></Field>
            <Field label="Platform"><select name="platform" className={inputCls}><option value="instagram">Instagram</option><option value="tiktok">TikTok</option><option value="other">Other</option></select></Field>
            <Field label="Spend $"><input name="spend" type="number" step="0.01" min={0} required className={inputCls} /></Field>
            <Field label="Clicks"><input name="clicks" type="number" min={0} defaultValue={0} className={inputCls} /></Field>
            <Field label="Impressions"><input name="impressions" type="number" min={0} defaultValue={0} className={inputCls} /></Field>
            <Field label="Note"><input name="note" className={inputCls} /></Field>
            <div className="col-span-2"><button className={btnCls}>Save day</button></div>
          </form>
          <ul className="mt-3 space-y-1 text-sm">{ads.map((a) => <li key={a.id} className="flex items-center justify-between"><span>{a.day} · {a.platform} · {money(a.spend)} · {a.clicks} clicks{a.note ? ` · ${a.note}` : ""}</span><form action={deleteAd}><input type="hidden" name="id" value={a.id} /><button className={btnSmCls}>×</button></form></li>)}</ul>
        </Card>
        <Card title="Accounts & followers">
          <div className="space-y-4">{PLATS.map(([pl, label]) => {
            const acc = get(accounts, pl); const rows = snaps.filter((s) => s.platform === pl); const latest = rows[0]; const week = rows.find((s) => new Date(s.day) <= new Date(Date.now() - 6 * 86_400_000));
            return (
              <div key={pl} className="rounded-md border border-border p-3 text-sm">
                <div className="mb-2 flex items-center justify-between"><strong>{label}</strong>{latest && <Badge>{latest.followers.toLocaleString()} followers{week ? ` (${latest.followers - week.followers >= 0 ? "+" : ""}${latest.followers - week.followers} / wk)` : ""}</Badge>}</div>
                <form action={saveAccount} className="flex flex-wrap gap-2"><input type="hidden" name="platform" value={pl} /><input name="handle" defaultValue={acc?.handle ?? ""} placeholder="@handle" className={`${inputCls} w-36`} /><input name="profile_url" defaultValue={acc?.profile_url ?? ""} placeholder="Profile URL" className={`${inputCls} w-48`} /><button className={btnSmCls}>Save</button></form>
                <form action={logFollowers} className="mt-2 flex flex-wrap gap-2"><input type="hidden" name="platform" value={pl} /><input type="hidden" name="day" value={today} /><input name="followers" type="number" min={0} placeholder="Followers today" className={`${inputCls} w-36`} /><button className={btnSmCls}>Log count</button></form>
              </div>);
          })}</div>
        </Card>
      </div>
    </>
  );
}
