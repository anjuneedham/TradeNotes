import Link from "next/link";
import { getContext } from "@/lib/app-context";
import { summarize, groupSummary } from "@/lib/metrics";
import { loadTrades, toExt, inRange, rangeStart, parseRange, RANGES, tagSummary, type StatRow } from "@/lib/trades-data";
import { signedMoney, pct, num, pnlClass } from "@/lib/format";
import { Notice, PageHeader, Segmented, EmptyState, btnCls, linkCls } from "@/components/ui";
import { Stat, Breakdown } from "@/components/stats";

export const metadata = { title: "Analytics — TradeNotes" };
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default async function Analytics({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { db, profile, scope } = await getContext();
  const range = parseRange((await searchParams).range);
  const cur = scope.currency;
  const showHelp = profile?.show_explanations ?? true;

  let rows: StatRow[] = [], truncated = false;
  try { ({ rows, truncated } = await loadTrades(db, scope.accountIds)); }
  catch (e) { console.error("analytics load failed", e); return <Notice kind="error">We couldn&apos;t load your trades just now. Please refresh. Your data is safe.</Notice>; }

  const ext = inRange(toExt(rows, cur), rangeStart(range));
  const s = summarize(ext);
  const header = (
    <PageHeader title="Analytics" sub="Where your results come from. Every table uses closed trades only.">
      <Segmented label="Date range" value={range} options={RANGES.map((r) => ({ ...r, href: r.value === "all" ? "/app/analytics" : `/app/analytics?range=${r.value}` }))} />
    </PageHeader>
  );

  if (s.tradeCount === 0) {
    return (
      <div className="space-y-5">
        {header}
        <EmptyState title={rows.length === 0 ? "No trades yet" : range === "all" ? "No closed trades yet" : "No closed trades in this period"}
          action={rows.length === 0 ? <Link href="/app/journal/new" className={btnCls}>Log your first trade</Link> : range !== "all" ? <Link href="/app/analytics" className={linkCls}>Show all time</Link> : undefined}>
          Breakdowns appear once at least one trade is fully closed.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {header}
      {truncated && <Notice kind="error">You have more than 10,000 trades. Statistics below use only the oldest 10,000 and are incomplete.</Notice>}
      {s.smallSample && <Notice kind="warn">Based on {s.tradeCount} closed trade{s.tradeCount === 1 ? "" : "s"}. Groups with fewer than 30 trades are marked * — treat differences between them as noise for now. <Link href="/learn#sample-size" className="underline underline-offset-2">Why?</Link></Notice>}

      <section aria-label="Totals for this period" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat show={showHelp} label="Net P&L" value={signedMoney(s.netPnl, cur)} cls={pnlClass(s.netPnl)} hint={`After ${signedMoney(-s.totalFees, cur)} in fees.`} />
        <Stat show={showHelp} label="Closed trades" value={String(s.tradeCount)} hint={`${s.wins}W / ${s.losses}L${s.breakevens ? ` / ${s.breakevens} breakeven` : ""}.`} />
        <Stat show={showHelp} label="Win rate" value={pct(s.winRate)} slug="win-rate" hint="Read it next to average win and loss." />
        <Stat show={showHelp} label="Average R" value={s.avgR === null ? "—" : `${num(s.avgR)}R`} slug="r-multiple" hint={`From ${s.rCoverage.withR} of ${s.rCoverage.total} trades with a stop.`} />
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        <Breakdown title="By strategy" groups={groupSummary(ext, (t) => t.strategy)} cur={cur} />
        <Breakdown title="By instrument" groups={groupSummary(ext, (t) => t.symbol)} cur={cur} />
        <Breakdown title="By session" groups={groupSummary(ext, (t) => t.session)} cur={cur} />
        <Breakdown title="By direction" groups={groupSummary(ext, (t) => cap(t.side))} cur={cur} />
        <Breakdown title="By weekday" note="UTC, by close time." groups={groupSummary(ext, (t) => (t.closedAt ? DAYS[new Date(t.closedAt).getUTCDay()] : null))} cur={cur} />
        <Breakdown id="mistakes" title="By mistake tag" note="Results of trades carrying each tag. A trade with several tags counts under each." groups={tagSummary(ext, (t) => t.mistakes)} cur={cur} />
        <Breakdown title="By emotion" note="Results of trades carrying each tag. A trade with several tags counts under each." groups={tagSummary(ext, (t) => t.emotions)} cur={cur} />
      </div>
      <p className="text-xs text-muted">* fewer than 30 trades in the group. Bars compare net P&amp;L within each table. Statistics describe your recorded past trades only and are not a prediction.</p>
    </div>
  );
}
