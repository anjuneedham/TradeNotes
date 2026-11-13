/**
 * Time-zone helpers (pure; Intl only, no libraries). TradeNotes stores every timestamp in UTC.
 * Broker exports often write local wall-clock times with no offset; those are interpreted in the time zone the user
 * picks (profile setting, overridable per import) and converted to UTC here.
 */
export const DEFAULT_TZ = "UTC";

/** Building an Intl.DateTimeFormat costs ~50-100 microseconds; analytics calls these helpers once per trade, so formatters and validity are cached per zone. */
const validity = new Map<string, boolean>();
const offsetFormats = new Map<string, Intl.DateTimeFormat>();
const dateFormats = new Map<string, Intl.DateTimeFormat>();

export function isValidTimeZone(tz: string): boolean {
  if (!tz || tz.length > 64) return false;
  const known = validity.get(tz);
  if (known !== undefined) return known;
  let ok = true;
  try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); } catch { ok = false; }
  if (validity.size < 500) validity.set(tz, ok);
  return ok;
}

/** Offset of `tz` from UTC at instant `ms`, in milliseconds (e.g. New York in winter = -5h). */
export function tzOffsetMs(ms: number, tz: string): number {
  let fmt = offsetFormats.get(tz);
  if (!fmt) { fmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }); if (offsetFormats.size < 500) offsetFormats.set(tz, fmt); }
  const parts = fmt.formatToParts(new Date(ms));
  const g = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asUtc = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour") % 24, g("minute"), g("second"));
  return asUtc - Math.floor(ms / 1000) * 1000;
}

/** Wall-clock time in `tz` -> UTC epoch ms. Handles DST (a non-existent spring-forward time resolves forward by the gap). */
export function zonedToUtc(y: number, mo: number, d: number, h: number, mi: number, s: number, tz: string): number {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  if (tz === "UTC") return guess;
  const c1 = guess - tzOffsetMs(guess, tz);
  if (guess - tzOffsetMs(c1, tz) === c1) return c1;
  const c2 = guess - tzOffsetMs(c1, tz);
  if (guess - tzOffsetMs(c2, tz) === c2) return c2;
  return c1; // wall time skipped by a DST jump: move forward by the gap
}

/** Fixed offsets for zone abbreviations that some US brokers append (e.g. Webull "11/03/2025 09:31:05 EST"). */
const ABBR: Record<string, number> = { UTC: 0, GMT: 0, Z: 0, EST: -5, EDT: -4, CST: -6, CDT: -5, MST: -7, MDT: -6, PST: -8, PDT: -7, BST: 1, CET: 1, CEST: 2, EET: 2, EEST: 3 };

export type DateOrder = "ymd" | "mdy" | "dmy";

/**
 * Parse a broker timestamp. Accepts ISO with offset/Z (offset respected), "YYYY-MM-DD HH:MM[:SS]", "YYYY.MM.DD HH:MM:SS" (MetaTrader),
 * "YYYYMMDD;HHMMSS" / "YYYYMMDD HHMMSS" (Interactive Brokers), "MM/DD/YYYY HH:MM:SS[ AM|PM][ EST]" (US) or "DD/MM/YYYY" with order "dmy",
 * "M/D/YY" two-digit years, and Unix epoch seconds/milliseconds. Naive values are read in `tz`. Returns an ISO string (UTC) or null.
 */
export function parseBrokerTime(raw: unknown, tz = DEFAULT_TZ, order: DateOrder = "mdy"): string | null {
  let s = String(raw ?? "").trim().replace(/\s+/g, " ");
  if (!s) return null;
  if (/^\d{10}(\d{3})?$/.test(s)) { const n = Number(s); return new Date(s.length === 10 ? n * 1000 : n).toISOString(); }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/i.test(s)) { const d = new Date(s); return isNaN(d.getTime()) ? null : d.toISOString(); }

  let fixed: number | null = null;
  const ab = s.match(/\s([A-Z]{1,4})$/);
  if (ab && ab[1] in ABBR) { fixed = ABBR[ab[1]]; s = s.slice(0, -ab[0].length); }
  const off = s.match(/\s?([+-])(\d{2}):?(\d{2})$/);
  if (off && /\d[ T]\d/.test(s)) { fixed = (off[1] === "-" ? -1 : 1) * (Number(off[2]) + Number(off[3]) / 60); s = s.slice(0, -off[0].length); }

  let y: number, mo: number, d: number, rest: string;
  let m: RegExpMatchArray | null;
  if ((m = s.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})[ T,;]*(.*)$/))) { [y, mo, d, rest] = [Number(m[1]), Number(m[2]), Number(m[3]), m[4]]; }
  else if ((m = s.match(/^(\d{4})(\d{2})(\d{2})[ ;,]*(\d{2}):?(\d{2}):?(\d{2})?$/))) { [y, mo, d, rest] = [Number(m[1]), Number(m[2]), Number(m[3]), `${m[4]}:${m[5]}:${m[6] ?? "00"}`]; }
  else if ((m = s.match(/^(\d{1,2})[-./](\d{1,2})[-./](\d{4}|\d{2})(?!\d)[ T,;]*(.*)$/))) {
    const a = Number(m[1]), b = Number(m[2]);
    y = Number(m[3]); if (y < 100) y += 2000;
    [mo, d] = order === "dmy" || (order === "mdy" && a > 12) ? [b, a] : [a, b];
    rest = m[4];
  } else return null;

  let h = 0, mi = 0, sec = 0;
  if (rest) {
    const t = rest.match(/^(\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?\s*(AM|PM)?$/i);
    if (!t) return null;
    h = Number(t[1]); mi = Number(t[2]); sec = Number(t[3] ?? 0);
    if (t[4]) { const pm = t[4].toUpperCase() === "PM"; if (h === 12) h = pm ? 12 : 0; else if (pm) h += 12; }
  }
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59 || sec > 59) return null;
  const ms = fixed !== null ? Date.UTC(y, mo - 1, d, h, mi, sec) - fixed * 3600000 : zonedToUtc(y, mo, d, h, mi, sec, isValidTimeZone(tz) ? tz : "UTC");
  const out = new Date(ms);
  return isNaN(out.getTime()) || out.getUTCDate() === undefined ? null : out.toISOString();
}

/** A short curated list for the settings dropdown (any valid IANA zone is accepted server-side). */
export const COMMON_TIMEZONES = [
  "UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Jamaica", "America/Toronto", "America/Sao_Paulo",
  "Europe/London", "Europe/Berlin", "Europe/Athens", "Africa/Lagos", "Africa/Johannesburg", "Asia/Dubai", "Asia/Kolkata", "Asia/Singapore",
  "Asia/Hong_Kong", "Asia/Tokyo", "Australia/Sydney", "Pacific/Auckland",
] as const;

/** Local calendar date (YYYY-MM-DD) of a UTC instant in `tz`. */
export function localDate(iso: string, tz = DEFAULT_TZ): string {
  const zone = isValidTimeZone(tz) ? tz : "UTC";
  let fmt = dateFormats.get(zone);
  if (!fmt) { fmt = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }); if (dateFormats.size < 500) dateFormats.set(zone, fmt); }
  return fmt.format(new Date(iso));
}
/** Local weekday (0 = Sunday) and hour of a UTC instant in `tz`. */
export function localDayHour(iso: string, tz = DEFAULT_TZ): { day: number; hour: number } {
  const ms = new Date(iso).getTime();
  const local = new Date(ms + tzOffsetMs(ms, isValidTimeZone(tz) ? tz : "UTC"));
  return { day: local.getUTCDay(), hour: local.getUTCHours() };
}
