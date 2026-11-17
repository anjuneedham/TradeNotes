import { localDate, zonedToUtc, isValidTimeZone, DEFAULT_TZ } from "./timezone";
import { intensityLevel } from "./analytics-extra";

/**
 * Month-grid maths for the calendar (pure). A trade belongs to the LOCAL day (in the user's time zone) on which it closed.
 * Weeks run Monday to Sunday. Days outside the month are shown greyed and never counted.
 */
export interface CalDay { date: string; inMonth: boolean; day: number; net: number; trades: number; wins: number; losses: number }
export interface CalWeek { days: CalDay[]; net: number; trades: number; /** first and last in-month date of the week */ from: string; to: string }
export interface CalMonth {
  year: number; month: number; weeks: CalWeek[];
  net: number; trades: number; tradingDays: number; winDays: number; lossDays: number;
  /** best day only if it is a profit, worst day only if it is a loss */
  best: CalDay | null; worst: CalDay | null;
  maxAbs: number;
}

const pad = (n: number) => String(n).padStart(2, "0");
export const monthKey = (y: number, m: number) => `${y}-${pad(m)}`;
export function shiftMonth(y: number, m: number, delta: number): { year: number; month: number } {
  const i = y * 12 + (m - 1) + delta;
  return { year: Math.floor(i / 12), month: (i % 12) + 1 };
}
const isoDate = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10);

/** `YYYY-MM` from the URL (first valid value wins); anything else means "the current month in the user's zone". */
export function parseMonth(v: string | string[] | undefined, now: Date = new Date(), tz: string = DEFAULT_TZ): { year: number; month: number } {
  for (const s of Array.isArray(v) ? v : v === undefined ? [] : [v]) {
    const m = s.match(/^(\d{4})-(\d{2})$/);
    if (m && Number(m[1]) >= 1970 && Number(m[1]) <= 2100 && Number(m[2]) >= 1 && Number(m[2]) <= 12) return { year: Number(m[1]), month: Number(m[2]) };
  }
  const [y, mo] = localDate(now.toISOString(), isValidTimeZone(tz) ? tz : DEFAULT_TZ).split("-").map(Number);
  return { year: y, month: mo };
}

/** [start, end) instants covering the whole local month. */
export function monthWindow(year: number, month: number, tz: string = DEFAULT_TZ): { start: Date; end: Date } {
  const zone = isValidTimeZone(tz) ? tz : DEFAULT_TZ;
  return { start: new Date(zonedToUtc(year, month, 1, 0, 0, 0, zone)), end: new Date(zonedToUtc(year, month + 1, 1, 0, 0, 0, zone)) };
}

export function calendarMonth(rows: readonly { netPnl: number; closedAt: string | null }[], year: number, month: number, tz: string = DEFAULT_TZ): CalMonth {
  const key = monthKey(year, month);
  const byDay = new Map<string, { net: number; trades: number; wins: number; losses: number }>();
  for (const r of rows) {
    if (!r.closedAt) continue;
    const d = localDate(r.closedAt, tz);
    if (!d.startsWith(key)) continue;
    const e = byDay.get(d) ?? { net: 0, trades: 0, wins: 0, losses: 0 };
    e.net += r.netPnl; e.trades++; if (r.netPnl > 0) e.wins++; else if (r.netPnl < 0) e.losses++;
    byDay.set(d, e);
  }
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lead = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7; // Monday = 0
  const cells = Math.ceil((lead + daysInMonth) / 7) * 7;
  const round = (x: number) => Math.round(x * 1e8) / 1e8;
  const weeks: CalWeek[] = [];
  let net = 0, trades = 0, tradingDays = 0, winDays = 0, lossDays = 0, maxAbs = 0;
  let best: CalDay | null = null, worst: CalDay | null = null;
  for (let w = 0; w < cells / 7; w++) {
    const days: CalDay[] = [];
    for (let i = 0; i < 7; i++) {
      const dayNum = w * 7 + i - lead + 1;
      const inMonth = dayNum >= 1 && dayNum <= daysInMonth;
      const date = isoDate(year, month, dayNum);
      const e = inMonth ? byDay.get(date) : undefined;
      const d: CalDay = { date, inMonth, day: new Date(Date.UTC(year, month - 1, dayNum)).getUTCDate(), net: e ? round(e.net) : 0, trades: e?.trades ?? 0, wins: e?.wins ?? 0, losses: e?.losses ?? 0 };
      days.push(d);
      if (d.trades > 0) {
        net += d.net; trades += d.trades; tradingDays++; maxAbs = Math.max(maxAbs, Math.abs(d.net));
        if (d.net > 0) winDays++; else if (d.net < 0) lossDays++;
        if (d.net > 0 && (!best || d.net > best.net)) best = d;
        if (d.net < 0 && (!worst || d.net < worst.net)) worst = d;
      }
    }
    const inM = days.filter((d) => d.inMonth);
    weeks.push({ days, net: round(inM.reduce((s, d) => s + d.net, 0)), trades: inM.reduce((s, d) => s + d.trades, 0), from: inM[0].date, to: inM[inM.length - 1].date });
  }
  return { year, month, weeks, net: round(net), trades, tradingDays, winDays, lossDays, best, worst, maxAbs };
}

/** Size word for a day, shared with the heatmap (so sign and size are written, never colour alone). */
export const dayIntensity = (d: CalDay, maxAbs: number) => intensityLevel(d.net, maxAbs);
