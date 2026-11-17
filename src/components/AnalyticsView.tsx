import Link from "next/link";
import type { ReactNode } from "react";
import { summarizeResults, groupResults, tagResults, type ExclusionReason } from "@/lib/metrics";
import type { ResultRow } from "@/lib/trades-data";
import { signedMoney, money, pct, num, pnlClass } from "@/lib/format";
import { localDayHour } from "@/lib/timezone";
import { Notice } from "./ui";
import { Stat, Breakdown } from "./stats";
import { RDistributionCard, HeatmapCard, MistakeCostCard, DrawdownCard, AdherenceCard } from "./AnalyticsExtra";
import { rDistribution, weekdayHourHeatmap, holdTimeBuckets, mistakeCost, drawdownDetail, profitFactorInfo, adherenceAnalysis, adherenceByStrategy } from "@/lib/analytics-extra";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * The analytics body (totals, risk, distributions, heatmap, breakdowns). Rendered by /app/analytics (real data) and /demo/analytics
 * (static sample data). Needs at least one closed trade: callers show their own empty state first.
 */
export function AnalyticsView({ header, rows, excluded, tz, cur, showHelp, learn = "/learn" }: {
  header: ReactNode; rows: ResultRow[]; excluded: Record<ExclusionReason, string[]>; tz: string; cur: string; showHelp: boolean; learn?: string;
}) {
  const s = summarizeResults(rows, excluded);
  const pf = profitFactorInfo(rows);
  const adherence = adherenceAnalysis(rows);
  return (
    <div className="space-y-5">
      {header}
      {s.smallSample && <Notice kind="warn">Based on {s.tradeCount} closed trade{s.tradeCount === 1 ? "" : "s"}. Groups with fewer than 30 trades are marked * — treat differences between them as noise for now. <Link href={`${learn}#sample-size`} className="underline underline-offset-2">Why?</Link></Notice>}

      <section aria-label="Totals for this period" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat show={showHelp} label="Net P&L" value={signedMoney(s.netPnl, cur)} cls={pnlClass(s.netPnl)} hint={`After ${signedMoney(-s.totalFees, cur)} in fees.`} />
        <Stat show={showHelp} label="Closed trades" value={String(s.tradeCount)} hint={`${s.wins}W / ${s.losses}L${s.breakevens ? ` / ${s.breakevens} breakeven` : ""}.`} />
        <Stat show={showHelp} label="Win rate" value={pct(s.winRate)} slug="win-rate" hint="Read it next to average win and loss." />
        <Stat show={showHelp} label="Average R" value={s.avgR === null ? "—" : `${num(s.avgR)}R`} slug="r-multiple" hint={`From ${s.rCoverage.withR} of ${s.rCoverage.total} trades with a stop.`} />
      </section>

      <section aria-label="Risk and consistency" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat show={showHelp} label="Profit factor" value={pf.value === null ? "—" : num(pf.value)} slug="profit-factor" hint={pf.value === null ? "Needs at least one losing trade." : `${money(pf.grossProfit, cur)} won ÷ ${money(Math.abs(pf.grossLoss), cur)} lost.`} />
        <Stat show={showHelp} label="Expectancy / trade" value={signedMoney(s.expectancy, cur)} cls={pnlClass(s.expectancy)} slug="expectancy" hint="Average result per closed trade." />
        <Stat show={showHelp} label="Max drawdown" value={money(s.maxDrawdown, cur)} cls={s.maxDrawdown > 0 ? "text-loss" : ""} slug="drawdown" hint="Largest drop from a peak." />
        <Stat show={showHelp} label="Longest streaks" value={`${s.maxWinStreak}W / ${s.maxLossStreak}L`} hint="Most wins and most losses in a row." />
      </section>
      {pf.message && <Notice kind="warn">Profit factor: {pf.message}</Notice>}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <RDistributionCard d={rDistribution(rows)} />
        <DrawdownCard d={drawdownDetail(rows)} cur={cur} />
        <HeatmapCard h={weekdayHourHeatmap(rows, tz)} tz={tz} cur={cur} />
        <Breakdown title="By time held" note="How long the trade lasted (entry to close). Shorter rows first." groups={Object.fromEntries(holdTimeBuckets(rows).buckets.map((b) => [b.label, b.summary]))} cur={cur} keepOrder />
        <MistakeCostCard m={mistakeCost(rows)} cur={cur} />
        {adherence.checked > 0 && <AdherenceCard a={adherence} byStrategy={adherenceByStrategy(rows)} cur={cur} />}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Breakdown title="By strategy" groups={groupResults(rows, (t) => t.strategy)} cur={cur} />
        <Breakdown title="By instrument" groups={groupResults(rows, (t) => t.symbol)} cur={cur} />
        <Breakdown title="By session" groups={groupResults(rows, (t) => t.session)} cur={cur} />
        <Breakdown title="By direction" groups={groupResults(rows, (t) => cap(t.side))} cur={cur} />
        <Breakdown title="By weekday" note={`By close time, ${tz}.`} groups={groupResults(rows, (t) => (t.closedAt ? DAYS[localDayHour(t.closedAt, tz).day] : null))} cur={cur} />
        <Breakdown title="By emotion" note="Results of trades carrying each tag. A trade with several tags counts under each." groups={tagResults(rows, (t) => t.emotions)} cur={cur} />
      </div>
      <p className="text-xs text-muted">* fewer than 30 trades in the group. Bars compare net P&amp;L within each table. Statistics describe your recorded past trades only and are not a prediction.</p>
    </div>
  );
}
