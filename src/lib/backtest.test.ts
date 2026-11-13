import { describe, it, expect } from "vitest";
import { backtestFormSchema, tradeFormSchema } from "./trade-schema";
import { backtestColumns, backtestInput, summarizeBacktests, backtestResult, backtestCsv, HYPOTHETICAL, MAX_BACKTEST_EXITS, type BacktestRow } from "./backtest";
import { csvCell } from "./csv-out";

const row = (o: Partial<BacktestRow> & { id: string }): BacktestRow => ({
  symbol: "X", asset_class: "other", side: "long", quantity: "1", entry_price: "10", stop_price: null, target_price: null, multiplier: "1", fees: "0", initial_risk: null,
  opened_at: "2026-02-01T09:00:00.000Z", closed_at: "2026-02-01T10:00:00.000Z", exits: [{ quantity: 1, price: 11 }], strategy: null, timeframe: null, session: null,
  pre_trade_notes: null, post_trade_notes: null, lessons: null, ...o,
});
// Same three trades as the browser test. By hand (no conversion, units as typed):
//   HYPO1 long 2 @100, stop 95, exit 110: gross (110-100) x 2 = +20, risk 5 x 2 = 10, R = +2
//   HYPO2 long 1 @50, stop 48, exit 49:  gross -1, risk 2, R = -0.5
//   HYPO3 long 1 @10, exit 10.5, fees 0.10: gross +0.5, net +0.4, no stop
const HYPO = [
  row({ id: "1", symbol: "HYPO1", quantity: "2", entry_price: "100", stop_price: "95", initial_risk: "10", exits: [{ quantity: 2, price: 110 }], closed_at: "2026-03-01T10:00:00.000Z" }),
  row({ id: "2", symbol: "HYPO2", entry_price: "50", stop_price: "48", initial_risk: "2", exits: [{ quantity: 1, price: 49 }], closed_at: "2026-02-02T10:00:00.000Z" }),
  row({ id: "3", symbol: "HYPO3", fees: "0.10", exits: [{ quantity: 1, price: 10.5 }], closed_at: "2026-02-05T10:00:00.000Z" }),
];

describe("backtest metrics use the same engine as real trades", () => {
  it("net +19.40, 2 wins / 1 loss, profit factor 20.40, expectancy 19.4/3, average R 0.75, max drawdown 1.00", () => {
    const s = summarizeBacktests(HYPO);
    expect(s.tradeCount).toBe(3); expect(s.wins).toBe(2); expect(s.losses).toBe(1);
    expect(s.netPnl).toBe(19.4);
    expect(s.winRate).toBeCloseTo(2 / 3, 12);
    expect(s.profitFactor).toBeCloseTo(20.4, 12);
    expect(s.expectancy).toBeCloseTo(19.4 / 3, 7);
    expect(s.avgR).toBeCloseTo(0.75, 12);
    expect(s.rCoverage).toEqual({ withR: 2, total: 3 });
    expect(s.maxDrawdown).toBe(1); // closes in the order HYPO2 (-1), HYPO3 (+0.4), HYPO1 (+20): from the 0 peak down to -1
    expect(s.equityCurve.map((p) => p.cumulative)).toEqual([-1, -0.6, 19.4]);
    expect(s.smallSample).toBe(true);
  });
  it("an open or part-closed hypothetical trade is not counted; over-exited is invalid", () => {
    expect(backtestResult(row({ id: "o", exits: [], closed_at: null }))).toBe("open_or_partial");
    expect(backtestResult(row({ id: "p", quantity: "2", exits: [{ quantity: 1, price: 11 }] }))).toBe("open_or_partial");
    expect(backtestResult(row({ id: "x", exits: [{ quantity: 2, price: 11 }] }))).toBe("invalid");
    expect(summarizeBacktests([row({ id: "o", exits: [], closed_at: null })]).tradeCount).toBe(0);
  });
  it("shorts and a multiplier: short 1 lot @1.1000 -> 1.0950 x 100,000 = +500", () => {
    const r = backtestResult(row({ id: "s", side: "short", entry_price: "1.1", multiplier: "100000", exits: [{ quantity: 1, price: 1.095 }] }));
    expect(typeof r).not.toBe("string"); if (typeof r !== "string") expect(r.netPnl).toBe(500);
  });
  it("numeric strings from the database become numbers; no currency conversion is ever applied", () => {
    const i = backtestInput(HYPO[0]);
    expect(i.quantity).toBe(2); expect(i.entryPrice).toBe(100); expect(i.sameCurrencyAsAccount).toBe(true); expect(i.fxToAccount).toBeUndefined();
  });
});

describe("the entry form for hypothetical trades", () => {
  const base = { asset_class: "other", symbol: "hypo1", side: "long", quantity: "2", entry_price: "100", opened_at: "2026-03-01T09:00", stop_price: "95", exit1_price: "110", closed_at: "2026-03-01T10:00", strategy_name: "S" };
  it("needs no account, and applies the same rules as a real trade", () => {
    expect(backtestFormSchema.safeParse(base).success).toBe(true);
    expect(tradeFormSchema.safeParse(base).success).toBe(false); // a real trade still needs an account
    expect(tradeFormSchema.safeParse({ ...base, account_id: "3f1b2c3d-1111-4222-8333-444455556666" }).success).toBe(true);
    const bad = backtestFormSchema.safeParse({ ...base, stop_price: "105" });
    expect(bad.success).toBe(false); if (!bad.success) expect(bad.error.issues[0].message).toBe("For a long, the stop must be below entry");
    expect(backtestFormSchema.safeParse({ ...base, exit1_price: "110", closed_at: "" }).success).toBe(false); // an exit needs its time
    expect(backtestFormSchema.safeParse({ ...base, quantity: "0" }).success).toBe(false);
  });
  it("columns: planned risk (|100-95| x 2 = 10), upper-cased symbol, exits as JSON, times as UTC, no account / fx / tags columns", () => {
    const p = backtestFormSchema.parse(base);
    const cols = Object.fromEntries(backtestColumns(p));
    expect(cols.symbol).toBe("HYPO1"); expect(cols.initial_risk).toBe(10); expect(cols.multiplier).toBe(1);
    expect(JSON.parse(cols.exits as string)).toEqual([{ quantity: 2, price: 110 }]);
    expect(cols.opened_at).toBe("2026-03-01T09:00:00.000Z"); expect(cols.closed_at).toBe("2026-03-01T10:00:00.000Z");
    for (const k of ["account_id", "currency", "fx_to_account", "strategy_id", "emotions", "mistakes", "followed_plan"]) expect(k in cols).toBe(false);
    expect(Object.keys(cols)).not.toContain("user_id");
  });
  it("forex lot default multiplier 100,000; an open trade has no exits and no close time", () => {
    const p = backtestFormSchema.parse({ asset_class: "forex", symbol: "EURUSD", side: "long", quantity: "1", entry_price: "1.1", opened_at: "2026-03-01T09:00" });
    const cols = Object.fromEntries(backtestColumns(p));
    expect(cols.multiplier).toBe(100000); expect(cols.exits).toBe("[]"); expect(cols.closed_at).toBeNull();
  });
  it("never more than 10 exits are stored", () => { expect(MAX_BACKTEST_EXITS).toBe(10); });
});

describe("the hypothetical CSV export", () => {
  const lines = backtestCsv(HYPO).split("\r\n");
  it("is labelled on the first line and on every row, and has a record_type column first", () => {
    expect(lines[0]).toBe("HYPOTHETICAL: not real trades. Simulated entries; not executed orders.");
    expect(lines[1].startsWith("record_type,")).toBe(true);
    expect(lines).toHaveLength(5);
    for (const l of lines.slice(2)) expect(l.startsWith(`${HYPOTHETICAL},`)).toBe(true);
  });
  it("carries the per-trade result (net and R) and open trades have none", () => {
    const hypo1 = lines.find((l) => l.includes("HYPO1"))!;
    expect(hypo1).toContain(",20,2,"); // net_result 20, r_multiple 2
    const open = backtestCsv([row({ id: "o", exits: [], closed_at: null })]).split("\r\n")[2];
    expect(open).toMatch(/,,,/);
  });
  it("neutralises spreadsheet formulas typed into notes", () => {
    const csv = backtestCsv([row({ id: "f", pre_trade_notes: "=HYPERLINK(\"http://evil\")", lessons: "@SUM(A1)" })]);
    expect(csv).toContain("\"'=HYPERLINK(\"\"http://evil\"\")\""); expect(csv).toContain("'@SUM(A1)");
  });
});

describe("csvCell", () => {
  it("quotes commas, quotes and newlines; joins arrays; neutralises = + - @ at the start", () => {
    expect(csvCell(null)).toBe(""); expect(csvCell(undefined)).toBe(""); expect(csvCell(5)).toBe("5");
    expect(csvCell("a,b")).toBe("\"a,b\""); expect(csvCell("say \"hi\"")).toBe("\"say \"\"hi\"\"\""); expect(csvCell("a\nb")).toBe("\"a\nb\"");
    expect(csvCell(["x", "y"])).toBe("x; y");
    for (const c of ["=1+1", "+1", "-1", "@a"]) expect(csvCell(c)).toBe(`'${c}`);
  });
});
