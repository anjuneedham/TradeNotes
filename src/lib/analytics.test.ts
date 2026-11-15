import { describe, it, expect } from "vitest";
import { closedTrades, dailyPnl, monthGrid, holdBucket, rBucket, tagImpact, planAdherence, tradeScore, insights, byEntryHour, type JournalTrade } from "./analytics";
import { summarize } from "./metrics";
import { runTool } from "./coach";

let n = 0;
function t(p: Partial<JournalTrade> & { pnl: number; close: string; open?: string }): JournalTrade {
  // long 1 unit @100, exit 100+pnl -> net = pnl (no fees)
  return {
    id: `t${++n}`, side: "long", quantity: 1, entryPrice: 100, exits: [{ quantity: 1, price: 100 + p.pnl }], fees: 0, initialRisk: 10,
    closedAt: p.close, openedAt: p.open ?? p.close, symbol: p.symbol ?? "EURUSD", session: p.session ?? null, strategy: p.strategy ?? null,
    emotions: p.emotions ?? [], mistakes: p.mistakes ?? [], followedPlan: p.followedPlan ?? null, discipline: p.discipline ?? null,
  };
}

describe("analytics", () => {
  const ts = [
    t({ pnl: 20, close: "2026-11-02T10:30:00Z", open: "2026-11-02T10:00:00Z", followedPlan: true, discipline: 5 }),
    t({ pnl: -15, close: "2026-11-02T14:10:00Z", open: "2026-11-02T13:05:00Z", mistakes: ["Moved stop"], emotions: ["FOMO"], followedPlan: false, discipline: 2 }),
    t({ pnl: -5, close: "2026-11-03T13:40:00Z", open: "2026-11-03T13:20:00Z", mistakes: ["Moved stop"], emotions: ["FOMO"], followedPlan: false }),
    t({ pnl: 30, close: "2026-11-04T10:20:00Z", open: "2026-11-04T10:02:00Z", followedPlan: true, symbol: "GBPUSD" }),
    t({ pnl: 10, close: "2026-11-04T11:00:00Z", open: "2026-11-04T10:01:00Z", followedPlan: true }),
    t({ pnl: -12, close: "2026-11-05T13:55:00Z", open: "2026-11-05T13:10:00Z", emotions: ["FOMO"] }),
  ];
  const closed = closedTrades(ts);

  it("excludes open trades and sorts by close", () => {
    const open = { ...t({ pnl: 5, close: "2026-11-01T00:00:00Z" }), exits: [], closedAt: null };
    expect(closedTrades([open, ...ts]).map((x) => x.netPnl)).toEqual([20, -15, -5, 30, 10, -12]);
  });
  it("aggregates P&L per UTC day", () => {
    expect(dailyPnl(closed)).toEqual({
      "2026-11-02": { pnl: 5, trades: 2, wins: 1 }, "2026-11-03": { pnl: -5, trades: 1, wins: 0 },
      "2026-11-04": { pnl: 40, trades: 2, wins: 2 }, "2026-11-05": { pnl: -12, trades: 1, wins: 0 },
    });
  });
  it("builds a Sunday-first month grid", () => {
    const g = monthGrid(2026, 10); // November 2026 starts on a Sunday
    expect(g[0][0]).toBe("2026-11-01");
    expect(g.flat().filter(Boolean)).toHaveLength(30);
    expect(g.every((w) => w.length === 7)).toBe(true);
  });
  it("buckets hold time and R", () => {
    expect(holdBucket("2026-01-01T00:00:00Z", "2026-01-01T00:04:00Z")).toBe("< 5m");
    expect(holdBucket("2026-01-01T00:00:00Z", "2026-01-02T00:00:01Z")).toBe("> 1d");
    expect(holdBucket("2026-01-01T00:00:00Z", null)).toBeNull();
    expect([rBucket(-2), rBucket(-0.5), rBucket(0), rBucket(2.5), rBucket(4)]).toEqual(["≤ -2R", "-1 to 0R", "0 to 1R", "2 to 3R", "≥ 3R"]);
  });
  it("prices each tag", () => {
    expect(tagImpact(closed, "mistakes")).toEqual([{ label: "Moved stop", trades: 2, pnl: -20, winRate: 0 }]);
    expect(tagImpact(closed, "emotions")[0]).toMatchObject({ label: "FOMO", trades: 3, pnl: -32 });
  });
  it("compares plan followed vs broken", () => {
    expect(planAdherence(closed)).toEqual({ followed: 3, broke: 2, avgFollowed: 20, avgBroke: -10 });
  });
  it("finds the losing entry hour", () => {
    expect(byEntryHour(closed).find((b) => b.label === "13:00")).toMatchObject({ trades: 3, pnl: -32 });
  });
  it("scores 0-100 only with 5+ trades", () => {
    expect(tradeScore(summarize(ts.slice(0, 4)), closed.slice(0, 4))).toBeNull();
    const sc = tradeScore(summarize(ts), closed)!;
    expect(sc.axes).toHaveLength(6);
    expect(sc.total).toBeGreaterThanOrEqual(0);
    expect(sc.total).toBeLessThanOrEqual(100);
    expect(sc.axes.every((a) => a.value >= 0 && a.value <= 100)).toBe(true);
  });
  it("produces factual insights", () => {
    const ids = insights(closed, "USD").map((i) => i.id);
    expect(ids).toContain("mistake");
    expect(ids).toContain("emotion");
    expect(ids).toContain("plan");
    expect(insights(closed, "USD").find((i) => i.id === "mistake")!.title).toContain("$20");
  });
});

describe("coach tools", () => {
  const ts = [t({ pnl: 20, close: "2026-11-02T10:30:00Z", symbol: "EURUSD" }), t({ pnl: -15, close: "2026-11-03T10:30:00Z", symbol: "GBPUSD", mistakes: ["Revenge trade"] })];
  it("overview reports headline stats", () => {
    expect(runTool("get_overview", {}, ts, "USD")).toMatchObject({ closed_trades: 2, net_pnl: 5, wins: 1, losses: 1 });
  });
  it("list_trades filters and is newest first", () => {
    const r = runTool("list_trades", { outcome: "loss" }, ts, "USD") as { matched: number; trades: { symbol: string }[] };
    expect(r.matched).toBe(1); expect(r.trades[0].symbol).toBe("GBPUSD");
    expect((runTool("list_trades", { tag: "revenge trade" }, ts, "USD") as { matched: number }).matched).toBe(1);
    expect((runTool("list_trades", { symbol: "eur/usd" }, ts, "USD") as { matched: number }).matched).toBe(1);
  });
  it("breakdowns and unknown inputs", () => {
    expect(runTool("get_breakdown", { dimension: "symbol" }, ts, "USD")).toEqual([
      { group: "EURUSD", trades: 1, net_pnl: 20, win_rate: 1, avg_r: 2 }, { group: "GBPUSD", trades: 1, net_pnl: -15, win_rate: 0, avg_r: -1.5 }]);
    expect(runTool("get_breakdown", { dimension: "nope" }, ts, "USD")).toHaveProperty("error");
    expect(runTool("nope", {}, ts, "USD")).toHaveProperty("error");
    expect(runTool("get_daily_pnl", { from: "2026-11-03" }, ts, "USD")).toEqual([{ day: "2026-11-03", net_pnl: -15, trades: 1, wins: 0 }]);
  });
});
