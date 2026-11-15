import Link from "next/link";
import { getContext } from "@/lib/app-context";
import { summarize, groupSummary, type Summary } from "@/lib/metrics";
import { closedTrades, dailyPnl, insights, tradeScore, type JournalTrade } from "@/lib/analytics";
import { loadJournalTrades, TRADE_LIMIT } from "@/lib/load-trades";
import { PLANS } from "@/lib/plans";
import { money, pct, pnlClass } from "@/lib/format";
import { Card, Notice, btnCls, btnGhostCls, Locked, SectionTitle, Badge } from "@/components/ui";
import EquityCurve from "@/components/EquityCurve";
import CountUp from "@/components/CountUp";
import PnlCalendar from "@/components/PnlCalendar";
import { ScoreRing, Radar } from "@/components/Charts";

export const metadata = { title: "Dashboard — TradeNotes" };
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function Kpi({ label, value, format, cur, hint, slug, cls = "", show }: { label: string; value: number | null; format: "money" | "pct" | "num" | "r"; cur: string; hint: string; slug: string; cls?: string; show: boolean }) {
  return (
    <Card className="card-hover p-4">
      <p className="text-[11px] uppercase tracking-wider text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${cls}`}>{value === null ? "—" : <CountUp value={value} format={format} currency={cur} />}</p>
      {show && <p className="mt-1.5 text-xs text-muted">{hint} <Link href={`/learn#${slug}`} className="underline decoration-dotted">Learn</Link></p>}
    </Card>
  );
}

function Breakdown({ title, groups, cur }: { title: string; groups: Record<string, Summary>; cur: string }) {
  const entries = Object.entries(groups).filter(([, s]) => s.tradeCount > 0).sort((a, b) => b[1].netPnl - a[1].netPnl);
  if (!entries.length) return null;
  return (
    <Card>
      <h3 className="mb-2 text-sm font-medium">{title}</h3>
      <div className="overflow-x-auto"><table className="w-full text-sm">
        <thead className="text-left text-xs text-muted"><tr><th className="py-1">Group</th><th>Trades</th><th>Win rate</th><th>Net P&amp;L</th></tr></thead>
        <tbody>{entries.map(([k, s]) => (
          <tr key={k} className="border-t border-border">
            <td className="py-1.5">{k}</td><td>{s.tradeCount}{s.smallSample && <span title="Fewer than 30 trades — treat with caution" className="ml-1 text-xs text-muted">*</span>}</td>
            <td>{pct(s.winRate)}</td><td className={pnlClass(s.netPnl)}>{money(s.netPnl, cur)}</td>
          </tr>))}</tbody>
      </table></div>
    </Card>
  );
}

/** Illustrative placeholder axes for the locked score preview (never the user's data). */
const SAMPLE_AXES = [
  { key: "a", label: "Profit factor", value: 72, raw: "" }, { key: "b", label: "Avg win / loss", value: 64, raw: "" }, { key: "c", label: "Win rate", value: 81, raw: "" },
  { key: "d", label: "Consistency", value: 55, raw: "" }, { key: "e", label: "Drawdown control", value: 68, raw: "" }, { key: "f", label: "Discipline", value: 49, raw: "" },
];

export default async function Dashboard() {
  const { db, accounts, profile, plan } = await getContext();
  const cur = accounts[0]?.currency ?? "USD";
  const showHelp = profile?.show_explanations ?? true;
  const P = PLANS[plan];

  let trades: JournalTrade[] = [], truncated = false, failed = false;
  try { ({ trades, truncated } = await loadJournalTrades(db, cur)); } catch (e) { console.error("dashboard load failed", e); failed = true; }
  if (failed) return <Notice kind="error">We couldn&apos;t load your trades just now. Please refresh. Your data is safe.</Notice>;

  if (trades.length === 0) {
    return (
      <div className="stagger space-y-6">
        <div>
          <p className="text-sm text-indigo-300">Welcome to TradeNotes</p>
          <h1 className="text-3xl font-semibold">Your edge is hiding in your trades.</h1>
          <p className="mt-1 text-muted">Log a few and we&apos;ll start showing you where you make — and leak — money.</p>
        </div>
        <Card>
          <h2 className="font-medium">Start in 3 steps</h2>
          <ol className="mt-3 grid gap-3 sm:grid-cols-3">
            {[["1", "Log a trade", "Instrument, direction, size, entry and exit. Add your stop to unlock R-multiples."], ["2", "Tag what happened", "Your setup, how you felt, any mistakes. This is what powers your insights."], ["3", "Watch patterns appear", "Score, calendar, best hours, costliest habits — all built automatically."]].map(([n, t, d]) => (
              <li key={n} className="rounded-lg border border-border bg-panel-2 p-4"><span className="text-gradient text-2xl font-bold">{n}</span><p className="mt-1 font-medium">{t}</p><p className="mt-1 text-xs text-muted">{d}</p></li>
            ))}
          </ol>
          <Link href="/app/journal/new" className={`${btnCls} mt-5 inline-block`}>Log your first trade</Link>
        </Card>
        <Card className="opacity-90">
          <Badge>EXAMPLE — not your data</Badge>
          <p className="mt-2 text-sm">EURUSD · Long · 1.0 lot · Entry 1.0850 · Stop 1.0820 · Exit 1.0910</p>
          <p className="mt-1 text-sm text-muted">Planned risk: 30 pips = $300. Result: +60 pips = <span className="text-win">+$600 gross</span> → <strong>+2.0R</strong>.</p>
        </Card>
      </div>
    );
  }

  const s = summarize(trades);
  const closed = closedTrades(trades);
  const days = dailyPnl(closed);
  const score = tradeScore(s, closed);
  const found = insights(closed, cur);
  const excludedN = s.excluded.open_or_partial.length + s.excluded.missing_fx.length + s.excluded.invalid.length;
  const now = new Date();
  const lastDay = Object.keys(days).sort().pop();
  const ym = lastDay && !days[now.toISOString().slice(0, 10)] ? [Number(lastDay.slice(0, 4)), Number(lastDay.slice(5, 7)) - 1] : [now.getUTCFullYear(), now.getUTCMonth()];
  const dayList = Object.values(days);
  const greenDays = dayList.filter((d) => d.pnl > 0).length;
  let streak = 0; for (const d of Object.keys(days).sort().reverse()) { if (days[d].pnl > 0) streak++; else break; }
  const hour = now.getUTCHours();

  return (
    <div className="space-y-6">
      <div className="anim-fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"} · {PLANS[plan].name} plan</p>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge tone="muted">{s.tradeCount} closed trades</Badge>
          <Badge tone="muted">{greenDays}/{dayList.length} green days</Badge>
          {streak >= 2 && <Badge tone="win">🔥 {streak}-day green streak</Badge>}
        </div>
      </div>

      {truncated && <Notice kind="error">You have more than {TRADE_LIMIT.toLocaleString()} trades. Statistics below use only the oldest {TRADE_LIMIT.toLocaleString()} and are incomplete.</Notice>}
      {excludedN > 0 && (
        <Notice>
          {s.excluded.open_or_partial.length > 0 && <>{s.excluded.open_or_partial.length} open or partially-closed trade(s) are not included in these statistics. </>}
          {s.excluded.missing_fx.length > 0 && <>{s.excluded.missing_fx.length} trade(s) in another currency need an exchange rate and are not included. </>}
          {s.excluded.invalid.length > 0 && <>{s.excluded.invalid.length} trade(s) have invalid data and are not included.</>}
        </Notice>
      )}

      {s.tradeCount === 0 ? <Card><p className="text-sm text-muted">Statistics appear once you have at least one closed trade.</p></Card> : (<>
        {s.smallSample && (
          <Notice>Based on {s.tradeCount} closed trade{s.tradeCount === 1 ? "" : "s"}. Under 30 trades, results are mostly luck — don&apos;t draw conclusions yet. <Link href="/learn#sample-size" className="underline">Why?</Link></Notice>
        )}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_1fr]">
          {/* Score */}
          {P.score ? (
            <Card className="anim-fade-up flex flex-col items-center">
              <SectionTitle sub="Six-factor health check of your trading">TradeNotes Score</SectionTitle>
              {score ? (<>
                <ScoreRing score={score.total} />
                <Radar axes={score.axes} size={240} />
                <p className="text-center text-xs text-muted">Weakest: <strong className="text-fg">{[...score.axes].sort((a, b) => a.value - b.value)[0].label}</strong> — start there.</p>
              </>) : <p className="py-10 text-center text-sm text-muted">Log at least 5 closed trades to get your score.</p>}
            </Card>
          ) : (
            <Locked plan="Pro" title="What’s your TradeNotes Score?" teaser="A 0–100 rating across profit factor, consistency, drawdown control, discipline and more — with the one axis to fix first.">
              <Card className="flex flex-col items-center"><SectionTitle>TradeNotes Score</SectionTitle><ScoreRing score={67} /><Radar axes={SAMPLE_AXES} size={220} /></Card>
            </Locked>
          )}

          {/* KPIs */}
          <div className="stagger grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Kpi show={showHelp} cur={cur} format="money" label="Net P&L" value={s.netPnl} cls={pnlClass(s.netPnl)} slug="expectancy" hint="Total after fees." />
            <Kpi show={showHelp} cur={cur} format="pct" label="Win rate" value={s.winRate} slug="win-rate" hint={`${s.wins}W / ${s.losses}L${s.breakevens ? ` / ${s.breakevens} BE` : ""}.`} />
            <Kpi show={showHelp} cur={cur} format="num" label="Profit factor" value={s.profitFactor} slug="profit-factor" hint={s.profitFactor === null ? "Needs at least one loss." : "Above 1.0 = winners outweigh losers."} />
            <Kpi show={showHelp} cur={cur} format="money" label="Expectancy" value={s.expectancy} cls={pnlClass(s.expectancy)} slug="expectancy" hint="Average result per trade." />
            <Kpi show={showHelp} cur={cur} format="money" label="Average win" value={s.avgWin} cls="text-win" slug="win-rate" hint="Mean of winning trades." />
            <Kpi show={showHelp} cur={cur} format="money" label="Average loss" value={s.avgLoss} cls="text-loss" slug="win-rate" hint="Mean of losing trades." />
            <Kpi show={showHelp} cur={cur} format="r" label="Average R" value={s.avgR} slug="r-multiple" hint={`${s.rCoverage.withR} of ${s.rCoverage.total} trades have a stop.`} />
            <Kpi show={showHelp} cur={cur} format="money" label="Max drawdown" value={s.maxDrawdown} cls="text-loss" slug="drawdown" hint="Largest drop from a peak." />
          </div>
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-[1fr_minmax(0,22rem)]">
          <Card className="anim-fade-up">
            <SectionTitle sub="Cumulative net P&L" right={<span className="text-xs text-muted">Best streak {s.maxWinStreak}W · worst {s.maxLossStreak}L</span>}>Equity curve</SectionTitle>
            <EquityCurve points={s.equityCurve.map((p) => p.cumulative)} currency={cur} labels={s.equityCurve.map((p) => p.closedAt?.slice(0, 10) ?? "")} />
          </Card>

          {/* Insights — curiosity hooks */}
          <Card className="anim-fade-up">
            <SectionTitle sub="Facts about your own trades" right={found.length > 0 && <Badge>{found.length} found</Badge>}>Insights</SectionTitle>
            {found.length === 0 ? <p className="text-sm text-muted">Tag mistakes and emotions on your trades and insights will appear here.</p> : (
              <ul className="stagger space-y-2">
                {found.slice(0, P.insights).map((f) => (
                  <li key={f.id} className={`rounded-lg border-l-2 bg-panel-2 p-3 ${f.tone === "bad" ? "border-loss" : f.tone === "good" ? "border-win" : "border-accent"}`}>
                    <p className="text-sm font-medium">{f.title}</p><p className="mt-0.5 text-xs text-muted">{f.body}</p>
                  </li>
                ))}
                {found.length > P.insights && (
                  <li className="relative overflow-hidden rounded-lg border border-dashed border-accent/40 p-3">
                    <div className="shimmer absolute inset-0" />
                    <p className="relative text-sm font-medium">🔒 {found.length - P.insights} more finding{found.length - P.insights === 1 ? "" : "s"} in your data</p>
                    <p className="relative mt-0.5 text-xs text-muted">Including {found.slice(P.insights).some((f) => f.tone === "bad") ? "a pattern that is costing you money" : "what's working best for you"}.</p>
                    <Link href={`/app/billing?plan=${plan === "free" ? "starter" : "pro"}`} className="relative mt-2 inline-block text-xs font-medium text-indigo-300 underline">Reveal with {plan === "free" ? "Starter" : "Pro"} →</Link>
                  </li>
                )}
              </ul>
            )}
          </Card>
        </div>

        {P.calendar ? (
          <Card className="anim-fade-up">
            <PnlCalendar days={days} year={ym[0]} month={ym[1]} cur={cur} />
            <Link href="/app/calendar" className="mt-3 inline-block text-xs text-indigo-300 underline">Open full calendar →</Link>
          </Card>
        ) : (
          <Locked plan="Starter" title="See every day of your month at a glance" teaser={`You have ${dayList.length} trading day${dayList.length === 1 ? "" : "s"} recorded. The P&L calendar shows which days and weeks made — or lost — you money.`}>
            <Card><PnlCalendar days={{}} year={ym[0]} month={ym[1]} cur={cur} /></Card>
          </Locked>
        )}

        <Card className="anim-fade-up relative overflow-hidden">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/25 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div>
              <Badge>✦ AI Coach · Pro</Badge>
              <h2 className="mt-2 text-lg font-semibold">Ask your journal anything.</h2>
              <p className="text-sm text-muted">“Why did I lose last week?” “Which setup should I drop?” Your coach reads your trades and answers with your numbers.</p>
            </div>
            <Link href="/app/coach" className={plan === "pro" ? btnCls : btnGhostCls}>{plan === "pro" ? "Open coach" : "See the coach"}</Link>
          </div>
        </Card>

        <div className="grid gap-3 md:grid-cols-2">
          <Breakdown title="By strategy" groups={groupSummary(trades, (t) => t.strategy)} cur={cur} />
          <Breakdown title="By instrument" groups={groupSummary(trades, (t) => t.symbol)} cur={cur} />
          <Breakdown title="By session" groups={groupSummary(trades, (t) => t.session)} cur={cur} />
          <Breakdown title="By weekday (UTC, by close time)" groups={groupSummary(trades, (t) => (t.closedAt ? DAYS[new Date(t.closedAt).getUTCDay()] : null))} cur={cur} />
        </div>
        <p className="text-xs text-muted">* fewer than 30 trades in the group. Statistics describe your recorded past trades only and are not a prediction.</p>
      </>)}
    </div>
  );
}
