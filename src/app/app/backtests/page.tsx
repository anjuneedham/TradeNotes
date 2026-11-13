import Link from "next/link";
import { getContext } from "@/lib/app-context";
import { PLANS } from "@/lib/plans";
import { summarizeBacktests, backtestResult, MAX_BACKTESTS, BACKTEST_CORE_COLS, type BacktestCore } from "@/lib/backtest";
import { downsampleCurve } from "@/lib/curve";
import { money, signedMoney, signedR, pct, num, pnlClass, shortDate } from "@/lib/format";
import { Card, Notice, Badge, PageHeader, EmptyState, btnCls, btnGhostCls, linkCls, inputCls } from "@/components/ui";
import { Stat } from "@/components/stats";
import EquityCurve from "@/components/EquityCurve";
import { HypotheticalBanner } from "@/components/Hypothetical";
import { UpgradeNotice } from "@/components/UpgradeNotice";

export const metadata = { title: "Backtests — TradeNotes" };

export default async function Backtests({ searchParams }: { searchParams: Promise<{ saved?: string; deleted?: string; strategy?: string | string[] }> }) {
  const ctx = await getContext();
  const { db, plan, profile } = ctx;
  const sp = await searchParams;
  const canWrite = PLANS[plan].backtesting;
  const cur = ctx.accounts[0]?.currency ?? "USD"; // a label only: hypothetical results are not converted
  const showHelp = profile?.show_explanations ?? true;
  const wanted = (Array.isArray(sp.strategy) ? sp.strategy[0] : sp.strategy)?.trim().slice(0, 60) || null;

  // Plan gate on the server. A plan without the log loads nothing unless the user already has hypothetical trades (they stay readable after a downgrade).
  const all = canWrite || (await db((q) => q<{ n: number }>("select count(*)::int as n from tradenotes.backtest_trades")))[0].n > 0
    ? await db((q) => q<BacktestCore>(`select ${BACKTEST_CORE_COLS} from tradenotes.backtest_trades order by opened_at, id`))
    : null;
  if (all === null) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <PageHeader title="Backtests" sub="Test an idea on paper before you risk money." />
        <UpgradeNotice feature="The manual backtest log" tier="premium">Log hypothetical trades by hand, with the same fields and the same metrics as your journal, kept completely apart from your real results and always labelled as hypothetical.</UpgradeNotice>
      </div>
    );
  }
  const strategies = [...new Set(all.map((r) => r.strategy).filter((x): x is string => Boolean(x)))].sort((a, b) => a.localeCompare(b));
  const rows = wanted ? all.filter((r) => r.strategy === wanted) : all;
  const s = summarizeBacktests(rows);
  const open = s.excluded.open_or_partial.length + s.excluded.invalid.length;

  return (
    <div className="space-y-5">
      <PageHeader title="Backtests" sub={<>{all.length} hypothetical trade{all.length === 1 ? "" : "s"} · {s.tradeCount} closed{wanted ? <> · setup “{wanted}”</> : null}</>}>
        {canWrite && <Link href="/app/backtests/new" className={btnCls}>Log hypothetical trade</Link>}
        {all.length > 0 && <a href="/app/backtests/export" download className={btnGhostCls}>Export CSV</a>}
      </PageHeader>
      <HypotheticalBanner />
      {sp.saved && <Notice kind="ok">Hypothetical trade saved.</Notice>}
      {sp.deleted && <Notice kind="ok">Hypothetical trade deleted.</Notice>}
      {!canWrite && <UpgradeNotice feature="Adding and editing hypothetical trades" tier="premium">Your existing entries stay readable, exportable and deletable.</UpgradeNotice>}

      {all.length === 0 ? (
        <EmptyState title="No hypothetical trades yet" action={canWrite ? <Link href="/app/backtests/new" className={btnCls}>Log your first hypothetical trade</Link> : undefined}>
          Walk a chart by hand, write down the entries you would have taken, and see what the numbers say. Nothing here touches your real journal.
        </EmptyState>
      ) : (<>
        {strategies.length > 0 && (
          <form method="get" className="flex flex-wrap items-end gap-2">
            <label className="text-sm"><span className="mb-1 block text-xs text-muted">Setup</span>
              <select name="strategy" defaultValue={wanted ?? ""} className={`${inputCls} sm:w-60`}><option value="">All setups</option>{strategies.map((x) => <option key={x}>{x}</option>)}</select></label>
            <button className={btnGhostCls}>Apply</button>
            {wanted && <Link href="/app/backtests" className={`${linkCls} pb-2 text-sm`}>Reset</Link>}
          </form>
        )}
        {open > 0 && <Notice>{open} hypothetical trade{open === 1 ? " is" : "s are"} not fully closed and not counted in the figures below.</Notice>}
        {s.tradeCount === 0 ? <Card><p className="text-sm text-muted">Figures appear once at least one hypothetical trade is fully closed.</p></Card> : (<>
          {s.smallSample && <Notice kind="warn">Based on {s.tradeCount} closed hypothetical trade{s.tradeCount === 1 ? "" : "s"}. Under 30 trades, results are mostly luck, and a backtest on a few trades proves nothing. <Link href="/learn#sample-size" className="underline underline-offset-2">Why?</Link></Notice>}
          <section aria-label="Hypothetical key figures" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat show={showHelp} label="Hypothetical net result" value={signedMoney(s.netPnl, cur)} cls={pnlClass(s.netPnl)} hint="Total after the fees you entered. Not real money." />
            <Stat show={showHelp} label="Win rate" value={pct(s.winRate)} slug="win-rate" hint={`${s.wins}W / ${s.losses}L${s.breakevens ? ` / ${s.breakevens} breakeven` : ""}.`} />
            <Stat show={showHelp} label="Profit factor" value={num(s.profitFactor)} slug="profit-factor" hint={s.profitFactor === null ? "Needs at least one losing trade." : "Above 1.0 = winners outweigh losers."} />
            <Stat show={showHelp} label="Expectancy / trade" value={signedMoney(s.expectancy, cur)} cls={pnlClass(s.expectancy)} slug="expectancy" hint="Average hypothetical result per trade." />
            <Stat show={showHelp} label="Average win" value={signedMoney(s.avgWin, cur)} cls={s.avgWin === null ? "" : "text-win"} />
            <Stat show={showHelp} label="Average loss" value={money(s.avgLoss, cur)} cls={s.avgLoss === null ? "" : "text-loss"} />
            <Stat show={showHelp} label="Average R" value={s.avgR === null ? "—" : `${num(s.avgR)}R`} slug="r-multiple" hint={`From ${s.rCoverage.withR} of ${s.rCoverage.total} trades with a stop.`} />
            <Stat show={showHelp} label="Max drawdown" value={money(s.maxDrawdown, cur)} cls={s.maxDrawdown > 0 ? "text-loss" : ""} slug="drawdown" hint="Largest drop from a peak." />
          </section>
          <Card>
            <h2 className="mb-4 text-sm font-medium">Hypothetical equity curve <span className="font-normal text-muted">· cumulative, {cur}, not real money</span></h2>
            <EquityCurve points={downsampleCurve(s.equityCurve)} total={s.equityCurve.length} currency={cur} />
          </Card>
        </>)}

        <Card className="!p-0">
          <h2 className="px-4 pt-4 text-sm font-medium sm:px-5">Hypothetical trades</h2>
          <ul className="mt-2 divide-y divide-border text-sm">
            {[...rows].reverse().slice(0, 200).map((r) => {
              const res = backtestResult(r);
              const closed = typeof res !== "string";
              return (
                <li key={r.id}><Link href={`/app/backtests/${r.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-raised/60 sm:px-5">
                  <span className="w-20 shrink-0 text-xs text-muted">{shortDate(r.opened_at).replace(/ \d{4}$/, "")}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{r.symbol} <span className="font-normal capitalize text-muted">· {r.side}{r.strategy ? ` · ${r.strategy}` : ""}</span> <Badge tone="warn">Hypothetical</Badge></span>
                  <span className="fig hidden w-16 text-right text-muted sm:block">{closed ? signedR(res.r) : ""}</span>
                  <span className={`fig w-28 text-right ${closed ? pnlClass(res.netPnl) : "text-muted"}`}>{closed ? signedMoney(res.netPnl, cur) : "Open"}</span>
                </Link></li>
              );
            })}
          </ul>
          {rows.length > 200 && <p className="px-4 pb-4 text-xs text-muted sm:px-5">Showing the latest 200 of {rows.length}. The export has all of them.</p>}
        </Card>
      </>)}
      <p className="text-xs text-muted">Keep up to {MAX_BACKTESTS.toLocaleString("en-US")} hypothetical trades. Hypothetical results are not real trades and do not reflect slippage, fees you did not enter, or how you would have felt. They are not a prediction.</p>
    </div>
  );
}
