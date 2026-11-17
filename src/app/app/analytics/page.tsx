import Link from "next/link";
import { getContext, scopeFor } from "@/lib/app-context";
import { parseFilters, withKnownAccount, activeFilterCount, filterHref, NO_FILTERS } from "@/lib/filters";
import { FilterBar } from "@/components/FilterBar";
import { loadResults, loadFilterOptions, type LoadedResults } from "@/lib/trades-data";
import { Notice, PageHeader, EmptyState, btnCls, linkCls } from "@/components/ui";
import { AnalyticsView } from "@/components/AnalyticsView";

export const metadata = { title: "Analytics — TradeNotes" };

export default async function Analytics({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await getContext();
  const { db, profile, tz } = ctx;
  const f = withKnownAccount(parseFilters(await searchParams), ctx.accounts.map((a) => a.id));
  const scope = scopeFor(ctx.accounts, ctx.scope, f.account);
  const filtered = activeFilterCount(f) > 0;
  const cur = scope.currency;
  const showHelp = profile?.show_explanations ?? true;

  let loaded: LoadedResults, options;
  try { [loaded, options] = await Promise.all([loadResults(db, scope.accountIds, cur, f, tz, { checks: true }), loadFilterOptions(db, ctx.accounts)]); }
  catch (e) { console.error("analytics load failed", e); return <Notice kind="error">We couldn&apos;t load your trades just now. Please refresh. Your data is safe.</Notice>; }
  const { rows, excluded } = loaded;
  const totalMatching = rows.length + excluded.open_or_partial.length + excluded.missing_fx.length + excluded.invalid.length;
  const header = (<>
    <PageHeader title="Analytics" sub="Where your results come from. Every table uses closed trades only." />
    <FilterBar path="/app/analytics" filters={f} options={options!} switcherLabel={ctx.scope.label} />
  </>);

  if (rows.length === 0) {
    return (
      <div className="space-y-5">
        {header}
        <EmptyState title={totalMatching === 0 && !filtered ? "No trades yet" : filtered ? "No closed trades match these filters" : "No closed trades yet"}
          action={totalMatching === 0 && !filtered ? <Link href="/app/journal/new" className={btnCls}>Log your first trade</Link> : filtered ? <Link href={filterHref("/app/analytics", NO_FILTERS)} className={linkCls}>Reset filters</Link> : undefined}>
          Breakdowns appear once at least one trade is fully closed.
        </EmptyState>
      </div>
    );
  }

  return <AnalyticsView header={header} rows={rows} excluded={excluded} tz={tz} cur={cur} showHelp={showHelp} />;
}
