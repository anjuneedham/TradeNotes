import { describe, it, expect } from "vitest";
import { normalizeStart, shiftStart, currentStart, periodWindow, periodLabel, reviewSchema, buildStats, isPeriod, TEMPLATE } from "./reviews";
import type { TradeResult } from "./metrics";

describe("period starts (2026-11-13 is a Friday)", () => {
  it("normalises a date to the start of its period", () => {
    expect(normalizeStart("day", "2026-11-13")).toBe("2026-11-13");
    expect(normalizeStart("week", "2026-11-13")).toBe("2026-11-09"); // Monday
    expect(normalizeStart("week", "2026-11-09")).toBe("2026-11-09");
    expect(normalizeStart("week", "2026-11-15")).toBe("2026-11-09"); // Sunday belongs to the week that began on Monday 9th
    expect(normalizeStart("week", "2026-11-16")).toBe("2026-11-16");
    expect(normalizeStart("week", "2026-01-01")).toBe("2025-12-29"); // week crossing the year boundary
    expect(normalizeStart("month", "2026-11-30")).toBe("2026-11-01");
  });
  it("reads YYYY-MM as a month", () => { expect(normalizeStart("month", "2026-10")).toBe("2026-10-01"); expect(normalizeStart("week", "2026-10")).toBeNull(); expect(normalizeStart("month", "2026-13")).toBeNull(); });
  it("rejects invalid dates", () => { for (const bad of ["2026-02-30", "banana", "", "2026-11-1"]) expect(normalizeStart("week", bad)).toBeNull(); });
  it("shifts by whole periods across month and year boundaries", () => {
    expect(shiftStart("day", "2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftStart("week", "2026-11-09", -1)).toBe("2026-11-02");
    expect(shiftStart("week", "2026-12-28", 1)).toBe("2027-01-04");
    expect(shiftStart("month", "2026-01-01", -1)).toBe("2025-12-01");
    expect(shiftStart("month", "2026-12-01", 1)).toBe("2027-01-01");
  });
  it("finds the current period in the user's zone", () => {
    const now = new Date("2026-11-16T03:00:00Z"); // Sunday evening in New York, Monday in UTC
    expect(currentStart("week", now, "America/New_York")).toBe("2026-11-09");
    expect(currentStart("week", now, "UTC")).toBe("2026-11-16");
    expect(currentStart("day", now, "America/New_York")).toBe("2026-11-15");
    expect(currentStart("month", new Date("2026-12-01T03:00:00Z"), "America/New_York")).toBe("2026-11-01");
  });
  it("window covers the local period (New York, DST day = 23 h; week and month)", () => {
    const d = periodWindow("day", "2026-03-08", "America/New_York");
    expect((d.end.getTime() - d.start.getTime()) / 3600000).toBe(23);
    const w = periodWindow("week", "2026-11-09", "UTC");
    expect([w.start.toISOString(), w.end.toISOString()]).toEqual(["2026-11-09T00:00:00.000Z", "2026-11-16T00:00:00.000Z"]);
    const m = periodWindow("month", "2026-02-01", "UTC");
    expect(m.end.toISOString()).toBe("2026-03-01T00:00:00.000Z");
  });
  it("labels", () => {
    expect(periodLabel("day", "2026-11-13")).toBe("Fri, Nov 13, 2026");
    expect(periodLabel("month", "2026-11-01")).toBe("November 2026");
    expect(periodLabel("week", "2026-11-09")).toBe("Week of Nov 9 – 15, 2026");
    expect(periodLabel("week", "2026-11-30")).toBe("Week of Nov 30 – Dec 6, 2026");
    expect(isPeriod("week")).toBe(true); expect(isPeriod("year")).toBe(false);
  });
});

describe("template and validation", () => {
  it("has the five prompts in order", () => { expect(TEMPLATE.map((t) => t.label)).toEqual(["What worked", "What to repeat", "Mistakes", "Rule breaks", "Next plan"]); });
  it("trims, turns blanks into null, and needs at least one answer", () => {
    const ok = reviewSchema.safeParse({ went_well: "  patient entries \n", to_repeat: "   " });
    expect(ok.success && ok.data).toMatchObject({ went_well: "patient entries", to_repeat: null, to_improve: null, rule_breaks: null, focus_next: null });
    const empty = reviewSchema.safeParse({ went_well: "  ", focus_next: "" });
    expect(empty.success).toBe(false);
  });
  it("caps each answer at 5,000 characters", () => {
    expect(reviewSchema.safeParse({ went_well: "x".repeat(5000) }).success).toBe(true);
    expect(reviewSchema.safeParse({ went_well: "x".repeat(5001) }).success).toBe(false);
  });
});

describe("buildStats (hand-calculated)", () => {
  const t = (id: string, net: number, closedAt: string, mistakes: string[], r: number | null = null): TradeResult & { mistakes: string[] } => ({ id, netPnl: net, grossPnl: net, fees: 0, r, closedAt, mistakes });
  const rows = [t("a", 120, "2026-11-09T10:00:00Z", [], 1.2), t("b", -50, "2026-11-10T10:00:00Z", ["Moved stop", "Oversized"], -0.5), t("c", -30, "2026-11-11T10:00:00Z", ["Oversized"]), t("d", 80, "2026-11-12T10:00:00Z", ["Moved stop"], 0.8)];
  it("summarises the period and finds the costliest mistake tag", () => {
    const s = buildStats(rows, "USD", "My Account");
    // net 120-50-30+80 = 120; 2 wins 2 losses; PF 200/80 = 2.5; expectancy 30; avg R (1.2-0.5+0.8)/3 = 0.5; DD: 120 -> 70 -> 40 = 80
    expect(s).toMatchObject({ currency: "USD", scope: "My Account", trades: 4, wins: 2, losses: 2, winRate: 0.5, netPnl: 120, expectancy: 30, profitFactor: 2.5, maxDrawdown: 80 });
    expect(s.avgR).toBeCloseTo(0.5, 9);
    // Oversized: -50 + -30 = -80 over 2 trades; Moved stop: -50 + 80 = +30
    expect(s.topMistake).toEqual({ tag: "Oversized", trades: 2, netPnl: -80 });
  });
  it("no costly mistake, no trades", () => {
    expect(buildStats([t("a", 10, "2026-11-09T10:00:00Z", ["Moved stop"])], "USD", "x").topMistake).toBeNull();
    expect(buildStats([], "USD", "x")).toMatchObject({ trades: 0, winRate: null, netPnl: 0, expectancy: null, profitFactor: null, topMistake: null });
  });
});
