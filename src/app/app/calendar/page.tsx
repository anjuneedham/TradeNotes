import { getContext } from "@/lib/app-context";
import { closedTrades, dailyPnl } from "@/lib/analytics";
import { loadJournalTrades } from "@/lib/load-trades";
import { PLANS } from "@/lib/plans";
import { Card, Locked, SectionTitle } from "@/components/ui";
import PnlCalendar from "@/components/PnlCalendar";
import { money, pnlClass } from "@/lib/format";

export const metadata = { title: "Calendar — TradeNotes" };

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { db, accounts, plan } = await getContext();
  const cur = accounts[0]?.currency ?? "USD";
  const sp = await searchParams;
  const now = new Date();
  const m = /^\d{4}-\d{2}$/.test(sp.m ?? "") ? sp.m! : now.toISOString().slice(0, 7);
  const year = Number(m.slice(0, 4)), month = Number(m.slice(5, 7)) - 1;
  const shift = (d: number) => new Date(Date.UTC(year, month + d, 1)).toISOString().slice(0, 7);

  if (!PLANS[plan].calendar) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold">Calendar</h1>
        <Locked plan="Starter" title="Your trading month, day by day" teaser="Green and red days, weekly totals, and your best and worst days — the fastest way to spot tilt and overtrading.">
          <Card><PnlCalendar days={{}} year={year} month={month} cur={cur} /></Card>
        </Locked>
      </div>
    );
  }

  const { trades } = await loadJournalTrades(db, cur);
  const days = dailyPnl(closedTrades(trades));
  const inMonth = Object.entries(days).filter(([d]) => d.startsWith(m));
  const best = [...inMonth].sort((a, b) => b[1].pnl - a[1].pnl)[0];
  const worst = [...inMonth].sort((a, b) => a[1].pnl - b[1].pnl)[0];
  const green = inMonth.filter(([, v]) => v.pnl > 0).length;
  const n = inMonth.reduce((s, [, v]) => s + v.trades, 0);

  return (
    <div className="space-y-4">
      <h1 className="anim-fade-up text-3xl font-semibold">Calendar</h1>
      <div className="stagger grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="p-4"><p className="text-[11px] uppercase tracking-wider text-muted">Trading days</p><p className="text-2xl font-semibold">{inMonth.length}</p></Card>
        <Card className="p-4"><p className="text-[11px] uppercase tracking-wider text-muted">Green days</p><p className="text-2xl font-semibold">{inMonth.length ? `${Math.round((green / inMonth.length) * 100)}%` : "—"}</p></Card>
        <Card className="p-4"><p className="text-[11px] uppercase tracking-wider text-muted">Best day</p><p className={`text-2xl font-semibold ${pnlClass(best?.[1].pnl ?? 0)}`}>{best ? money(best[1].pnl, cur) : "—"}</p>{best && <p className="text-xs text-muted">{best[0]}</p>}</Card>
        <Card className="p-4"><p className="text-[11px] uppercase tracking-wider text-muted">Worst day</p><p className={`text-2xl font-semibold ${pnlClass(worst?.[1].pnl ?? 0)}`}>{worst ? money(worst[1].pnl, cur) : "—"}</p>{worst && <p className="text-xs text-muted">{worst[0]}</p>}</Card>
      </div>
      <Card className="anim-fade-up">
        <PnlCalendar days={days} year={year} month={month} cur={cur} nav={{ prev: `/app/calendar?m=${shift(-1)}`, next: `/app/calendar?m=${shift(1)}` }} />
        <p className="mt-3 text-xs text-muted">{n} trades this month. Days are UTC, grouped by close time.</p>
      </Card>
      <Card><SectionTitle sub="Pattern check">Overtrading watch</SectionTitle>
        <p className="text-sm text-muted">{inMonth.length ? (() => {
          const busy = inMonth.filter(([, v]) => v.trades >= 5);
          if (!busy.length) return "No days with 5+ trades this month. Nice and selective.";
          const pnl = busy.reduce((s, [, v]) => s + v.pnl, 0);
          return `${busy.length} day(s) with 5+ trades this month, netting ${money(pnl, cur)}. ${pnl < 0 ? "Your busiest days are costing you — consider a max-trades-per-day rule." : "Your busy days are profitable so far."}`;
        })() : "No trades this month yet."}</p>
      </Card>
    </div>
  );
}
