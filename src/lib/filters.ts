import { zonedToUtc, isValidTimeZone, DEFAULT_TZ } from "./timezone";

/**
 * The global filter state shared by Dashboard, Analytics, Journal and Calendar. It lives in the URL (so a view can be
 * bookmarked or shared between pages) and is parsed here, in one pure place. Anything that does not validate is ignored:
 * a hand-edited or garbage query string must never throw, never reach SQL as anything but a bound parameter, and never
 * silently change the meaning of the page (an invalid value simply behaves as if it was not there).
 *
 * Rules for repeated parameters (`?side=long&side=short`): single-valued filters take the FIRST VALID value;
 * `tag` is the one multi-valued filter (a trade matches when it carries ANY chosen tag; at most MAX_TAGS).
 */
export const RANGES = [
  { value: "all", label: "All time" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "ytd", label: "This year" },
] as const;
export type RangeId = (typeof RANGES)[number]["value"];
export const MAX_TAGS = 8;

export interface Filters {
  /** Preset period. Ignored when `from` or `to` is set (custom dates win). */
  range: RangeId;
  /** Inclusive local dates (YYYY-MM-DD) in the user's time zone. */
  from: string | null;
  to: string | null;
  /** Account id, or "all". Null = whatever the account switcher says. */
  account: string | null;
  strategy: string | null;
  /** Exact instrument as stored (upper case). */
  symbol: string | null;
  side: "long" | "short" | null;
  /** Mistake or emotion tags; a trade matches if it has any of them. */
  tags: string[];
  session: string | null;
}

export const NO_FILTERS: Filters = { range: "all", from: null, to: null, account: null, strategy: null, symbol: null, side: null, tags: [], session: null };

type Raw = Record<string, string | string[] | undefined> | URLSearchParams | undefined | null;
const values = (sp: Raw, key: string): string[] => {
  if (!sp) return [];
  if (sp instanceof URLSearchParams) return sp.getAll(key);
  const v = sp[key];
  return v === undefined ? [] : Array.isArray(v) ? v : [v];
};
const firstValid = <T,>(sp: Raw, key: string, ok: (v: string) => T | null): T | null => {
  for (const v of values(sp, key)) { const r = ok(v); if (r !== null) return r; }
  return null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CONTROL = /[\u0000-\u001f\u007f]/;
const TAG = /^[\p{L}\p{N} '’/&.-]{1,40}$/u;
const text = (max: number) => (v: string) => { const t = v.trim(); return t.length >= 1 && t.length <= max && !CONTROL.test(t) ? t : null; };

/** A real calendar date, YYYY-MM-DD, 1970-2100 (so "2026-02-30" and "banana" are both rejected). */
export function validDate(v: string): string | null {
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (y < 1970 || y > 2100) return null;
  const t = new Date(Date.UTC(y, mo - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d ? v : null;
}

export function parseFilters(sp: Raw): Filters {
  let from = firstValid(sp, "from", validDate), to = firstValid(sp, "to", validDate);
  if (from && to && from > to) [from, to] = [to, from]; // a reversed pair is read as the range between them
  const tags: string[] = [];
  for (const v of values(sp, "tag")) { const t = v.trim(); if (TAG.test(t) && !tags.includes(t)) tags.push(t); if (tags.length >= MAX_TAGS) break; }
  return {
    range: firstValid(sp, "range", (v) => RANGES.find((r) => r.value === v)?.value ?? null) ?? "all",
    from, to,
    account: firstValid(sp, "account", (v) => (v === "all" ? "all" : UUID.test(v) ? v.toLowerCase() : null)),
    strategy: firstValid(sp, "strategy", text(60)),
    symbol: firstValid(sp, "symbol", (v) => { const t = text(40)(v); return t ? t.toUpperCase() : null; }),
    side: firstValid(sp, "side", (v) => (v === "long" || v === "short" ? v : null)),
    tags,
    session: firstValid(sp, "session", text(40)),
  };
}

/** True when anything narrows the data beyond the default (all time). `account` counts: it overrides the switcher. */
export function activeFilterCount(f: Filters): number {
  return (f.from || f.to ? 1 : f.range !== "all" ? 1 : 0) + (f.account ? 1 : 0) + (f.strategy ? 1 : 0) + (f.symbol ? 1 : 0) + (f.side ? 1 : 0) + (f.tags.length ? 1 : 0) + (f.session ? 1 : 0);
}

/** Canonical query string for a filter state (defaults omitted). `extra` params are appended as given (e.g. month, page). */
export function filterParams(f: Filters, extra: Record<string, string | undefined> = {}): URLSearchParams {
  const p = new URLSearchParams();
  if (f.from || f.to) { if (f.from) p.set("from", f.from); if (f.to) p.set("to", f.to); }
  else if (f.range !== "all") p.set("range", f.range);
  if (f.account) p.set("account", f.account);
  if (f.strategy) p.set("strategy", f.strategy);
  if (f.symbol) p.set("symbol", f.symbol);
  if (f.side) p.set("side", f.side);
  for (const t of f.tags) p.append("tag", t);
  if (f.session) p.set("session", f.session);
  for (const [k, v] of Object.entries(extra)) if (v !== undefined && v !== "") p.set(k, v);
  return p;
}
export function filterHref(path: string, f: Filters, extra: Record<string, string | undefined> = {}): string {
  const q = filterParams(f, extra).toString();
  return q ? `${path}?${q}` : path;
}

export interface DateWindow { start: Date | null; end: Date | null }

/**
 * The instants a filter covers: [start, end). Custom dates are whole local days in `tz` (so "2026-03-08" in New York is
 * 24 hours or 23/25 across a DST change, not a UTC day). Presets: N x 24h back from `now`, or since local 1 January.
 */
export function dateWindow(f: Pick<Filters, "range" | "from" | "to">, tz: string = DEFAULT_TZ, now: Date = new Date()): DateWindow {
  const zone = isValidTimeZone(tz) ? tz : DEFAULT_TZ;
  if (f.from || f.to) {
    const at = (d: string, plusDays: number) => { const [y, m, dd] = d.split("-").map(Number); return new Date(zonedToUtc(y, m, dd + plusDays, 0, 0, 0, zone)); };
    return { start: f.from ? at(f.from, 0) : null, end: f.to ? at(f.to, 1) : null };
  }
  if (f.range === "all") return { start: null, end: null };
  if (f.range === "ytd") {
    const y = Number(new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric" }).format(now));
    return { start: new Date(zonedToUtc(y, 1, 1, 0, 0, 0, zone)), end: null };
  }
  const days = f.range === "7d" ? 7 : f.range === "30d" ? 30 : 90;
  return { start: new Date(now.getTime() - days * 86400000), end: null };
}

/** Human label for the date part of the filter, for page subtitles. */
export function dateLabel(f: Filters): string {
  if (f.from && f.to) return f.from === f.to ? f.from : `${f.from} to ${f.to}`;
  if (f.from) return `from ${f.from}`;
  if (f.to) return `until ${f.to}`;
  return (RANGES.find((r) => r.value === f.range)?.label ?? "All time").toLowerCase();
}

/** Values the filter bar offers (the user's own accounts, strategies and instruments). */
export interface FilterOptions {
  accounts: { id: string; name: string }[];
  strategies: string[];
  symbols: string[];
}

/** Drops an account filter that is not one of the user's accounts, so an unknown id counts as "no filter" everywhere (badge, empty states). */
export function withKnownAccount(f: Filters, accountIds: string[]): Filters {
  return f.account === null || f.account === "all" || accountIds.includes(f.account) ? f : { ...f, account: null };
}
