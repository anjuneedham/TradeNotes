import { getContext } from "@/lib/app-context";
import { summarize, groupSummary } from "@/lib/metrics";
import { closedTrades, byEntryHour, byHoldTime, rDistribution, tagImpact, planAdherence, R_BUCKETS, type Bucket } from "@/lib/analytics";
import { loadJournalTrades } from "@/lib/load-trades";
import { PLANS } from "@/lib/plans";
import { Card, Locked, SectionTitle, Badge } from "@/components/ui";
import { PnlBars, Histogram } from "@/components/Charts";
import { money, pct } from "@/lib/format";

export const metadata = { title: "Reports — TradeNotes" };

const SAMPLE: Bucket[] = [
  { label: "London", trades: 14, pnl: 820, winRate: 0.6 }, { label: "New York", trades: 11, pnl: 310, winRate: 0.5 },
  { label: "Moved stop", trades: 6, pnl: -540, winRate: 0.2 }, { label: "FOMO", trades: 5, pnl: -380, winRate: 0.2 },
];

export default async function Reports() {
  const { db, accounts, plan } = await getContext();
  const cur = accounts[0]?.currency ?? "USD";
  if (!PLANS[plan].reports) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold">Reports</h1>
        <Locked plan="Starter" title="Find out exactly where your money goes" teaser="P&L by hour, hold time, setup, mistake and emotion — plus your R-multiple distribution and the dollar cost of breaking your plan.">
          <div className="grid gap-4 md:grid-cols-2"><Card><PnlBars data={SAMPLE} cur={cur} /></Card><Card><Histogram data={R_BUCKETS.map((l, i) => ({ label: l, count: [1, 3, 6, 5, 4, 2, 1][i] }))} /></Card></div>
        </Locked>
      </div>
    );
  }

  const { trades } = await loadJournalTrades(db, cur);
  const ts = closedTrades(trades);
  if (ts.length === 0) return <div className="space-y-4"><h1 className="text-3xl font-semibold">Reports</h1><Card><p className="text-sm text-muted">Reports appear after your first closed trade.</p></Card></div>;

  const toBuckets = (g: ReturnType<typeof groupSummary>) => Object.entries(g).map(([label, s]) => ({ label, trades: s.tradeCount, pnl: s.netPnl, winRate: s.winRate ?? 0 })).sort((a, b) => b.pnl - a.pnl);
  const mistakes = tagImpact(ts, "mistakes"), emotions = tagImpact(ts, "emotions");
  const pa = planAdherence(ts);
  const mistakeCost = mistakes.filter((m) => m.pnl < 0).reduce((s, m) => s + m.pnl, 0);
  const longs = summarize(trades.filter((t) => t.side === "long")), shorts = summarize(trades.filter((t) => t.side === "short"));
  const pro = plan === "pro";

  return (
    <div className="space-y-5">
      <div className="anim-fade-up flex flex-wrap items-end justify-between gap-2">
        <div><h1 className="text-3xl font-semibold">Reports</h1><p className="text-sm text-muted">{ts.length} closed trades analysed. Times are UTC.</p></div>
        {mistakeCost < 0 && <Badge tone="loss">Tagged mistakes cost you {money(Math.abs(mistakeCost), cur)}</Badge>}
      </div>

      <div className="stagger grid gap-4 md:grid-cols-2">
        <Card><SectionTitle sub="Net P&L of trades carrying each tag">Mistakes — what they cost</SectionTitle><PnlBars data={mistakes} cur={cur} /></Card>
        <Card><SectionTitle sub="How your state of mind shows up in results">Emotions</SectionTitle><PnlBars data={emotions} cur={cur} /></Card>
        <Card><SectionTitle sub="By entry time">Time of day</SectionTitle><PnlBars data={byEntryHour(ts)} cur={cur} /></Card>
        <Card><SectionTitle sub="Time from entry to final exit">Hold time</SectionTitle><PnlBars data={byHoldTime(ts)} cur={cur} /></Card>
        <Card><SectionTitle sub="Distribution of trade results in R (trades with a stop)">R-multiple distribution</SectionTitle>
          <Histogram data={rDistribution(ts)} colorFor={(l) => (l.startsWith("-") || l.startsWith("≤") ? "var(--loss)" : "var(--win)")} /></Card>
        <Card><SectionTitle sub="Did you follow your plan?">Plan adherence</SectionTitle>
          {pa.followed + pa.broke === 0 ? <p className="text-sm text-muted">Mark “followed plan” on your trades to see this.</p> : (
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-lg bg-win/10 p-4"><p className="text-xs text-muted">Followed ({pa.followed})</p><p className="text-xl font-semibold text-win">{money(pa.avgFollowed, cur)}</p><p className="text-[11px] text-muted">avg per trade</p></div>
              <div className="rounded-lg bg-loss/10 p-4"><p className="text-xs text-muted">Broken ({pa.broke})</p><p className="text-xl font-semibold text-loss">{money(pa.avgBroke, cur)}</p><p className="text-[11px] text-muted">avg per trade</p></div>
            </div>)}
        </Card>
        <Card><SectionTitle>By setup / strategy</SectionTitle><PnlBars data={toBuckets(groupSummary(trades, (t) => t.strategy))} cur={cur} /></Card>
        <Card><SectionTitle>By instrument</SectionTitle><PnlBars data={toBuckets(groupSummary(trades, (t) => t.symbol)).slice(0, 12)} cur={cur} /></Card>
        <Card><SectionTitle>Long vs short</SectionTitle>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {([["Long", longs], ["Short", shorts]] as const).map(([l, x]) => (
              <div key={l} className="rounded-lg bg-panel-2 p-3"><p className="font-medium">{l}</p><p className="text-xs text-muted">{x.tradeCount} trades · {pct(x.winRate)} win</p><p className={`mt-1 font-semibold ${x.netPnl >= 0 ? "text-win" : "text-loss"}`}>{money(x.netPnl, cur)}</p></div>
            ))}
          </div>
        </Card>
        {!pro && (
          <Locked plan="Pro" title="Ask the AI Coach to explain these charts" teaser="Pro members get an AI coach that reads these reports and tells you the one change most likely to improve your results.">
            <Card><p className="text-sm">“Your FOMO trades lose 80% of the time and your 13:00 entries are your worst hour. Next week, try…”</p></Card>
          </Locked>
        )}
      </div>
      <p className="text-xs text-muted">Statistics describe your recorded past trades only and are not financial advice or a prediction.</p>
    </div>
  );
}
