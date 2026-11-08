import { describe, it, expect } from "vitest";
import { evaluateTrade, summarize, groupSummary, TradeInput } from "./metrics";

const t = (o: Partial<TradeInput> & { id: string }): TradeInput => ({
  side: "long", quantity: 1, entryPrice: 100, exits: [{ quantity: 1, price: 110 }], fees: 0, ...o,
});

describe("evaluateTrade", () => {
  it("long win net of fees", () => {
    expect(evaluateTrade(t({ id: "a", fees: 2 }))).toMatchObject({ netPnl: 8, grossPnl: 10, fees: 2 });
  });
  it("short profit when price falls", () => {
    expect(evaluateTrade(t({ id: "a", side: "short", exits: [{ quantity: 1, price: 90 }] }))).toMatchObject({ netPnl: 10 });
  });
  it("partial exits combine at different prices", () => {
    const r = evaluateTrade(t({ id: "a", quantity: 2, exits: [{ quantity: 1, price: 110 }, { quantity: 1, price: 95 }] }));
    expect(r).toMatchObject({ netPnl: 5 });
  });
  it("partially open trade excluded", () => {
    expect(evaluateTrade(t({ id: "a", quantity: 2 }))).toBe("open_or_partial");
    expect(evaluateTrade(t({ id: "a", exits: [] }))).toBe("open_or_partial");
  });
  it("over-exited trade invalid", () => {
    expect(evaluateTrade(t({ id: "a", exits: [{ quantity: 2, price: 1 }] }))).toBe("invalid");
  });
  it("multiplier applied (futures)", () => {
    expect(evaluateTrade(t({ id: "a", multiplier: 50, exits: [{ quantity: 1, price: 101 }] }))).toMatchObject({ netPnl: 50 });
  });
  it("foreign currency requires fx", () => {
    expect(evaluateTrade(t({ id: "a", sameCurrencyAsAccount: false }))).toBe("missing_fx");
    expect(evaluateTrade(t({ id: "a", sameCurrencyAsAccount: false, fxToAccount: 1.5, fees: 2 }))).toMatchObject({ netPnl: 12, fees: 3 });
  });
  it("R multiple only with risk", () => {
    expect((evaluateTrade(t({ id: "a", initialRisk: 5 })) as { r: number }).r).toBe(2);
    expect((evaluateTrade(t({ id: "a" })) as { r: null }).r).toBeNull();
  });
});

describe("summarize", () => {
  const trades: TradeInput[] = [
    t({ id: "1", closedAt: "2026-01-01", exits: [{ quantity: 1, price: 120 }], initialRisk: 10 }), // +20, 2R
    t({ id: "2", closedAt: "2026-01-02", exits: [{ quantity: 1, price: 90 }], initialRisk: 10 }),  // -10, -1R
    t({ id: "3", closedAt: "2026-01-03", exits: [{ quantity: 1, price: 95 }] }),                    // -5
    t({ id: "4", closedAt: "2026-01-04", exits: [{ quantity: 1, price: 100 }] }),                   // 0
    t({ id: "5", closedAt: "2026-01-05", exits: [{ quantity: 1, price: 130 }] }),                   // +30
    t({ id: "open", quantity: 3 }),
  ];
  const s = summarize(trades);
  it("counts", () => {
    expect(s).toMatchObject({ tradeCount: 5, wins: 2, losses: 2, breakevens: 1, winRate: 0.4 });
    expect(s.excluded.open_or_partial).toEqual(["open"]);
  });
  it("pnl stats", () => {
    expect(s.netPnl).toBe(35);
    expect(s.avgWin).toBe(25);
    expect(s.avgLoss).toBe(-7.5);
    expect(s.profitFactor).toBeCloseTo(50 / 15);
    expect(s.expectancy).toBe(7);
  });
  it("R stats with coverage", () => {
    expect(s.avgR).toBeCloseTo(0.5);
    expect(s.rCoverage).toEqual({ withR: 2, total: 5 });
  });
  it("drawdown, streaks, curve", () => {
    expect(s.maxDrawdown).toBe(15); // peak 20 -> trough 5
    expect(s.maxLossStreak).toBe(2);
    expect(s.maxWinStreak).toBe(1);
    expect(s.equityCurve.map((p) => p.cumulative)).toEqual([20, 10, 5, 5, 35]);
    expect(s.smallSample).toBe(true);
  });
  it("empty input is safe", () => {
    expect(summarize([])).toMatchObject({ tradeCount: 0, winRate: null, profitFactor: null, expectancy: null, maxDrawdown: 0 });
  });
  it("no losers => profit factor null (not Infinity)", () => {
    expect(summarize([t({ id: "x" })]).profitFactor).toBeNull();
  });
  it("drawdown from start when first trade loses", () => {
    expect(summarize([t({ id: "x", exits: [{ quantity: 1, price: 90 }] })]).maxDrawdown).toBe(10);
  });
});

describe("groupSummary", () => {
  it("groups with Untagged fallback", () => {
    const g = groupSummary([{ ...t({ id: "1" }), s: "ORB" }, { ...t({ id: "2" }), s: null }], (x) => x.s);
    expect(Object.keys(g).sort()).toEqual(["ORB", "Untagged"]);
  });
});
