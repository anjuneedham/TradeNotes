import Link from "next/link";
import type { ReactNode } from "react";
import { RANGES, NO_FILTERS, activeFilterCount, filterHref, type Filters, type FilterOptions } from "@/lib/filters";
import { EMOTIONS, MISTAKES, SESSIONS } from "@/lib/trade-schema";
import { Badge, inputCls, btnCls, btnGhostCls } from "./ui";

const Lbl = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="block text-xs text-muted"><span className="mb-1 block">{label}</span>{children}</label>
);

/**
 * The one filter bar (date range, account, strategy, instrument, side, tags, session). A plain GET form: the state IS the URL,
 * it works without JavaScript, and the server parses it with `parseFilters` (invalid values are ignored there).
 * `extra` renders page-specific controls inside the same form (e.g. the journal's search box); `keep` carries params the
 * page needs across a filter change (e.g. the calendar's month).
 */
export function FilterBar({ path, filters, options, switcherLabel, extra, keep = {}, showAccount = true, showDate = true, showStrategy = true, forceOpen = false }: {
  path: string; filters: Filters; options: FilterOptions; switcherLabel: string; extra?: ReactNode; keep?: Record<string, string | undefined>; showAccount?: boolean; showDate?: boolean; showStrategy?: boolean; forceOpen?: boolean;
}) {
  const active = activeFilterCount(filters);
  const custom = Boolean(filters.from || filters.to);
  const strategies = filters.strategy && !options.strategies.includes(filters.strategy) ? [filters.strategy, ...options.strategies] : options.strategies;
  const symbols = filters.symbol && !options.symbols.includes(filters.symbol) ? [filters.symbol, ...options.symbols] : options.symbols;
  const sessions = filters.session && !(SESSIONS as readonly string[]).includes(filters.session) ? [filters.session, ...SESSIONS] : SESSIONS;
  return (
    <details className="group rounded-lg border border-border bg-panel" open={active > 0 || forceOpen} data-testid="filter-bar">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">Filters {active > 0 && <Badge tone="accent">{active} active</Badge>}</span>
        <span aria-hidden="true" className="text-muted group-open:rotate-180">▾</span>
      </summary>
      <form method="get" action={path} role="search" aria-label="Filter trades" className="border-t border-border p-3.5">
        {Object.entries(keep).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {showDate && (<>
            <Lbl label="Period">
              <select name="range" defaultValue={custom ? "all" : filters.range} className={inputCls}>
                {RANGES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </Lbl>
            <Lbl label="From (your time zone)"><input type="date" name="from" defaultValue={filters.from ?? ""} className={inputCls} /></Lbl>
            <Lbl label="To (inclusive)"><input type="date" name="to" defaultValue={filters.to ?? ""} className={inputCls} /></Lbl>
          </>)}
          {showAccount && options.accounts.length > 1 && (
            <Lbl label="Account">
              <select name="account" defaultValue={filters.account ?? ""} className={inputCls}>
                <option value="">Switcher: {switcherLabel}</option>
                <option value="all">All accounts</option>
                {options.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </Lbl>
          )}
          {showStrategy && (<Lbl label="Strategy">
            <select name="strategy" defaultValue={filters.strategy ?? ""} className={inputCls}>
              <option value="">All strategies</option>
              {strategies.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Lbl>)}
          <Lbl label="Instrument">
            <select name="symbol" defaultValue={filters.symbol ?? ""} className={inputCls}>
              <option value="">All instruments</option>
              {symbols.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Lbl>
          <Lbl label="Direction">
            <select name="side" defaultValue={filters.side ?? ""} className={inputCls}>
              <option value="">Long and short</option><option value="long">Long</option><option value="short">Short</option>
            </select>
          </Lbl>
          <Lbl label="Session">
            <select name="session" defaultValue={filters.session ?? ""} className={inputCls}>
              <option value="">All sessions</option>
              {sessions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Lbl>
          {extra}
        </div>
        <fieldset className="mt-3">
          <legend className="text-xs text-muted">Tags (a trade matches if it has any ticked tag)</legend>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
            {[...MISTAKES, ...EMOTIONS, ...filters.tags.filter((t) => !(MISTAKES as readonly string[]).includes(t) && !(EMOTIONS as readonly string[]).includes(t))].map((t) => (
              <label key={t} className="inline-flex min-h-8 items-center gap-1.5"><input type="checkbox" name="tag" value={t} defaultChecked={filters.tags.includes(t)} className="h-4 w-4 accent-accent" />{t}</label>
            ))}
          </div>
        </fieldset>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button className={btnCls}>Apply filters</button>
          {active > 0 && <Link href={filterHref(path, NO_FILTERS, keep)} className={`${btnGhostCls} border-transparent text-muted`}>Reset</Link>}
          {showDate && custom && <span className="text-xs text-muted">Custom dates override the period.</span>}
        </div>
      </form>
    </details>
  );
}
