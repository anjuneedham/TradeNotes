import Link from "next/link";
import { getContext, scopeFor } from "@/lib/app-context";
import { PLANS } from "@/lib/plans";
import { parseFilters, withKnownAccount, dateLabel } from "@/lib/filters";
import { loadResults, loadFilterOptions } from "@/lib/trades-data";
import { parseSelection, compareStrategies, MIN_COMPARE, MAX_COMPARE, SERIES } from "@/lib/compare";
import { money, signedMoney, pct, num, pnlClass } from "@/lib/format";
import { FilterBar } from "@/components/FilterBar";
import CompareCurves from "@/components/CompareCurves";
import { UpgradeNotice } from "@/components/UpgradeNotice";
import { Card, Notice, PageHeader, EmptyState, btnCls, btnGhostCls } from "@/components/ui";

export const metadata = { title: "Compare strategies — TradeNotes" };

export default async function CompareStrategies({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const ctx = await getContext();
  const { db, tz, plan, profile } = ctx;
  // Plan gate, server side: a plan without the comparison loads no trade data at all.
  if (!PLANS[plan].comparison) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <PageHeader title="Compare strategies" sub="Put two to four strategies side by side." />
        <UpgradeNotice feature="Strategy comparison" tier="premium">See trades, win rate, expectancy, profit factor, average R and maximum drawdown for up to four strategies in one table, with their equity curves on one chart. Your analytics by strategy stay available on every plan.</UpgradeNotice>
      </div>
    );
  }
  const parsed = withKnownAccount(parseFilters(sp), ctx.accounts.map((a) => a.id));
  const f = { ...parsed, strategy: null }; // the selection below decides the strategies; a strategy filter would only contradict it
  const scope = scopeFor(ctx.accounts, ctx.scope, f.account);
  const cur = scope.currency;
  const showHelp = profile?.show_explanations ?? true;

  let loaded, options;
  try { [loaded, options] = await Promise.all([loadResults(db, scope.accountIds, cur, f, tz), loadFilterOptions(db, ctx.accounts)]); }
  catch (e) { console.error("compare load failed", e); return <Notice kind="error">We couldn&apos;t load your trades just now. Please refresh. Your data is safe.</Notice>; }

  const selected = parseSelection(sp, options.strategies);
  const cols = selected.length >= MIN_COMPARE ? compareStrategies(loaded.rows, selected) : [];
  const picker = (
    <fieldset className="col-span-full">
      <legend className="mb-1.5 text-xs text-muted">Strategies to compare · choose {MIN_COMPARE} to {MAX_COMPARE}</legend>
      {options.strategies.length === 0 ? <p className="text-sm text-muted">You have no strategies yet. Name a strategy or setup when you log a trade.</p> : (
        <div className="flex flex-wrap gap-2">
          {options.strategies.map((name) => (
            <label key={name} className="relative inline-flex min-h-10 cursor-pointer select-none items-center rounded-full border border-border px-3 text-sm text-muted hover:border-border-strong has-[:checked]:border-accent has-[:checked]:bg-accent/10 has-[:checked]:text-fg has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent">
              <input type="checkbox" name="s" value={name} defaultChecked={selected.includes(name)} className="absolute inset-0 cursor-pointer opacity-0" />{name}
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );

  const rows: { label: string; slug?: string; cell: (c: (typeof cols)[number]) => { text: string; cls?: string } }[] = [
    { label: "Closed trades", cell: (c) => ({ text: String(c.summary.tradeCount) }) },
    { label: "Win rate", slug: "win-rate", cell: (c) => ({ text: pct(c.summary.winRate) }) },
    { label: "Expectancy / trade", slug: "expectancy", cell: (c) => ({ text: signedMoney(c.summary.expectancy, cur), cls: pnlClass(c.summary.expectancy) }) },
    { label: "Profit factor", slug: "profit-factor", cell: (c) => ({ text: num(c.summary.profitFactor) }) },
    { label: "Average R", slug: "r-multiple", cell: (c) => ({ text: c.summary.avgR === null ? "—" : `${num(c.summary.avgR)}R` }) },
    { label: "Max drawdown", slug: "drawdown", cell: (c) => ({ text: money(c.summary.maxDrawdown, cur), cls: c.summary.maxDrawdown > 0 ? "text-loss" : "" }) },
    { label: "Net P&L", cell: (c) => ({ text: signedMoney(c.summary.netPnl, cur), cls: pnlClass(c.summary.netPnl) }) },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Compare strategies" sub={<>{scope.label} · {cur} · closed trades, {dateLabel(f)}. Real trades only: hypothetical backtests are never included.</>} />
      <FilterBar path="/app/strategies/compare" filters={f} options={options} switcherLabel={ctx.scope.label} showStrategy={false} extra={picker} forceOpen={selected.length < MIN_COMPARE} />

      {selected.length < MIN_COMPARE ? (
        <EmptyState title={options.strategies.length < MIN_COMPARE ? "You need at least two strategies to compare" : "Choose two to four strategies"}
          action={options.strategies.length < MIN_COMPARE ? <Link href="/app/journal/new" className={btnCls}>Log a trade</Link> : undefined}>
          {options.strategies.length < MIN_COMPARE ? "A strategy exists once you name it on a trade (the Strategy / setup field)." : <>Tick the strategies above and press <strong>Apply filters</strong>. The same filters apply to all of them.</>}
        </EmptyState>
      ) : (<>
        {selected.length >= MAX_COMPARE && <Notice>Comparing the maximum of {MAX_COMPARE} strategies. Untick one to swap it.</Notice>}
        {cols.map((c) => c.summary.tradeCount > 0 && c.summary.smallSample && (
          <Notice key={c.name} kind="warn"><strong className="font-medium">{c.name}</strong>: only {c.summary.tradeCount} closed trade{c.summary.tradeCount === 1 ? "" : "s"}. Under 30 trades the figures are mostly luck, so a difference with another strategy may be noise. <Link href="/learn#sample-size" className="underline underline-offset-2">Why?</Link></Notice>
        ))}
        {cols.map((c) => c.summary.tradeCount === 0 && <Notice key={c.name}><strong className="font-medium">{c.name}</strong> has no closed trades with these filters.</Notice>)}

        <Card className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-sm" data-testid="compare-table">
              <caption className="sr-only">Strategy comparison, one column per strategy</caption>
              <thead className="text-left text-xs text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-normal">Metric</th>
                  {cols.map((c, i) => (
                    <th key={c.name} scope="col" className="px-3 py-3 text-right font-medium text-fg">
                      <span className="block truncate" title={c.name}>{c.name}</span>
                      <span className="mt-0.5 block text-[11px] font-normal text-muted">{SERIES[i].label}{c.summary.smallSample && c.summary.tradeCount > 0 ? " · small sample *" : ""}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.label} className="border-t border-border">
                    <th scope="row" className="px-4 py-2.5 text-left font-normal text-muted">{r.label}</th>
                    {cols.map((c) => { const v = r.cell(c); return <td key={c.name} className={`fig px-3 py-2.5 text-right ${v.cls ?? ""}`}>{c.summary.tradeCount === 0 && r.label !== "Closed trades" ? "—" : v.text}</td>; })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {showHelp && <p className="border-t border-border px-4 py-3 text-xs text-muted">* fewer than 30 closed trades. Profit factor needs at least one losing trade. Average R uses only trades that have a stop. Max drawdown is the largest fall from a peak in that strategy&apos;s own cumulative net P&amp;L.</p>}
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-medium">Equity curves <span className="font-normal text-muted">· cumulative net P&amp;L, {cur}, one scale</span></h2>
          <CompareCurves columns={cols} currency={cur} />
        </Card>
        <div className="flex flex-wrap gap-2"><Link href="/app/analytics" className={btnGhostCls}>Open analytics</Link></div>
      </>)}
      <p className="text-xs text-muted">Statistics describe your recorded past trades only and are not a prediction.</p>
    </div>
  );
}
