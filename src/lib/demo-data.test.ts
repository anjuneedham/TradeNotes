import { describe, it, expect, vi } from "vitest";
import { demoTrades, demoRows, demoTrade, demoInput, mulberry32, DEMO_NOW } from "./demo-data";
import { evaluateTrade, summarizeResults } from "./metrics";

describe("demo sample data (fictional, fixed seed)", () => {
  it("the PRNG is deterministic: the same seed gives the same first three numbers", () => {
    const r = mulberry32(20261101);
    expect([r(), r(), r()]).toEqual([0.6739504204597324, 0.8962121387012303, 0.752615804085508]);
  });
  it("generates the same 190 trades every time (no clock, no randomness at request time)", async () => {
    const a = JSON.stringify(demoTrades());
    vi.resetModules();
    const again = await import("./demo-data");
    expect(JSON.stringify(again.demoTrades())).toBe(a);
    expect(demoTrades()).toHaveLength(190);
    expect(demoTrades()[0].id).toBe("demo-001"); expect(demoTrades().at(-1)!.id).toBe("demo-190");
  });
  it("trade 1 by hand: ES long 2 x 50, 5883.25 -> 5878.70, fees 9: gross (5878.70 - 5883.25) x 2 x 50 = -455, net -464, planned risk 4.75 x 100 = 475, R = -464 / 475", () => {
    const t = demoTrade("demo-001")!;
    expect(t.initialRisk).toBe(475);
    const r = evaluateTrade(demoInput(t));
    expect(typeof r).not.toBe("string");
    if (typeof r !== "string") { expect(r.grossPnl).toBe(-455); expect(r.netPnl).toBe(-464); expect(r.r).toBeCloseTo(-464 / 475, 12); }
  });
  it("every sample trade is fully exited, has a stop on the right side, valid dates inside Jan to Oct 2026, and a unique id", () => {
    const ids = new Set<string>();
    for (const t of demoTrades()) {
      expect(ids.has(t.id)).toBe(false); ids.add(t.id);
      expect(t.exits.reduce((s, e) => s + e.quantity, 0)).toBeCloseTo(t.quantity, 9);
      expect(t.side === "long" ? t.stopPrice < t.entryPrice : t.stopPrice > t.entryPrice).toBe(true);
      expect(t.side === "long" ? t.targetPrice > t.entryPrice : t.targetPrice < t.entryPrice).toBe(true);
      expect(t.openedAt >= "2026-01-05" && t.closedAt <= "2026-10-31").toBe(true);
      expect(t.closedAt > t.openedAt).toBe(true);
      expect(t.checksDone).toBeGreaterThanOrEqual(1); expect(t.checksDone).toBeLessThanOrEqual(t.checksTotal);
    }
    expect(new Date(DEMO_NOW).toISOString()).toBe("2026-10-31T21:00:00.000Z");
  });
  it("totals from the shared engine equal an independent plain loop, and are pinned (change the generator => update these on purpose)", () => {
    let net = 0;
    for (const t of demoTrades()) { const dir = t.side === "long" ? 1 : -1; net += t.exits.reduce((s, e) => s + dir * (e.price - t.entryPrice) * e.quantity * t.multiplier, 0) - t.fees; }
    const s = summarizeResults(demoRows());
    expect(s.netPnl).toBeCloseTo(net, 6);
    expect(s.tradeCount).toBe(190); expect(s.wins).toBe(89); expect(s.losses).toBe(101);
    expect(s.netPnl).toBe(11623.48);
    expect(s.winRate).toBeCloseTo(89 / 190, 12);
    expect(s.profitFactor).toBeCloseTo(1.4396357033143226, 9);
    expect(s.expectancy).toBe(61.17621053);
    expect(s.maxDrawdown).toBe(3600.16);
    expect(s.maxWinStreak).toBe(7); expect(s.maxLossStreak).toBe(10);
    expect(s.smallSample).toBe(false);
  });
  it("rows carry what the real components read (strategy, symbol, session, tags, playbook answers) and nothing is open", () => {
    const rows = demoRows();
    expect(rows).toHaveLength(190);
    expect(rows.every((r) => r.strategy && r.symbol && r.session && r.checksTotal === 4 && r.openedAt)).toBe(true);
    expect(new Set(rows.map((r) => r.strategy)).size).toBeGreaterThanOrEqual(3);
    expect(rows.some((r) => r.mistakes.length > 0)).toBe(true);
  });
  it("is plainly fictional: no real broker or person names in the data", () => {
    const text = JSON.stringify(demoTrades()).toLowerCase();
    for (const w of ["@", "http", "tradenotes.dev"]) expect(text).not.toContain(w);
  });
});
