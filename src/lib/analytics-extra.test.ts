import { describe, it, expect } from "vitest";
import { rDistribution, weekdayHourHeatmap, intensityLevel, holdTimeBuckets, mistakeCost, drawdownDetail, profitFactorInfo } from "./analytics-extra";
import { summarizeResults, type TradeResult } from "./metrics";
import { rng } from "../../scripts/lib/seed-trades.js";

const res = (id: string, netPnl: number, closedAt: string | null = null, extra: Partial<TradeResult> = {}): TradeResult =>
  ({ id, netPnl, grossPnl: netPnl, fees: 0, r: null, closedAt, ...extra });

describe("rDistribution", () => {
  it("buckets by from <= r < to (exact edges fall in the bucket that starts at them), and counts trades without R separately", () => {
    const d = rDistribution([-3.5, -3, -2.5, -1, -0.0001, 0, 0.5, 1, 2.9999, 3, 10, null].map((r) => ({ r })));
    expect(d.buckets.map((b) => b.label)).toEqual(["Below −3R", "−3R to −2R", "−2R to −1R", "−1R to 0R", "0R to 1R", "1R to 2R", "2R to 3R", "3R or more"]);
    expect(d.buckets.map((b) => b.count)).toEqual([1, 2, 0, 2, 2, 1, 1, 2]);
    expect(d.withR).toBe(11); expect(d.withoutR).toBe(1); expect(d.total).toBe(12);
    expect(d.buckets[0].share).toBeCloseTo(1 / 11, 12);
    expect(d.buckets.reduce((s, b) => s + b.share, 0)).toBeCloseTo(1, 12);
  });
  it("is all zeros with no data", () => {
    const d = rDistribution([]);
    expect(d.withR).toBe(0); expect(d.buckets.every((b) => b.count === 0 && b.share === 0)).toBe(true);
  });
});

describe("weekdayHourHeatmap (user's zone, by entry time)", () => {
  const rows = [
    { netPnl: 100, openedAt: "2026-11-13T14:00:00Z" }, // Fri 09:00 EST
    { netPnl: -30, openedAt: "2026-11-13T14:30:00Z" }, // Fri 09:30 EST  -> same cell
    { netPnl: 5, openedAt: "2026-11-13T02:30:00Z" },   // Thu 21:30 EST (UTC date is Friday!)
    { netPnl: 1, openedAt: "2026-03-08T06:59:00Z" },   // Sun 01:59 EST
    { netPnl: 2, openedAt: "2026-03-08T07:00:00Z" },   // Sun 03:00 EDT (clocks jumped)
  ];
  it("puts trades in the right weekday and hour for New York", () => {
    const h = weekdayHourHeatmap(rows, "America/New_York");
    expect(h.cells[5][9]).toEqual({ trades: 2, netPnl: 70 });
    expect(h.cells[4][21]).toEqual({ trades: 1, netPnl: 5 });
    expect(h.cells[0][1]).toEqual({ trades: 1, netPnl: 1 });
    expect(h.cells[0][3]).toEqual({ trades: 1, netPnl: 2 });
    expect(h.cells[0][2]).toEqual({ trades: 0, netPnl: 0 }); // the skipped hour is empty
    expect(h.maxAbs).toBe(70); expect(h.trades).toBe(5);
  });
  it("the same instants land elsewhere in UTC", () => {
    const h = weekdayHourHeatmap(rows, "UTC");
    expect(h.cells[5][14]).toEqual({ trades: 2, netPnl: 70 });
    expect(h.cells[5][2]).toEqual({ trades: 1, netPnl: 5 }); // Friday 02:30 UTC
  });
  it("totals over every cell equal the input", () => {
    const h = weekdayHourHeatmap(rows, "Asia/Tokyo");
    expect(h.cells.flat().reduce((s, c) => s + c.trades, 0)).toBe(5);
    expect(h.cells.flat().reduce((s, c) => s + c.netPnl, 0)).toBeCloseTo(78, 9);
  });
});

describe("intensityLevel", () => {
  it("is 0 for zero, then thirds of the largest absolute value, symmetric for losses", () => {
    expect([0, 20, 35, 47, 70].map((v) => intensityLevel(v, 70))).toEqual([0, 1, 2, 3, 3]);
    expect([-20, -35, -70].map((v) => intensityLevel(v, 70))).toEqual([1, 2, 3]);
    expect(intensityLevel(5, 0)).toBe(0);
    expect(intensityLevel(70 / 3, 70)).toBe(2); // exactly one third is already "medium"
  });
});

describe("holdTimeBuckets", () => {
  const T0 = Date.parse("2026-11-02T09:00:00Z");
  const held = (id: string, minutes: number, net: number) => ({ ...res(id, net, new Date(T0 + minutes * 60000).toISOString()), openedAt: new Date(T0).toISOString() });
  it("uses [from, to) in minutes and puts every boundary in the longer bucket", () => {
    const rows = [held("a", 4.99, 1), held("b", 5, 2), held("c", 14.99, 3), held("d", 15, 4), held("e", 59, 5), held("f", 60, 6), held("g", 239, 7), held("h", 240, 8),
      held("i", 1439, 9), held("j", 1440, 10), held("k", 10079, 11), held("l", 10080, 12)];
    const h = holdTimeBuckets(rows);
    expect(h.buckets.map((b) => b.summary.tradeCount)).toEqual([1, 2, 2, 2, 2, 2, 1]);
    expect(h.buckets.map((b) => b.summary.netPnl)).toEqual([1, 5, 9, 13, 17, 21, 12]);
    expect(h.skipped).toBe(0);
  });
  it("skips trades with no close time or a close before the open", () => {
    const h = holdTimeBuckets([held("a", 10, 1), { ...res("b", 5, null), openedAt: new Date(T0).toISOString() }, held("c", -5, 2)]);
    expect(h.skipped).toBe(2); expect(h.buckets[1].summary.tradeCount).toBe(1);
  });
});

describe("mistakeCost: a trade with several tags counts under each", () => {
  const rows = [
    { ...res("t1", -100), mistakes: ["Moved stop", "Oversized"] },
    { ...res("t2", -40), mistakes: ["Oversized"] },
    { ...res("t3", 60), mistakes: ["Moved stop", "Moved stop"] }, // a repeated tag on one trade counts once
    { ...res("t4", 30), mistakes: [] as string[] },
    { ...res("t5", -10), mistakes: [] as string[] },
  ];
  const m = mistakeCost(rows);
  it("per tag (hand-calculated), costliest first", () => {
    expect(m.tags.map((t) => t.tag)).toEqual(["Oversized", "Moved stop"]);
    expect(m.tags[0]).toEqual({ tag: "Oversized", trades: 2, netPnl: -140, lossTotal: -140, avgPerTrade: -70, winRate: 0 });
    expect(m.tags[1]).toEqual({ tag: "Moved stop", trades: 2, netPnl: -40, lossTotal: -100, avgPerTrade: -20, winRate: 0.5 });
    expect(m.tags.reduce((s, t) => s + t.trades, 0)).toBe(4); // 4 > 3 distinct tagged trades: rows do not add up, by design
  });
  it("distinct trades are counted once and add up to the total", () => {
    expect(m.withMistake.trades).toBe(3); expect(m.withMistake.netPnl).toBe(-80); expect(m.withMistake.avgPerTrade).toBeCloseTo(-80 / 3, 8);
    expect(m.withoutMistake).toEqual({ trades: 2, netPnl: 20, avgPerTrade: 10 });
    expect(m.withMistake.netPnl + m.withoutMistake.netPnl).toBe(-60);
  });
  it("handles no data", () => { expect(mistakeCost([])).toEqual({ tags: [], withMistake: { trades: 0, netPnl: 0, avgPerTrade: null }, withoutMistake: { trades: 0, netPnl: 0, avgPerTrade: null } }); });
});

describe("drawdownDetail", () => {
  const seq = (nets: number[]) => nets.map((n, i) => res(`t${i + 1}`, n, `2026-11-${String(i + 1).padStart(2, "0")}T12:00:00Z`));
  it("finds peak, trough and recovery (hand-calculated)", () => {
    // cumulative: 100, 50, -20, 10, 210, 200 -> worst fall 100 -> -20 = 120 after trades 1..3; back above 100 at trade 5
    const d = drawdownDetail(seq([100, -50, -70, 30, 200, -10]));
    expect(d.maxDrawdown).toBe(120);
    expect([d.peakAfterTrade, d.troughAfterTrade]).toEqual([1, 3]);
    expect([d.peakValue, d.troughValue]).toEqual([100, -20]);
    expect(d.peakAt).toBe("2026-11-01T12:00:00Z"); expect(d.troughAt).toBe("2026-11-03T12:00:00Z");
    expect(d.recovered).toBe(true); expect(d.recoveredAfterTrade).toBe(5); expect(d.recoveredAt).toBe("2026-11-05T12:00:00Z"); expect(d.tradesToRecover).toBe(2);
    expect(d.current).toEqual({ drawdown: 10, fromPeak: true }); // 210 -> 200
  });
  it("reports 'not recovered' and the current drawdown", () => {
    // cumulative 50, -30, -10: fall of 80 from 50 to -30, still 60 below the peak
    const d = drawdownDetail(seq([50, -80, 20]));
    expect(d.maxDrawdown).toBe(80); expect(d.recovered).toBe(false); expect(d.recoveredAt).toBeNull(); expect(d.tradesToRecover).toBeNull();
    expect(d.current.drawdown).toBe(60);
  });
  it("a journal that starts with a loss falls from the starting level 0", () => {
    const d = drawdownDetail(seq([-20, 5]));
    expect(d.maxDrawdown).toBe(20); expect(d.peakAfterTrade).toBe(0); expect(d.peakAt).toBeNull(); expect(d.peakValue).toBe(0); expect(d.troughValue).toBe(-20);
  });
  it("no fall at all", () => {
    const d = drawdownDetail(seq([10, 20]));
    expect(d.maxDrawdown).toBe(0); expect(d.peakAfterTrade).toBeNull(); expect(d.recovered).toBe(false); expect(d.current).toEqual({ drawdown: 0, fromPeak: false });
    expect(drawdownDetail([]).maxDrawdown).toBe(0);
  });
  it("orders by close time, not by input order", () => {
    const shuffled = [res("b", -50, "2026-11-02T00:00:00Z"), res("a", 100, "2026-11-01T00:00:00Z")];
    expect(drawdownDetail(shuffled).maxDrawdown).toBe(50);
  });
  it("max drawdown equals metrics.ts on 500 random trades (one definition)", () => {
    const r = rng(5);
    const rows = Array.from({ length: 500 }, (_, i) => res(`t${i}`, Math.round((r() - 0.47) * 400) / 4, new Date(Date.UTC(2026, 0, 1) + i * 3600000).toISOString()));
    expect(drawdownDetail(rows).maxDrawdown).toBeCloseTo(summarizeResults(rows).maxDrawdown, 6);
  });
});

describe("profitFactorInfo (never Infinity)", () => {
  it("gross profit over gross loss (hand-calculated): 150 / 50 = 3", () => {
    const rows = [100, 50, -30, -20].map((n, i) => res(`t${i}`, n));
    const p = profitFactorInfo(rows);
    expect(p.value).toBe(3); expect(p.grossProfit).toBe(150); expect(p.grossLoss).toBe(-50); expect(p.wins).toBe(2); expect(p.losses).toBe(2);
    expect(p.value).toBeCloseTo(summarizeResults(rows).profitFactor!, 12);
  });
  it("no loser: value is null (not Infinity) with an explanation", () => {
    const p = profitFactorInfo([10, 20, 30].map((n, i) => res(`t${i}`, n)));
    expect(p.value).toBeNull(); expect(p.warning).toBe("no_losses"); expect(p.message).toMatch(/infinite/); expect(Number.isFinite(p.value ?? 0)).toBe(true);
  });
  it("breakeven trades are neither wins nor losses", () => { expect(profitFactorInfo([res("a", 0), res("b", 0)]).warning).toBe("no_losses"); });
  it("warns on a small sample, then on few losses, then stays quiet", () => {
    const mk = (wins: number, losses: number) => [...Array.from({ length: wins }, (_, i) => res(`w${i}`, 10)), ...Array.from({ length: losses }, (_, i) => res(`l${i}`, -5))];
    expect(profitFactorInfo(mk(6, 4)).warning).toBe("small_sample");           // 10 trades
    expect(profitFactorInfo(mk(29, 0)).warning).toBe("no_losses");
    expect(profitFactorInfo(mk(37, 3)).warning).toBe("few_losses");            // 40 trades, 3 losses
    expect(profitFactorInfo(mk(30, 10)).warning).toBeNull();                   // 40 trades, 10 losses
    expect(profitFactorInfo(mk(25, 5)).warning).toBeNull();                    // 30 trades (not under 30), 5 losses (not under 5)
    expect(profitFactorInfo(mk(26, 3)).warning).toBe("small_sample");           // 29 trades: the small-sample warning takes precedence over few losses
  });
  it("no trades: no value, no warning", () => { expect(profitFactorInfo([])).toMatchObject({ value: null, warning: null, message: null, trades: 0 }); });
});
