import { z } from "zod";
import { validDate } from "./filters";
import { localDate, zonedToUtc, isValidTimeZone, DEFAULT_TZ } from "./timezone";
import { summarizeResults, tagResults, type TradeResult } from "./metrics";

/**
 * Daily, weekly and monthly reviews (pure helpers). A review is identified by (period, period_start):
 * day = that local date, week = the MONDAY of the week, month = the 1st. All dates are local calendar dates in the user's zone.
 */
export const PERIODS = ["day", "week", "month"] as const;
export type Period = (typeof PERIODS)[number];
export const isPeriod = (v: unknown): v is Period => typeof v === "string" && (PERIODS as readonly string[]).includes(v);

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const parts = (d: string) => d.split("-").map(Number) as [number, number, number];

/** The canonical period_start for any date inside the period (Monday for a week, the 1st for a month), or null for an invalid date. */
export function normalizeStart(period: Period, date: string): string | null {
  if (period === "month" && /^\d{4}-\d{2}$/.test(date)) date += "-01"; // "2026-10" is read as the month of October 2026
  if (!validDate(date)) return null;
  const [y, m, d] = parts(date);
  if (period === "day") return date;
  if (period === "month") return `${y}-${pad(m)}-01`;
  const dow = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; // Monday = 0
  return iso(Date.UTC(y, m - 1, d - dow));
}

/** The start of the period `delta` periods away (negative = earlier). `start` must already be normalised. */
export function shiftStart(period: Period, start: string, delta: number): string {
  const [y, m, d] = parts(start);
  if (period === "day") return iso(Date.UTC(y, m - 1, d + delta));
  if (period === "week") return iso(Date.UTC(y, m - 1, d + 7 * delta));
  return iso(Date.UTC(y, m - 1 + delta, 1));
}

/** The period that contains "now" in the user's zone. */
export function currentStart(period: Period, now: Date = new Date(), tz: string = DEFAULT_TZ): string {
  return normalizeStart(period, localDate(now.toISOString(), isValidTimeZone(tz) ? tz : DEFAULT_TZ))!;
}

/** [start, end) instants covering the whole local period. */
export function periodWindow(period: Period, start: string, tz: string = DEFAULT_TZ): { start: Date; end: Date } {
  const zone = isValidTimeZone(tz) ? tz : DEFAULT_TZ;
  const [y, m, d] = parts(start);
  const endDay = period === "day" ? [y, m, d + 1] : period === "week" ? [y, m, d + 7] : [y, m + 1, 1];
  return { start: new Date(zonedToUtc(y, m, d, 0, 0, 0, zone)), end: new Date(zonedToUtc(endDay[0], endDay[1], endDay[2], 0, 0, 0, zone)) };
}

const fmt = (opts: Intl.DateTimeFormatOptions, d: string) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...opts }).format(new Date(d + "T00:00:00Z"));
export function periodLabel(period: Period, start: string): string {
  if (period === "day") return fmt({ weekday: "short", day: "numeric", month: "short", year: "numeric" }, start);
  if (period === "month") return fmt({ month: "long", year: "numeric" }, start);
  const end = shiftStart("day", start, 6);
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  return `Week of ${fmt({ month: "short", day: "numeric" }, start)} – ${sameMonth ? `${Number(end.slice(8))}, ${end.slice(0, 4)}` : fmt({ month: "short", day: "numeric", year: "numeric" }, end)}`;
}

// ------------------------------------------------------------------------------------------------ the template
export const TEMPLATE = [
  { key: "went_well", label: "What worked", prompt: "Which setups, habits or decisions went well? Be specific." },
  { key: "to_repeat", label: "What to repeat", prompt: "Which behaviours do you want to do again next time?" },
  { key: "to_improve", label: "Mistakes", prompt: "What went wrong, and what was the cost? Look at the costliest mistake above." },
  { key: "rule_breaks", label: "Rule breaks", prompt: "When did you break your own rules, and what triggered it?" },
  { key: "focus_next", label: "Next plan", prompt: "One to three concrete things you will do differently next period." },
] as const;
export type ReviewField = (typeof TEMPLATE)[number]["key"];
export const REVIEW_MAX_CHARS = 5000;

const field = z.string().max(REVIEW_MAX_CHARS, `Keep each answer under ${REVIEW_MAX_CHARS.toLocaleString("en-US")} characters`).optional().transform((s) => (s ?? "").trim() || null);
export const reviewSchema = z.object({ went_well: field, to_repeat: field, to_improve: field, rule_breaks: field, focus_next: field }).refine((d) => Object.values(d).some((v) => v !== null), { message: "Write something in at least one box before saving.", path: ["went_well"] });

// ------------------------------------------------------------------------------------------------ auto-filled stats
export interface ReviewStats {
  currency: string; scope: string;
  trades: number; wins: number; losses: number; winRate: number | null; netPnl: number; expectancy: number | null; avgR: number | null;
  profitFactor: number | null; maxDrawdown: number;
  topMistake: { tag: string; trades: number; netPnl: number } | null;
}
const r6 = (x: number | null) => (x === null ? null : Math.round(x * 1e6) / 1e6);

/** The figures a review starts from, from the period's closed trades (same engine as the dashboard). */
export function buildStats(rows: readonly (TradeResult & { mistakes: readonly string[] })[], currency: string, scope: string): ReviewStats {
  const s = summarizeResults(rows);
  const worst = Object.entries(tagResults(rows, (t) => t.mistakes)).sort((a, b) => a[1].netPnl - b[1].netPnl)[0];
  return {
    currency, scope, trades: s.tradeCount, wins: s.wins, losses: s.losses, winRate: r6(s.winRate), netPnl: s.netPnl, expectancy: s.expectancy, avgR: r6(s.avgR),
    profitFactor: r6(s.profitFactor), maxDrawdown: s.maxDrawdown,
    topMistake: worst && worst[1].netPnl < 0 ? { tag: worst[0], trades: worst[1].tradeCount, netPnl: worst[1].netPnl } : null,
  };
}
