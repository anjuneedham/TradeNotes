import Link from "next/link";
import { getContext, scopeFor } from "@/lib/app-context";
import { parseFilters, withKnownAccount, activeFilterCount, filterHref, NO_FILTERS, type Filters } from "@/lib/filters";
import { loadResults, loadFilterOptions } from "@/lib/trades-data";
import { calendarMonth, parseMonth, monthWindow, shiftMonth, monthKey } from "@/lib/calendar";
import { INTENSITY_WORDS, intensityLevel } from "@/lib/analytics-extra";
import { PLANS } from "@/lib/plans";
import { signedMoney, signedCompact, pnlClass } from "@/lib/format";
import { FilterBar } from "@/components/FilterBar";
import { ColourLegend, pnlTint, pnlGlyph, pnlWord } from "@/components/AnalyticsExtra";
import { UpgradeNotice } from "@/components/UpgradeNotice";
import { Card, Notice, PageHeader, btnGhostCls, linkCls } from "@/components/ui";

export const metadata = { title: "Calendar — TradeNotes" };
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const LONG_DAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH = (y: number, m: number) => new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 1)));
const SHORT = (d: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(d + "T00:00:00Z"));

export default async function CalendarPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const ctx = await getContext();
  const { db, tz, plan } = ctx;
  // Plan gate, server side: a Free account never loads calendar data.
  if (!PLANS[plan].calendar) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <PageHeader title="Calendar" sub="Your daily results at a glance." />
        <UpgradeNotice feature="The calendar">See every day&apos;s profit or loss and trade count in a month grid, with weekly totals, and click a day to open its trades. Your journal and analytics stay available on Free.</UpgradeNotice>
      </div>
    );
  }
  // The month decides the dates here, so any date filter in the URL is dropped.
  const parsed = withKnownAccount(parseFilters(sp), ctx.accounts.map((a) => a.id));
  const f: Filters = { ...parsed, range: "all", from: null, to: null };
  const scope = scopeFor(ctx.accounts, ctx.scope, f.account);
  const cur = scope.currency;
  const { year, month } = parseMonth(sp.month, new Date(), tz);
  const win = monthWindow(year, month, tz);

  let loaded, options;
  try { [loaded, options] = await Promise.all([loadResults(db, scope.accountIds, cur, f, tz, { window: win }), loadFilterOptions(db, ctx.accounts)]); }
  catch (e) { console.error("calendar load failed", e); return <Notice kind="error">We couldn&apos;t load your trades just now. Please refresh. Your data is safe.</Notice>; }

  const cal = calendarMonth(loaded.rows, year, month, tz);
  const notCounted = loaded.excluded.open_or_partial.length + loaded.excluded.missing_fx.length + loaded.excluded.invalid.length;
  const mk = monthKey(year, month), prev = shiftMonth(year, month, -1), next = shiftMonth(year, month, 1);
  const nav = (y: number, m: number) => filterHref("/app/calendar", f, { month: monthKey(y, m) });
  const dayHref = (date: string) => filterHref("/app/journal", { ...f, range: "all", from: date, to: date }, { status: "closed" });
  const hasFilters = activeFilterCount(f) > 0;
  const thisMonth = parseMonth(undefined, new Date(), tz);

  return (
    <div className="space-y-5">
      <PageHeader title="Calendar" sub={<>{scope.label} · {cur} · days in {tz}, by the day each trade closed</>} />
      <FilterBar path="/app/calendar" filters={f} options={options} switcherLabel={ctx.scope.label} keep={{ month: mk }} showDate={false} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <nav aria-label="Month" className="flex items-center gap-2">
          <Link href={nav(prev.year, prev.month)} className={btnGhostCls} aria-label={`Previous month, ${MONTH(prev.year, prev.month)}`}>← <span className="hidden sm:inline">{MONTH(prev.year, prev.month)}</span></Link>
          <h2 className="min-w-36 text-center text-lg font-semibold" aria-live="polite">{MONTH(year, month)}</h2>
          <Link href={nav(next.year, next.month)} className={btnGhostCls} aria-label={`Next month, ${MONTH(next.year, next.month)}`}><span className="hidden sm:inline">{MONTH(next.year, next.month)}</span> →</Link>
        </nav>
        {(year !== thisMonth.year || month !== thisMonth.month) && <Link href={nav(thisMonth.year, thisMonth.month)} className={`text-sm ${linkCls}`}>Go to this month</Link>}
      </div>

      <section aria-label="Month summary" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Summary label="Net P&L" value={`${pnlGlyph(cal.net)} ${signedMoney(cal.net, cur)}`} cls={pnlClass(cal.net)} />
        <Summary label="Closed trades" value={String(cal.trades)} />
        <Summary label="Trading days" value={`${cal.tradingDays}`} hint={`${cal.winDays} up · ${cal.lossDays} down`} />
        <Summary label="Best / worst day" value={cal.best ? `▲ ${signedMoney(cal.best.net, cur)}` : "—"} hint={cal.worst ? `▼ ${signedMoney(cal.worst.net, cur)} worst` : cal.best ? "No losing day" : undefined} />
      </section>
      {notCounted > 0 && <Notice>{notCounted} trade{notCounted === 1 ? "" : "s"} in this month {notCounted === 1 ? "is" : "are"} open, partly closed, or in another currency, so {notCounted === 1 ? "it is" : "they are"} not on the calendar.</Notice>}

      <Card>
        <div className="relative overflow-x-auto">
          <table className="w-full table-fixed border-separate border-spacing-0.5" aria-label={`Daily net P&L, ${MONTH(year, month)}`}>
            <thead>
              <tr>
                {WEEKDAYS.map((d) => <th key={d} scope="col" className="pb-1 text-center text-[11px] font-normal text-muted">{d}</th>)}
                <th scope="col" className="hidden w-28 pb-1 text-center text-[11px] font-normal text-muted md:table-cell">Week</th>
              </tr>
            </thead>
            <tbody>
              {cal.weeks.map((w) => (
                <tr key={w.from}>
                  {w.days.map((d) => {
                    if (!d.inMonth) return <td key={d.date} className="h-14 rounded-sm bg-raised/30 sm:h-[4.5rem]" aria-hidden="true" />;
                    if (d.trades === 0) return <td key={d.date} className="h-14 rounded-sm border border-border/60 p-1 align-top text-[11px] text-muted sm:h-[4.5rem]"><span className="sr-only">{LONG_DAY[new Date(d.date + "T00:00:00Z").getUTCDay()]} {SHORT(d.date)}, no trades. </span><span aria-hidden="true">{d.day}</span></td>;
                    const lvl = intensityLevel(d.net, cal.maxAbs);
                    const label = `${LONG_DAY[new Date(d.date + "T00:00:00Z").getUTCDay()]} ${SHORT(d.date)}: ${d.trades} trade${d.trades === 1 ? "" : "s"}, ${signedMoney(d.net, cur)}, ${pnlWord(d.net)}${lvl ? `, ${INTENSITY_WORDS[lvl]}` : ""}. Open these trades in the journal.`;
                    return (
                      <td key={d.date} className="h-14 p-0 align-top sm:h-[4.5rem]">
                        <Link href={dayHref(d.date)} aria-label={label} title={label} className="flex h-full min-h-14 flex-col justify-between rounded-sm border border-border/60 p-1 text-fg hover:border-border-strong sm:min-h-[4.5rem]" style={pnlTint(d.net, lvl)}>
                          <span className="text-[11px] text-muted">{d.day}</span>
                          <span className="fig text-[10px] font-medium leading-tight sm:text-xs"><span aria-hidden="true">{pnlGlyph(d.net)}</span> {signedCompact(d.net)}</span>
                          <span className="text-[10px] leading-none text-muted">{d.trades}<span className="hidden sm:inline"> trade{d.trades === 1 ? "" : "s"}</span><span className="sr-only sm:hidden"> trades</span></span>
                        </Link>
                      </td>
                    );
                  })}
                  <td className="hidden h-[4.5rem] rounded-sm border border-border/60 p-1.5 align-top text-center md:table-cell">
                    <span className="block text-[11px] text-muted">{SHORT(w.from)} – {SHORT(w.to)}</span>
                    {w.trades > 0 ? <span className={`fig mt-1 block text-xs ${pnlClass(w.net)}`}>{pnlGlyph(w.net)} {signedMoney(w.net, cur)}<span className="block text-[10px] text-muted">{w.trades} trade{w.trades === 1 ? "" : "s"}</span></span> : <span className="mt-1 block text-xs text-muted">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ColourLegend />
      </Card>

      <Card className="md:hidden">
        <h2 className="text-sm font-medium">Weekly totals</h2>
        <ul className="mt-2 divide-y divide-border text-sm">
          {cal.weeks.map((w) => (
            <li key={w.from} className="flex items-baseline justify-between gap-3 py-2">
              <span className="text-muted">{SHORT(w.from)} – {SHORT(w.to)}</span>
              {w.trades > 0 ? <span className={`fig ${pnlClass(w.net)}`}>{pnlGlyph(w.net)} {signedMoney(w.net, cur)} <span className="text-xs text-muted">· {w.trades} trade{w.trades === 1 ? "" : "s"}</span></span> : <span className="text-muted">—</span>}
            </li>
          ))}
        </ul>
      </Card>

      {cal.trades === 0 && (
        <p className="text-sm text-muted">No closed trades in {MONTH(year, month)}{hasFilters ? " with these filters" : ""}. {hasFilters && <Link href={filterHref("/app/calendar", NO_FILTERS, { month: mk })} className={linkCls}>Reset filters</Link>}</p>
      )}
      <p className="text-xs text-muted">A trade is counted on the day it closed, in {tz} (change it in Settings). Weeks run Monday to Sunday. Statistics describe your recorded past trades only.</p>
    </div>
  );
}

function Summary({ label, value, hint, cls = "" }: { label: string; value: string; hint?: string; cls?: string }) {
  return (
    <div className="rounded-lg border border-border bg-panel p-3.5 sm:p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={`fig mt-1.5 text-lg font-medium sm:text-xl ${cls}`}>{value}</p>
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}
