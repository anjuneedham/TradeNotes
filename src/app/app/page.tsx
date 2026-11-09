import Link from "next/link";
import { getContext } from "@/lib/app-context";
import { summarize, groupSummary, type TradeInput, type Summary } from "@/lib/metrics";
import { toTradeInputs, type TradeRow, type ExitRow } from "@/lib/trade-schema";
import { money, pct, num, pnlClass } from "@/lib/format";
import { Card, Notice, btnCls } from "@/components/ui";
import EquityCurve from "@/components/EquityCurve";

export const metadata = { title: "Dashboard — TradeNotes" };
interface DashRow extends TradeRow { symbol: string; session: string | null; strategy_name: string | null; exits: ExitRow[] }
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function Kpi({ label, value, hint, slug, cls = "", show }: { label: string; value: string; hint: string; slug: string; cls?: string; show: boolean }) {
  return (
    <Card>
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${cls}`}>{value}</p>
      {show && <p className="mt-2 text-xs text-muted">{hint} <Link href={`/learn#${slug}`} className="underline">Learn more</Link></p>}
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

export default async function Dashboard() {
  const { db, accounts, profile } = await getContext();
  const cur = accounts[0]?.currency ?? "USD";
  const showHelp = profile?.show_explanations ?? true;

  const LIMIT = 10000;
  let all: DashRow[] = [];
  let failed = false;
  try {
    all = await db((q) => q<DashRow>(
      `select t.id, t.side, t.quantity, t.entry_price, t.fees, t.multiplier, t.initial_risk, t.currency, t.fx_to_account, t.closed_at, t.symbol, t.session, s.name as strategy_name,
         coalesce((select json_agg(json_build_object('trade_id', e.trade_id, 'quantity', e.quantity, 'price', e.price)) from tradenotes.trade_exits e where e.trade_id = t.id), '[]'::json) as exits
       from tradenotes.trades t left join tradenotes.strategies s on s.id = t.strategy_id order by t.opened_at limit ${LIMIT + 1}`));
  } catch (e) { console.error("dashboard load failed", e); failed = true; }
  const truncated = all.length > LIMIT;
  const rows = truncated ? all.slice(0, LIMIT) : all;

  if (failed) return <Notice kind="error">We couldn&apos;t load your trades just now. Please refresh. Your data is safe.</Notice>;

  if (rows.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Welcome{profile?.experience_level === "beginner" ? " — let’s get started" : ""}</h1>
        <Card>
          <h2 className="font-medium">Start in 3 steps</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted">
            <li><strong className="text-fg">Log a trade</strong> — instrument, direction, size, entry and exit. Add your stop to unlock R-multiples.</li>
            <li><strong className="text-fg">Tag what happened</strong> — your strategy, how you felt, any mistakes.</li>
            <li><strong className="text-fg">Come back here</strong> — your win rate, expectancy and equity curve build automatically.</li>
          </ol>
          <Link href="/app/journal/new" className={`${btnCls} mt-4 inline-block`}>Log your first trade</Link>
        </Card>
        <Card className="opacity-80">
          <p className="mb-2 inline-block rounded bg-accent/20 px-2 py-0.5 text-xs text-accent">EXAMPLE — not your data</p>
          <p className="text-sm">EURUSD · Long · 1.0 lot · Entry 1.0850 · Stop 1.0820 · Exit 1.0910</p>
          <p className="mt-1 text-sm text-muted">Planned risk: 30 pips = $300. Result: +60 pips = <span className="text-win">+$600 gross</span> → <strong>+2.0R</strong>.</p>
          <p className="mt-2 text-xs text-muted">R-multiple = result ÷ planned risk. Winning 2R means you made twice what you risked. <Link href="/learn#r-multiple" className="underline">Learn more</Link></p>
        </Card>
      </div>
    );
  }

  const exits = rows.flatMap((r) => r.exits);
  const inputs = toTradeInputs(rows, exits, cur);
  const s = summarize(inputs);
  type Ext = TradeInput & { symbol: string; session: string | null; strategy: string | null };
  const ext: Ext[] = inputs.map((t, i) => ({ ...t, symbol: rows[i].symbol, session: rows[i].session, strategy: rows[i].strategy_name }));
  const excludedN = s.excluded.open_or_partial.length + s.excluded.missing_fx.length + s.excluded.invalid.length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      {truncated && <Notice kind="error">You have more than 10,000 trades. Statistics below use only the oldest 10,000 and are incomplete.</Notice>}
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
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi show={showHelp} label="Net P&L" value={money(s.netPnl, cur)} cls={pnlClass(s.netPnl)} slug="expectancy" hint="Total after fees." />
          <Kpi show={showHelp} label="Win rate" value={pct(s.winRate)} slug="win-rate" hint={`${s.wins}W / ${s.losses}L${s.breakevens ? ` / ${s.breakevens} breakeven` : ""}.`} />
          <Kpi show={showHelp} label="Profit factor" value={num(s.profitFactor)} slug="profit-factor" hint={s.profitFactor === null ? "Needs at least one loss." : "Above 1.0 = winners outweigh losers."} />
          <Kpi show={showHelp} label="Expectancy / trade" value={money(s.expectancy, cur)} cls={pnlClass(s.expectancy)} slug="expectancy" hint="Average result per trade." />
          <Kpi show={showHelp} label="Average win" value={money(s.avgWin, cur)} cls="text-win" slug="win-rate" hint="Mean of winning trades." />
          <Kpi show={showHelp} label="Average loss" value={money(s.avgLoss, cur)} cls="text-loss" slug="win-rate" hint="Mean of losing trades." />
          <Kpi show={showHelp} label="Average R" value={s.avgR === null ? "—" : `${num(s.avgR)}R`} slug="r-multiple" hint={`Based on ${s.rCoverage.withR} of ${s.rCoverage.total} trades that have a stop loss.`} />
          <Kpi show={showHelp} label="Max drawdown" value={money(s.maxDrawdown, cur)} cls="text-loss" slug="drawdown" hint="Largest drop from a peak." />
        </div>
        <Card>
          <h2 className="mb-2 text-sm font-medium">Equity curve <span className="font-normal text-muted">(cumulative net P&amp;L)</span></h2>
          <EquityCurve points={s.equityCurve.map((p) => p.cumulative)} currency={cur} />
          <p className="mt-1 text-xs text-muted">Longest win streak: {s.maxWinStreak} · longest losing streak: {s.maxLossStreak}</p>
        </Card>
        <div className="grid gap-3 md:grid-cols-2">
          <Breakdown title="By strategy" groups={groupSummary(ext, (t) => t.strategy)} cur={cur} />
          <Breakdown title="By instrument" groups={groupSummary(ext, (t) => t.symbol)} cur={cur} />
          <Breakdown title="By session" groups={groupSummary(ext, (t) => t.session)} cur={cur} />
          <Breakdown title="By direction" groups={groupSummary(ext, (t) => t.side)} cur={cur} />
          <Breakdown title="By weekday (UTC, by close time)" groups={groupSummary(ext, (t) => (t.closedAt ? DAYS[new Date(t.closedAt).getUTCDay()] : null))} cur={cur} />
        </div>
        <p className="text-xs text-muted">* fewer than 30 trades in the group. Statistics describe your recorded past trades only and are not a prediction.</p>
      </>)}
    </div>
  );
}
