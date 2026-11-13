import Link from "next/link";
import type { ShareReport } from "@/lib/share";
import { money, signedMoney, pct, num, pnlClass } from "@/lib/format";
import { Card, Notice, btnCls } from "./ui";
import { Stat } from "./stats";
import EquityCurve from "./EquityCurve";

/** The public, read-only report. Built only from the ShareReport type (aggregates), so it has nothing private to show. */
export function ShareReportView({ r }: { r: ShareReport }) {
  const cur = r.currency;
  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-8 sm:py-12">
      <header>
        <p className="text-xs uppercase tracking-wide text-muted">Shared trading report · read-only</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Trading results summary</h1>
        <p className="mt-1 text-sm text-muted">{r.scopeLabel} · closed trades in {cur} · generated {r.generatedOn}</p>
      </header>
      <Notice>
        Totals only: no individual trades, notes, accounts or screenshots are shown. These figures were entered by the trader and are <strong className="font-medium">not verified</strong> by TradeNotes.
        Past results do not predict future results, and this is not financial advice.
      </Notice>
      {r.trades === 0 ? (
        <Card><p className="text-sm text-muted">No closed trades in this period yet.</p></Card>
      ) : (<>
        {r.smallSample && <Notice kind="warn">Based on {r.trades} closed trade{r.trades === 1 ? "" : "s"}. Under 30 trades, results are mostly luck.</Notice>}
        <section aria-label="Key figures" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat show={false} label="Closed trades" value={String(r.trades)} />
          <Stat show={false} label="Net P&L" value={signedMoney(r.netPnl, cur)} cls={pnlClass(r.netPnl)} />
          <Stat show={false} label="Win rate" value={pct(r.winRate)} />
          <Stat show={false} label="Profit factor" value={num(r.profitFactor)} />
          <Stat show={false} label="Expectancy / trade" value={signedMoney(r.expectancy, cur)} cls={pnlClass(r.expectancy)} />
          <Stat show={false} label="Average R" value={r.avgR === null ? "—" : `${num(r.avgR)}R`} />
          <Stat show={false} label="Max drawdown" value={money(r.maxDrawdown, cur)} cls={r.maxDrawdown > 0 ? "text-loss" : ""} />
          <Stat show={false} label="Longest streaks" value={`${r.maxWinStreak}W / ${r.maxLossStreak}L`} />
        </section>
        <Card>
          <h2 className="mb-4 text-sm font-medium">Equity curve <span className="font-normal text-muted">· cumulative net P&amp;L, {cur}, by trade number</span></h2>
          <EquityCurve points={r.curve.map((p) => ({ cumulative: p.cumulative, closedAt: null, n: p.n }))} total={r.curveTotal} currency={cur} />
        </Card>
        <p className="text-xs text-muted">{r.wins} winning, {r.losses} losing{r.breakevens ? `, ${r.breakevens} breakeven` : ""} trades. Average R uses the {r.rTrades} trades that had a stop. Profit factor needs at least one loss.</p>
      </>)}
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Keep a journal that shows what your results are made of.</p>
        <Link href="/signup" className={btnCls}>Try TradeNotes free</Link>
      </Card>
    </div>
  );
}
