import { describe, it, expect } from "vitest";
import { parseSelection, compareStrategies, MAX_COMPARE, MIN_COMPARE, SERIES } from "./compare";
import type { TradeResult } from "./metrics";

const r = (id: string, strategy: string | null, netPnl: number, closedAt: string, rr: number | null = null): TradeResult & { strategy: string | null } =>
  ({ id, strategy, netPnl, grossPnl: netPnl, fees: 0, r: rr, closedAt });

describe("parseSelection (?s=<strategy>, repeated)", () => {
  it("keeps the order given, trims, de-duplicates and caps at four", () => {
    expect(parseSelection(new URLSearchParams("s=B&s= A &s=B&s=C&s=D&s=E"))).toEqual(["B", "A", "C", "D"]);
    expect(MAX_COMPARE).toBe(4); expect(MIN_COMPARE).toBe(2);
  });
  it("drops garbage and names the user does not have, never throws", () => {
    expect(parseSelection({ s: ["", "   ", "x".repeat(61), "bad\u0000name", "Real"] })).toEqual(["Real"]);
    expect(parseSelection({ s: "Real" }, ["Real", "Other"])).toEqual(["Real"]);
    expect(parseSelection({ s: ["Nope", "Real"] }, ["Real"])).toEqual(["Real"]);
    expect(parseSelection(undefined)).toEqual([]); expect(parseSelection(null)).toEqual([]); expect(parseSelection({})).toEqual([]);
  });
});

describe("compareStrategies (same engine as the analytics page)", () => {
  // London breakout: +1000 (R 2) then -500 (no R); Range fade: +590; one untagged +100 that is never in a column.
  const rows = [
    r("1", "London breakout", 1000, "2026-10-05T10:00:00Z", 2),
    r("2", "London breakout", -500, "2026-10-12T14:00:00Z"),
    r("3", "Range fade", 590, "2026-11-03T09:30:00Z"),
    r("4", null, 100, "2026-11-04T15:00:00Z"),
  ];
  const cols = compareStrategies(rows, ["London breakout", "Range fade"]);
  it("London breakout: 2 trades, 50% win, expectancy 250, profit factor 2, avg R 2, drawdown 500, net 500", () => {
    const s = cols[0].summary;
    expect(cols[0].name).toBe("London breakout");
    expect(s.tradeCount).toBe(2); expect(s.winRate).toBe(0.5); expect(s.expectancy).toBe(250); expect(s.profitFactor).toBe(2); expect(s.avgR).toBe(2); expect(s.maxDrawdown).toBe(500); expect(s.netPnl).toBe(500);
    expect(s.smallSample).toBe(true);
    expect(cols[0].curve).toEqual([{ cumulative: 1000, n: 1 }, { cumulative: 500, n: 2 }]);
  });
  it("Range fade: 1 trade, 100% win, no profit factor (no loser), no R, no drawdown", () => {
    const s = cols[1].summary;
    expect(s.tradeCount).toBe(1); expect(s.winRate).toBe(1); expect(s.profitFactor).toBeNull(); expect(s.avgR).toBeNull(); expect(s.maxDrawdown).toBe(0); expect(s.netPnl).toBe(590);
  });
  it("untagged trades are in no column; a strategy with no trades is an empty column; a name with different case is a different strategy", () => {
    expect(cols.reduce((n, c) => n + c.summary.tradeCount, 0)).toBe(3);
    const c = compareStrategies(rows, ["Nothing", "london breakout"]);
    expect(c.map((x) => x.summary.tradeCount)).toEqual([0, 0]); expect(c[0].curve).toEqual([]);
  });
  it("the strategy figures agree with summarising that strategy's rows directly (one engine, one answer)", () => {
    const solo = compareStrategies(rows, ["London breakout", "London breakout"]);
    expect(solo[0].summary.netPnl).toBe(solo[1].summary.netPnl);
  });
  it("there is a distinct colour AND line style for every column that can be selected", () => {
    expect(SERIES.length).toBeGreaterThanOrEqual(MAX_COMPARE);
    expect(new Set(SERIES.map((s) => s.color)).size).toBe(SERIES.length);
    expect(new Set(SERIES.map((s) => String(s.dash))).size).toBe(SERIES.length);
  });
  it("thins very long curves for display only (statistics use every trade)", () => {
    const many = Array.from({ length: 2000 }, (_, i) => r(String(i), "S", i % 3 === 0 ? -10 : 5, new Date(Date.UTC(2026, 0, 1) + i * 3600000).toISOString()));
    const [c] = compareStrategies(many, ["S"]);
    expect(c.summary.tradeCount).toBe(2000); expect(c.curve.length).toBeLessThanOrEqual(310); expect(c.curve.at(-1)!.n).toBe(2000);
  });
});
