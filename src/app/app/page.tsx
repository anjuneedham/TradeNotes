import Link from "next/link";
import { getContext } from "@/lib/app-context";
import { summarize, groupSummary, evaluateTrade } from "@/lib/metrics";
import { loadTrades, toExt, inRange, rangeStart, parseRange, RANGES, tagSummary, worstTrade, type StatRow } from "@/lib/trades-data";
import { money, signedMoney, signedR, pct, num, pnlClass, shortDate } from "@/lib/format";
import { Card, Notice, Badge, PageHeader, Segmented, btnCls, linkCls } from "@/components/ui";
import { Stat, Breakdown } from "@/components/stats";
import EquityCurve from "@/components/EquityCurve";

export const metadata = { title: "Dashboard — TradeNotes" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { db, accounts, profile } = await getContext();
  const range = parseRange((await searchParams).range);
  const cur = accounts[0]?.currency ?? "USD";
  const showHelp = profile?.show_explanations ?? true;

  let rows: StatRow[] = [], truncated = false;
  try { ({ rows, truncated } = await loadTrades(db)); }
  catch (e) { console.error("dashboard load failed", e); return <Notice kind="error">We couldn&apos;t load your trades just now. Please refresh. Your data is safe.</Notice>; }

  if (rows.length === 0) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <PageHeader title={`Welcome${profile?.experience_level === "beginner" ? " — let’s get started" : ""}`} sub="Your dashboard fills in as you log trades." />
        <Card>
          <h2 className="font-medium">Start in 3 steps</h2>
          <ol className="mt-4 space-y-4 text-sm">
            {[["Log a trade", "Instrument, direction, size, entry and exit. Add your stop to unlock R-multiples."],
              ["Tag what happened", "Your strategy, how you felt, any mistakes."],
              ["Come back here", "Your win rate, expectancy and equity curve build automatically."]].map(([t, d], i) => (
              <li key={t} className="flex gap-3">
                <span className="fig grid h-6 w-6 shrink-0 place-items-center rounded-full border border-border-strong text-xs text-muted">{i + 1}</span>
                <span className="text-muted"><strong className="font-medium text-fg">{t}</strong> — {d}</span>
              </li>
            ))}
          </ol>
          <Link href="/app/journal/new" className={`${btnCls} mt-5`}>Log your first trade</Link>
        </Card>
        <Card>
          <Badge tone="accent">EXAMPLE — not your data</Badge>
          <p className="fig mt-3 text-sm">EURUSD · Long · 1.0 lot · Entry 1.0850 · Stop 1.0820 · Exit 1.0910</p>
          <p className="mt-2 text-sm text-muted">Planned risk: 30 pips = $300. Result: +60 pips = <span className="text-win">+$600 gross</span> → <strong className="text-fg">+2.0R</strong>.</p>
          <p className="mt-2 text-xs text-muted">R-multiple = result ÷ planned risk. Winning 2R means you made twice what you risked. <Link href="/learn#r-multiple" className="underline underline-offset-2">Learn more</Link></p>
        </Card>
      </div>
    );
  }

  const all = toExt(rows, cur);
  const ext = inRange(all, rangeStart(range));
  const s = summarize(ext);
  const excludedN = s.excluded.open_or_partial.length + s.excluded.missing_fx.length + s.excluded.invalid.length;

  // "What changed": last 30 days against the 30 days before (independent of the selected range).
  const now = new Date(), d30 = new Date(now.getTime() - 30 * 86400000), d60 = new Date(now.getTime() - 60 * 86400000);
  const closedOnly = all.filter((t) => t.closedAt);
  const recent = summarize(inRange(closedOnly, d30)), prior = summarize(inRange(closedOnly, d60, d30));

  // "What to review"
  const noStop = s.rCoverage.total - s.rCoverage.withR;
  const mistakes = Object.entries(tagSummary(ext, (t) => t.mistakes)).filter(([, m]) => m.tradeCount > 0).sort((a, b) => a[1].netPnl - b[1].netPnl);
  const costliest = mistakes[0] && mistakes[0][1].netPnl < 0 ? mistakes[0] : null;
  const worst = worstTrade(ext);
  const reviewCount = (s.excluded.open_or_partial.length ? 1 : 0) + (s.excluded.missing_fx.length ? 1 : 0) + (noStop ? 1 : 0) + (costliest ? 1 : 0) + (worst ? 1 : 0);
  const latest = [...all].sort((a, b) => (a.openedAt < b.openedAt ? 1 : -1)).slice(0, 5);
  const rangeLabel = RANGES.find((r) => r.value === range)!.label.toLowerCase();

  return (
    <div className="space-y-5">
      <PageHeader title="Dashboard" sub={<>{accounts[0]?.name ?? "Account"} · {cur} · {s.tradeCount} closed trade{s.tradeCount === 1 ? "" : "s"}, {rangeLabel}</>}>
        <Segmented label="Date range" value={range} options={RANGES.map((r) => ({ ...r, href: r.value === "all" ? "/app" : `/app?range=${r.value}` }))} />
      </PageHeader>

      {truncated && <Notice kind="error">You have more than 10,000 trades. Statistics below use only the oldest 10,000 and are incomplete.</Notice>}
      {excludedN > 0 && (
        <Notice>
          {s.excluded.open_or_partial.length > 0 && <>{s.excluded.open_or_partial.length} open or partially-closed trade(s) are not included in these statistics. </>}
          {s.excluded.missing_fx.length > 0 && <>{s.excluded.missing_fx.length} trade(s) in another currency need an exchange rate and are not included. </>}
          {s.excluded.invalid.length > 0 && <>{s.excluded.invalid.length} trade(s) have invalid data and are not included.</>}
        </Notice>
      )}

      {s.tradeCount === 0 ? (
        <Card><p className="text-sm text-muted">{range === "all" ? "Statistics appear once you have at least one closed trade." : <>No closed trades in this period. <Link href="/app" className={linkCls}>Show all time</Link></>}</p></Card>
      ) : (<>
        {s.smallSample && (
          <Notice kind="warn">Based on {s.tradeCount} closed trade{s.tradeCount === 1 ? "" : "s"}. Under 30 trades, results are mostly luck — don&apos;t draw conclusions yet. <Link href="/learn#sample-size" className="underline underline-offset-2">Why?</Link></Notice>
        )}

        <section aria-label="Key figures" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat show={showHelp} label="Net P&L" value={signedMoney(s.netPnl, cur)} cls={pnlClass(s.netPnl)} slug="expectancy" hint="Total after fees." />
          <Stat show={showHelp} label="Win rate" value={pct(s.winRate)} slug="win-rate" hint={`${s.wins}W / ${s.losses}L${s.breakevens ? ` / ${s.breakevens} breakeven` : ""}.`} />
          <Stat show={showHelp} label="Profit factor" value={num(s.profitFactor)} slug="profit-factor" hint={s.profitFactor === null ? "Needs at least one loss." : "Above 1.0 = winners outweigh losers."} />
          <Stat show={showHelp} label="Expectancy / trade" value={signedMoney(s.expectancy, cur)} cls={pnlClass(s.expectancy)} slug="expectancy" hint="Average result per trade." />
          <Stat show={showHelp} label="Average win" value={signedMoney(s.avgWin, cur)} cls={s.avgWin === null ? "" : "text-win"} slug="win-rate" hint="Mean of winning trades." />
          <Stat show={showHelp} label="Average loss" value={money(s.avgLoss, cur)} cls={s.avgLoss === null ? "" : "text-loss"} slug="win-rate" hint="Mean of losing trades." />
          <Stat show={showHelp} label="Average R" value={s.avgR === null ? "—" : `${num(s.avgR)}R`} slug="r-multiple" hint={`Based on ${s.rCoverage.withR} of ${s.rCoverage.total} trades that have a stop loss.`} />
          <Stat show={showHelp} label="Max drawdown" value={money(s.maxDrawdown, cur)} cls={s.maxDrawdown > 0 ? "text-loss" : ""} slug="drawdown" hint="Largest drop from a peak." />
        </section>

        <div className="grid gap-3 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-medium">Equity curve <span className="font-normal text-muted">· cumulative net P&amp;L, {cur}</span></h2>
              <p className="text-xs text-muted">Longest win streak: {s.maxWinStreak} · longest losing streak: {s.maxLossStreak}</p>
            </div>
            <EquityCurve points={s.equityCurve} currency={cur} />
          </Card>

          <Card>
            <h2 className="text-sm font-medium">To review</h2>
            {reviewCount === 0 ? <p className="mt-3 text-sm text-muted">Nothing flagged in this period. Every closed trade has a stop and no mistakes are tagged.</p> : (
              <ul className="mt-2 divide-y divide-border text-sm">
                {s.excluded.open_or_partial.length > 0 && (
                  <li className="py-2.5"><Link href="/app/journal?status=open" className="group block">
                    <span className="font-medium group-hover:underline">{s.excluded.open_or_partial.length} open trade{s.excluded.open_or_partial.length === 1 ? "" : "s"}</span>
                    <span className="block text-xs text-muted">Not counted until fully closed. View in journal →</span></Link></li>
                )}
                {s.excluded.missing_fx.length > 0 && (
                  <li className="py-2.5"><span className="font-medium">{s.excluded.missing_fx.length} trade{s.excluded.missing_fx.length === 1 ? "" : "s"} missing an exchange rate</span>
                    <span className="block text-xs text-muted">Quoted in another currency, so they can&apos;t be counted.</span></li>
                )}
                {costliest && (
                  <li className="py-2.5"><Link href="/app/analytics#mistakes" className="group block">
                    <span className="font-medium group-hover:underline">Costliest mistake: {costliest[0]}</span>
                    <span className="block text-xs text-muted"><span className="fig text-loss">{signedMoney(costliest[1].netPnl, cur)}</span> across {costliest[1].tradeCount} tagged trade{costliest[1].tradeCount === 1 ? "" : "s"}. See all mistakes →</span></Link></li>
                )}
                {worst && (
                  <li className="py-2.5"><Link href={`/app/journal/${worst.trade.id}`} className="group block">
                    <span className="font-medium group-hover:underline">Largest loss: {worst.trade.symbol}</span>
                    <span className="block text-xs text-muted"><span className="fig text-loss">{signedMoney(worst.netPnl, cur)}</span> on {shortDate(worst.trade.openedAt)}. Re-read your notes →</span></Link></li>
                )}
                {noStop > 0 && (
                  <li className="py-2.5"><span className="font-medium">{noStop} closed trade{noStop === 1 ? "" : "s"} without a stop</span>
                    <span className="block text-xs text-muted">No R-multiple can be calculated for {noStop === 1 ? "it" : "them"}.</span></li>
                )}
              </ul>
            )}
          </Card>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <Card>
            <h2 className="text-sm font-medium">Last 30 days</h2>
            {recent.tradeCount === 0 ? <p className="mt-3 text-sm text-muted">No trades closed in the last 30 days.</p> : (<>
              <p className={`fig mt-2 text-2xl font-medium ${pnlClass(recent.netPnl)}`}>{signedMoney(recent.netPnl, cur)}</p>
              <p className="mt-1 text-xs text-muted">{recent.tradeCount} closed trade{recent.tradeCount === 1 ? "" : "s"} · win rate {pct(recent.winRate)}</p>
            </>)}
            <p className="mt-3 border-t border-border pt-3 text-xs text-muted">
              Previous 30 days: {prior.tradeCount === 0 ? "no closed trades." : <><span className={`fig ${pnlClass(prior.netPnl)}`}>{signedMoney(prior.netPnl, cur)}</span> from {prior.tradeCount} trade{prior.tradeCount === 1 ? "" : "s"}, win rate {pct(prior.winRate)}.</>}
            </p>
          </Card>

          <Card className="lg:col-span-2">
            <div className="flex items-baseline justify-between"><h2 className="text-sm font-medium">Latest trades</h2><Link href="/app/journal" className={`text-xs ${linkCls}`}>Open journal →</Link></div>
            <ul className="mt-2 divide-y divide-border text-sm">
              {latest.map((t) => {
                const r = evaluateTrade(t), closed = typeof r !== "string";
                return (
                  <li key={t.id}><Link href={`/app/journal/${t.id}`} className="-mx-2 flex items-center gap-3 rounded px-2 py-2.5 hover:bg-raised/60">
                    <span className="w-20 shrink-0 text-xs text-muted">{shortDate(t.openedAt).replace(/ \d{4}$/, "")}</span>
                    <span className="min-w-0 flex-1 truncate font-medium">{t.symbol} <span className="font-normal capitalize text-muted">· {t.side}</span></span>
                    <span className="fig hidden w-16 text-right text-muted sm:block">{closed ? signedR(r.r) : ""}</span>
                    <span className={`fig w-28 text-right ${closed ? pnlClass(r.netPnl) : "text-muted"}`}>{closed ? signedMoney(r.netPnl, cur) : r === "missing_fx" ? "Needs FX" : "Open"}</span>
                  </Link></li>
                );
              })}
            </ul>
          </Card>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <Breakdown title="By strategy" groups={groupSummary(ext, (t) => t.strategy)} cur={cur} limit={5} />
          <Card className="flex flex-col justify-between gap-4">
            <div>
              <h2 className="text-sm font-medium">Go deeper</h2>
              <p className="mt-1 text-sm text-muted">Compare results by instrument, session, direction, weekday, mistake and emotion.</p>
            </div>
            <Link href={range === "all" ? "/app/analytics" : `/app/analytics?range=${range}`} className={`${linkCls} text-sm`}>Open analytics →</Link>
          </Card>
        </div>
        <p className="text-xs text-muted">* fewer than 30 trades in the group. Statistics describe your recorded past trades only and are not a prediction.</p>
      </>)}
    </div>
  );
}
