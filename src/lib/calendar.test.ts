import { describe, it, expect } from "vitest";
import { calendarMonth, parseMonth, monthWindow, shiftMonth, monthKey } from "./calendar";
import { signedCompact } from "./format";

// November 2026: the 1st is a Sunday (Jan 1 2026 is a Thursday; Nov 1 is day 305, 304 days later = 43 weeks + 3 days). Weeks run Monday-Sunday.
const rows = [
  { netPnl: 50, closedAt: "2026-11-01T03:00:00Z" },   // UTC Nov 1  | New York Oct 31 23:00 (EDT, DST ends later that night)
  { netPnl: 100, closedAt: "2026-11-02T15:00:00Z" },  // Nov 2 10:00 EST
  { netPnl: -30, closedAt: "2026-11-02T20:00:00Z" },  // Nov 2 15:00 EST
  { netPnl: 5, closedAt: "2026-11-03T02:30:00Z" },    // UTC Nov 3 | New York Nov 2 21:30
  { netPnl: 10, closedAt: "2026-11-30T23:00:00Z" },   // Nov 30 18:00 EST
  { netPnl: 7, closedAt: "2026-12-01T03:00:00Z" },    // UTC Dec 1 (outside) | New York Nov 30 22:00 (inside)
  { netPnl: 1000, closedAt: "2026-10-31T23:30:00Z" }, // outside the month in both zones
  { netPnl: 999, closedAt: null },                    // open trade: never on the calendar
];
const day = (m: ReturnType<typeof calendarMonth>, date: string) => m.weeks.flatMap((w) => w.days).find((d) => d.date === date)!;

describe("calendarMonth in UTC", () => {
  const m = calendarMonth(rows, 2026, 11, "UTC");
  it("lays out six Monday-first weeks (Nov 1 is the last cell of the first row)", () => {
    expect(m.weeks).toHaveLength(6);
    expect(m.weeks[0].days.map((d) => d.date)).toEqual(["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01"]);
    expect(m.weeks[0].days.map((d) => d.inMonth)).toEqual([false, false, false, false, false, false, true]);
    expect(m.weeks[5].days.map((d) => d.date)).toEqual(["2026-11-30", "2026-12-01", "2026-12-02", "2026-12-03", "2026-12-04", "2026-12-05", "2026-12-06"]);
    expect(m.weeks[5].days.map((d) => d.inMonth)).toEqual([true, false, false, false, false, false, false]);
  });
  it("sums trades per local day and ignores other months and open trades", () => {
    expect(day(m, "2026-11-01")).toMatchObject({ net: 50, trades: 1, wins: 1, losses: 0 });
    expect(day(m, "2026-11-02")).toMatchObject({ net: 70, trades: 2, wins: 1, losses: 1 });
    expect(day(m, "2026-11-03")).toMatchObject({ net: 5, trades: 1 });
    expect(day(m, "2026-11-30")).toMatchObject({ net: 10, trades: 1 });
    expect(day(m, "2026-12-01")).toMatchObject({ net: 0, trades: 0, inMonth: false }); // the Dec 1 trade is not shown in November
  });
  it("month and weekly totals", () => {
    expect(m.trades).toBe(5); expect(m.net).toBe(135); expect(m.tradingDays).toBe(4); expect(m.winDays).toBe(4); expect(m.lossDays).toBe(0);
    expect(m.weeks.map((w) => [w.net, w.trades])).toEqual([[50, 1], [75, 3], [0, 0], [0, 0], [0, 0], [10, 1]]);
    expect(m.weeks[1].from).toBe("2026-11-02"); expect(m.weeks[1].to).toBe("2026-11-08");
    expect(m.weeks[0].from).toBe("2026-11-01"); expect(m.weeks[5].to).toBe("2026-11-30");
    expect(m.weeks.reduce((s, w) => s + w.net, 0)).toBe(m.net);
    expect(m.maxAbs).toBe(70);
  });
  it("best day is a profit, worst day only exists when there is a losing day", () => {
    expect(m.best?.date).toBe("2026-11-02"); expect(m.worst).toBeNull();
    const l = calendarMonth([{ netPnl: -40, closedAt: "2026-11-05T10:00:00Z" }, { netPnl: -10, closedAt: "2026-11-06T10:00:00Z" }], 2026, 11, "UTC");
    expect(l.worst?.date).toBe("2026-11-05"); expect(l.best).toBeNull(); expect(l.lossDays).toBe(2);
  });
});

describe("calendarMonth in New York: the zone decides which day a trade belongs to", () => {
  const m = calendarMonth(rows, 2026, 11, "America/New_York");
  it("moves late-evening UTC trades back a day and pulls the Dec 1 03:00Z trade into Nov 30", () => {
    expect(day(m, "2026-11-01").trades).toBe(0);                       // the 03:00Z trade is Oct 31 locally
    expect(day(m, "2026-11-02")).toMatchObject({ net: 75, trades: 3 }); // +100 -30 +5
    expect(day(m, "2026-11-03").trades).toBe(0);
    expect(day(m, "2026-11-30")).toMatchObject({ net: 17, trades: 2 });
    expect(m.trades).toBe(5); expect(m.net).toBe(92); expect(m.tradingDays).toBe(2);
  });
});

describe("other months", () => {
  it("a month that starts on Monday has no leading days and 28 days make exactly 4 weeks (Feb 2027)", () => {
    const m = calendarMonth([], 2027, 2, "UTC"); // Feb 1 2027 is a Monday
    expect(m.weeks).toHaveLength(4); expect(m.weeks.every((w) => w.days.every((d) => d.inMonth))).toBe(true); expect(m.trades).toBe(0); expect(m.maxAbs).toBe(0);
  });
  it("a leap February and a year boundary", () => {
    expect(calendarMonth([], 2028, 2, "UTC").weeks.flatMap((w) => w.days).filter((d) => d.inMonth)).toHaveLength(29);
    const dec = calendarMonth([{ netPnl: 12, closedAt: "2026-12-31T23:30:00Z" }], 2026, 12, "UTC");
    expect(dec.weeks.at(-1)!.days.map((d) => d.date).slice(-3)).toEqual(["2027-01-01", "2027-01-02", "2027-01-03"]);
    expect(dec.net).toBe(12);
  });
});

describe("month URL parameter, navigation and window", () => {
  const now = new Date("2026-12-01T03:00:00Z");
  it("accepts YYYY-MM, takes the first valid value, and falls back to the current month in the user's zone", () => {
    expect(parseMonth("2026-03")).toEqual({ year: 2026, month: 3 });
    expect(parseMonth(["bogus", "2026-07", "2026-08"])).toEqual({ year: 2026, month: 7 });
    for (const bad of ["2026-13", "2026-00", "26-03", "banana", "1969-12", "2101-01", "2026-3", ""]) expect(parseMonth(bad, now, "UTC")).toEqual({ year: 2026, month: 12 });
    expect(parseMonth(undefined, now, "America/New_York")).toEqual({ year: 2026, month: 11 }); // still Nov 30 evening in New York
    expect(parseMonth(undefined, now, "Not/AZone")).toEqual({ year: 2026, month: 12 });
  });
  it("shifts across year boundaries", () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftMonth(2026, 6, 0)).toEqual({ year: 2026, month: 6 });
    expect(monthKey(2026, 3)).toBe("2026-03");
  });
  it("window covers the whole LOCAL month (hand-calculated for New York, November 2026)", () => {
    const w = monthWindow(2026, 11, "America/New_York");
    expect(w.start.toISOString()).toBe("2026-11-01T04:00:00.000Z"); // midnight EDT (clocks go back later that night)
    expect(w.end.toISOString()).toBe("2026-12-01T05:00:00.000Z");   // midnight EST
    expect(monthWindow(2026, 12, "UTC").end.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });
});

describe("signedCompact (tight cells)", () => {
  it("always carries a sign and shortens thousands and millions", () => {
    expect([0, 5, 5.25, -12.4, 150, 99.96, 1234, -15600, 1500000, 12000000, -0.04].map(signedCompact)).toEqual(["0", "+5", "+5.3", "−12.4", "+150", "+100", "+1.2k", "−16k", "+1.5M", "+12M", "0"]);
    // the unit is chosen after rounding, so nothing prints as "1000" or "1000k"
    expect([999.6, 999.4, 9949, 9951, 999400, 999600, 9949000, 9951000, -999600].map(signedCompact)).toEqual(["+1k", "+999", "+9.9k", "+10k", "+999k", "+1M", "+9.9M", "+10M", "−1M"]);
  });
});
