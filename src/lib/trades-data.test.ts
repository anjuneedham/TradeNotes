import { describe, it, expect } from "vitest";
import { closedBetween, worstResult } from "./trades-data";
import { tagResults, groupResults, summarizeResults, summarize, type TradeInput, type TradeResult } from "./metrics";
import { downsampleCurve } from "./curve";

const res = (id: string, netPnl: number, closedAt: string | null, extra: Partial<TradeResult> & { tags?: string[]; k?: string } = {}): TradeResult & { tags: string[]; k: string } =>
  ({ id, netPnl, grossPnl: netPnl, fees: 0, r: null, closedAt, tags: [], k: "x", ...extra });

describe("closedBetween", () => {
  const ts = [res("old", 10, "2026-01-01T00:00:00Z"), res("new", 10, "2026-11-01T00:00:00Z"), res("open", 0, null)];
  it("keeps results closed inside [start, end)", () => {
    expect(closedBetween(ts, new Date("2026-10-01T00:00:00Z"), null).map((x) => x.id)).toEqual(["new"]);
    expect(closedBetween(ts, new Date("2025-12-01T00:00:00Z"), new Date("2026-10-01T00:00:00Z")).map((x) => x.id)).toEqual(["old"]);
    expect(closedBetween(ts, new Date("2026-11-01T00:00:00Z"), new Date("2026-11-01T00:00:00Z"))).toEqual([]); // empty window
    expect(closedBetween(ts, new Date("2026-01-01T00:00:00Z"), new Date("2026-11-01T00:00:00Z")).map((x) => x.id)).toEqual(["old"]); // end is exclusive
  });
});

describe("tagResults / groupResults / worstResult", () => {
  it("counts a multi-tag trade under each tag (hand-calculated)", () => {
    const a = res("a", -10, "2026-11-01T00:00:00Z", { tags: ["Moved stop", "Oversized"] });
    const b = res("b", -5, "2026-11-02T00:00:00Z", { tags: ["Oversized"] });
    const s = tagResults([a, b], (x) => x.tags);
    expect(s["Moved stop"].netPnl).toBe(-10);
    expect(s["Oversized"].netPnl).toBe(-15);
    expect(s["Oversized"].tradeCount).toBe(2);
  });
  it("groups by key with 'Untagged' for a missing key", () => {
    const g = groupResults([res("a", 10, "2026-11-01T00:00:00Z", { k: "A" }), res("b", -4, "2026-11-02T00:00:00Z", { k: "A" }), res("c", 7, "2026-11-03T00:00:00Z")], (x) => (x.id === "c" ? null : x.k));
    expect(g["A"].netPnl).toBe(6); expect(g["A"].winRate).toBe(0.5); expect(g["Untagged"].netPnl).toBe(7);
  });
  it("finds the largest loss and ignores winners", () => {
    const ts = [res("w", 20, "2026-11-01T00:00:00Z"), res("l1", -5, "2026-11-02T00:00:00Z"), res("l2", -20, "2026-11-03T00:00:00Z")];
    expect(worstResult(ts)?.id).toBe("l2");
    expect(worstResult([ts[0]])).toBeNull();
  });
});

describe("summarizeResults is the one place aggregates are computed", () => {
  const trade = (id: string, exit: number, closedAt: string): TradeInput => ({ id, side: "long", quantity: 1, entryPrice: 100, exits: [{ quantity: 1, price: exit }], fees: 1, initialRisk: 10, closedAt });
  it("summarize(trades) equals summarizeResults of the same per-trade results", () => {
    const ts = [trade("a", 110, "2026-11-01T00:00:00Z"), trade("b", 95, "2026-11-02T00:00:00Z"), trade("c", 100, "2026-11-03T00:00:00Z")];
    const direct = summarize(ts);
    // a: +10-1 = 9 (R 0.9), b: -5-1 = -6 (R -0.6), c: 0-1 = -1 (R -0.1)  => net 2, 1 win 2 losses, PF 9/7, expectancy 2/3, maxDD = 7
    expect(direct.netPnl).toBe(2); expect(direct.wins).toBe(1); expect(direct.losses).toBe(2);
    expect(direct.profitFactor).toBeCloseTo(9 / 7, 12); expect(direct.expectancy).toBeCloseTo(2 / 3, 8); expect(direct.maxDrawdown).toBe(7);
    expect(direct.avgR).toBeCloseTo((0.9 - 0.6 - 0.1) / 3, 12);
    const results: TradeResult[] = [{ id: "c", netPnl: -1, grossPnl: 0, fees: 1, r: -0.1, closedAt: "2026-11-03T00:00:00Z" }, { id: "a", netPnl: 9, grossPnl: 10, fees: 1, r: 0.9, closedAt: "2026-11-01T00:00:00Z" }, { id: "b", netPnl: -6, grossPnl: -5, fees: 1, r: -0.6, closedAt: "2026-11-02T00:00:00Z" }];
    const via = summarizeResults(results); // input order does not matter: results are ordered by close time
    expect(via).toEqual({ ...direct, excluded: via.excluded });
  });
});

describe("downsampleCurve", () => {
  const series = (vals: number[]) => vals.map((cumulative, i) => ({ cumulative, closedAt: null, i }));
  it("returns short series unchanged with 1-based positions", () => {
    expect(downsampleCurve(series([1, 2, 3]), 10).map((p) => p.n)).toEqual([1, 2, 3]);
  });
  it("keeps first, last, the global high and the global low, in order, within the cap", () => {
    const v = Array.from({ length: 10000 }, (_, i) => Math.round(100 * Math.sin(i / 300)) + i / 50);
    v[4321] = 9999; v[7777] = -9999;
    const out = downsampleCurve(series(v), 400);
    expect(out.length).toBeLessThanOrEqual(402);
    expect(out[0].n).toBe(1); expect(out[out.length - 1].n).toBe(10000);
    expect(out.some((p) => p.cumulative === 9999)).toBe(true);
    expect(out.some((p) => p.cumulative === -9999)).toBe(true);
    expect(out.every((p, i) => i === 0 || p.n > out[i - 1].n)).toBe(true);
  });
});
