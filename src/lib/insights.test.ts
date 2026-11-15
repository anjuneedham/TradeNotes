import { describe, it, expect } from "vitest";
import { tradeScore, insights, dailyNet, SCORE_MIN_TRADES } from "./insights";
import { runTool, costMicros } from "./coach";
import type { ResultRow } from "./trades-data";

let n = 0;
const t = (pnl: number, close: string, o: Partial<ResultRow> = {}): ResultRow => ({
  id: `t${++n}`, netPnl: pnl, grossPnl: pnl, fees: 0, r: pnl / 100, closedAt: close, openedAt: o.openedAt ?? close, symbol: "EURUSD", side: "long",
  session: null, strategy: null, mistakes: [], emotions: [], checksDone: null, checksTotal: null, ...o,
});
// 12 trades: clean morning trades win, 13:00 FOMO / moved-stop trades lose.
const rows: ResultRow[] = [
  t(120, "2026-11-02T10:30:00Z", { openedAt: "2026-11-02T10:00:00Z" }), t(-80, "2026-11-02T13:40:00Z", { openedAt: "2026-11-02T13:05:00Z", mistakes: ["Moved stop"], emotions: ["FOMO"] }),
  t(90, "2026-11-03T10:20:00Z", { openedAt: "2026-11-03T10:01:00Z" }), t(-60, "2026-11-03T13:30:00Z", { openedAt: "2026-11-03T13:10:00Z", mistakes: ["Moved stop"], emotions: ["FOMO"] }),
  t(-50, "2026-11-04T13:20:00Z", { openedAt: "2026-11-04T13:02:00Z", emotions: ["FOMO"], symbol: "GBPUSD" }), t(-40, "2026-11-05T13:50:00Z", { openedAt: "2026-11-05T13:15:00Z", symbol: "GBPUSD" }),
  t(-30, "2026-11-06T14:00:00Z", { openedAt: "2026-11-06T13:20:00Z", symbol: "GBPUSD", mistakes: ["Revenge trade"] }), t(150, "2026-11-09T10:40:00Z", { openedAt: "2026-11-09T10:00:00Z", emotions: ["Calm"] }),
  t(110, "2026-11-10T10:30:00Z", { openedAt: "2026-11-10T10:05:00Z", emotions: ["Calm"] }), t(70, "2026-11-11T10:10:00Z", { openedAt: "2026-11-11T10:00:00Z", emotions: ["Calm"] }),
  t(-20, "2026-11-12T10:50:00Z", { openedAt: "2026-11-12T10:10:00Z" }), t(60, "2026-11-13T10:20:00Z", { openedAt: "2026-11-13T10:00:00Z" }),
];

describe("TradeNotes Score", () => {
  it(`needs ${SCORE_MIN_TRADES} closed trades`, () => { expect(tradeScore(rows.slice(0, SCORE_MIN_TRADES - 1))).toBeNull(); });
  it("is 0–100 with six bounded axes and names the weakest", () => {
    const s = tradeScore(rows)!;
    expect(s.axes).toHaveLength(6);
    expect(s.axes.every((a) => a.value >= 0 && a.value <= 100)).toBe(true);
    expect(s.total).toBe(Math.round(s.axes.reduce((x, a) => x + a.value, 0) / 6));
    expect(s.weakest.value).toBe(Math.min(...s.axes.map((a) => a.value)));
  });
  it("profit factor axis: 600 won / 280 lost = 2.14 -> 86", () => {
    expect(tradeScore(rows)!.axes.find((a) => a.key === "pf")).toMatchObject({ value: 86, detail: "2.14" });
  });
  it("discipline uses mistake-free share without playbook answers (9 of 12 = 75)", () => {
    expect(tradeScore(rows)!.axes.find((a) => a.key === "discipline")!.value).toBe(75);
  });
  it("discipline switches to playbook adherence once 5+ trades are checked", () => {
    const checked = rows.map((r, i) => (i < 6 ? { ...r, checksDone: 1, checksTotal: 2 } : r));
    expect(tradeScore(checked)!.axes.find((a) => a.key === "discipline")!.value).toBe(50);
  });
});

describe("insights", () => {
  const found = insights(rows, "USD");
  const by = (id: string) => found.find((f) => f.id === id);
  it("prices the costliest mistake", () => { expect(by("mistake")!.title).toBe("“Moved stop” has cost you $140"); });
  it("finds the losing and winning entry hours", () => {
    expect(by("hour-worst")!.title).toContain("13:00");
    expect(by("hour-best")!.title).toContain("10:00");
  });
  it("finds the losing emotion and the winning one", () => {
    expect(by("emotion")!.title).toContain("FOMO");
    expect(by("emotion-good")!.title).toContain("Calm");
  });
  it("finds the weakest instrument", () => { expect(by("symbol")!.title).toBe("GBPUSD is your weakest instrument"); });
  it("lists problems before strengths and needs 5 trades", () => {
    const tones = found.map((f) => f.tone);
    expect(tones.indexOf("good")).toBeGreaterThan(tones.lastIndexOf("bad"));
    expect(insights(rows.slice(0, 4), "USD")).toEqual([]);
  });
  it("respects the time zone for days and hours", () => {
    expect([...dailyNet([t(10, "2026-11-02T03:00:00Z")], "America/New_York").keys()]).toEqual(["2026-11-01"]);
  });
});

describe("coach tools", () => {
  it("overview carries headline stats, score and insights", () => {
    const o = runTool("get_overview", {}, rows, "USD", "UTC") as Record<string, unknown>;
    expect(o).toMatchObject({ closed_trades: 12, net_pnl: 320, wins: 6, losses: 6 });
    expect((o.score as { total: number }).total).toBe(tradeScore(rows)!.total);
    expect((o.insights as string[]).length).toBeGreaterThan(0);
  });
  it("filters trades", () => {
    const l = (i: Record<string, unknown>) => runTool("list_trades", i, rows, "USD", "UTC") as { matched: number; trades: { symbol: string; closed: string }[] };
    expect(l({ outcome: "loss" }).matched).toBe(6);
    expect(l({ symbol: "gbp/usd" }).matched).toBe(3);
    expect(l({ tag: "fomo" }).matched).toBe(3);
    expect(l({ from: "2026-11-10", to: "2026-11-11" }).matched).toBe(2);
    expect(l({ limit: 2 }).trades.map((x) => x.closed)).toEqual(["2026-11-13T10:20:00Z", "2026-11-12T10:50:00Z"]);
  });
  it("breaks down by dimension and rejects unknown input", () => {
    const sym = runTool("get_breakdown", { dimension: "symbol" }, rows, "USD", "UTC") as { group: string; net_pnl: number }[];
    expect(sym).toEqual([expect.objectContaining({ group: "EURUSD", net_pnl: 440 }), expect.objectContaining({ group: "GBPUSD", net_pnl: -120 })]);
    expect((runTool("get_breakdown", { dimension: "mistake" }, rows, "USD", "UTC") as { tags: { tag: string }[] }).tags[0].tag).toBe("Moved stop");
    expect(runTool("get_breakdown", { dimension: "nope" }, rows, "USD", "UTC")).toHaveProperty("error");
    expect(runTool("nope", {}, rows, "USD", "UTC")).toHaveProperty("error");
  });
  it("daily P&L honours the date window", () => {
    expect(runTool("get_daily_pnl", { from: "2026-11-12" }, rows, "USD", "UTC")).toEqual([{ day: "2026-11-12", net_pnl: -20 }, { day: "2026-11-13", net_pnl: 60 }]);
  });
});

describe("cost metering (micro-dollars)", () => {
  it("prices Sonnet 5.5 at $2 / $10 per million, cache read $0.10, cache write $2.50", () => {
    expect(costMicros("claude-sonnet-5-5", { input_tokens: 1_000_000, output_tokens: 0 })).toBe(2_000_000);
    expect(costMicros("claude-sonnet-5-5", { input_tokens: 0, output_tokens: 1000 })).toBe(10_000);
    expect(costMicros("claude-sonnet-5-5", { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 10_000, cache_creation_input_tokens: 1000 })).toBe(3_500);
  });
  it("prices unknown models as Opus (never under-counts)", () => {
    expect(costMicros("some-new-model", { input_tokens: 1000, output_tokens: 1000 })).toBe(24_000);
  });
});

import { aiQuestions, PLANS } from "./plans";
describe("coach limits shown as questions", () => {
  it("free 3, Standard 130, Premium 260 (premium is double)", () => {
    expect([aiQuestions("free"), aiQuestions("starter"), aiQuestions("pro")]).toEqual([3, 130, 260]);
    expect(PLANS.pro.aiBudgetCents).toBe(2 * PLANS.starter.aiBudgetCents);
  });
  it("the free taste can never cost more than 5 cents a month", () => { expect(PLANS.free.aiBudgetCents).toBeLessThanOrEqual(5); });
});
