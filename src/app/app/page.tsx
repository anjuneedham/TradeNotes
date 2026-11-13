import Link from "next/link";
import { getContext, scopeFor } from "@/lib/app-context";
import { parseFilters, withKnownAccount, activeFilterCount, dateLabel, filterHref, NO_FILTERS } from "@/lib/filters";
import { FilterBar } from "@/components/FilterBar";
import { loadResults, loadLatest, loadFilterOptions, type LoadedResults, type LatestRow } from "@/lib/trades-data";
import { Card, Notice, Badge, btnCls, linkCls, PageHeader } from "@/components/ui";
import { DashboardView } from "@/components/DashboardView";

export const metadata = { title: "Dashboard — TradeNotes" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await getContext();
  const { db, profile, tz } = ctx;
  const f = withKnownAccount(parseFilters(await searchParams), ctx.accounts.map((a) => a.id));
  const scope = scopeFor(ctx.accounts, ctx.scope, f.account);
  const filtered = activeFilterCount(f) > 0;
  const cur = scope.currency;
  const showHelp = profile?.show_explanations ?? true;

  const now = new Date(), d60 = new Date(now.getTime() - 60 * 86400000);
  let loaded: LoadedResults, windowed: LoadedResults, latest: LatestRow[], options;
  try {
    // One SQL query per need: the filtered results, the last-60-days window for "what changed" (other filters still apply, the date filter does not),
    // the five latest trades, and the dropdown values. The database filters and computes per-trade results; metrics.ts aggregates.
    const noDate = f.range === "all" && !f.from && !f.to; // then the main result already covers the last 60 days: no second query
    let main: LoadedResults;
    [main, latest, options] = await Promise.all([loadResults(db, scope.accountIds, cur, f, tz), loadLatest(db, scope.accountIds, cur, f, tz, 5), loadFilterOptions(db, ctx.accounts)]);
    loaded = main;
    windowed = noDate ? main : await loadResults(db, scope.accountIds, cur, f, tz, { window: { start: d60, end: null } });
  }
  catch (e) { console.error("dashboard load failed", e); return <Notice kind="error">We couldn&apos;t load your trades just now. Please refresh. Your data is safe.</Notice>; }
  const { rows, excluded } = loaded;
  const totalMatching = rows.length + excluded.open_or_partial.length + excluded.missing_fx.length + excluded.invalid.length;
  const bar = <FilterBar path="/app" filters={f} options={options!} switcherLabel={ctx.scope.label} />;

  if (totalMatching === 0 && !filtered) {
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

  return (
    <DashboardView
      sub={<>{scope.label} · {cur} · {rows.length} closed trade{rows.length === 1 ? "" : "s"}, {dateLabel(f)}</>}
      bar={bar} rows={rows} excluded={excluded} recentRows={windowed.rows} latest={latest} cur={cur} showHelp={showHelp} now={now} scopeMixed={scope.mixed}
      links={{ trade: (id) => `/app/journal/${id}`, analytics: filterHref("/app/analytics", f), mistakes: "/app/analytics#mistake-cost", learn: "/learn", journal: "/app/journal", openTrades: "/app/journal?status=open" }}
      emptyNote={!filtered ? "Statistics appear once you have at least one closed trade." : <>No closed trades match these filters. <Link href={filterHref("/app", NO_FILTERS)} className={linkCls}>Reset filters</Link></>}
    />
  );
}
