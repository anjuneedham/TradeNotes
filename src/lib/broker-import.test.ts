import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { detectPreset, parseWithPreset, parseManual, reconcile, groupFills, impliedMultiplier, num, type ImportedTrade } from "./broker-import";
import { summarize } from "./metrics";
import { parseBrokerTime, zonedToUtc } from "./timezone";

const fx = (f: string) => fs.readFileSync(path.join(__dirname, "import-fixtures", f), "utf8");
const UTC = { tz: "UTC", dateOrder: "mdy" as const };
/** Net P&L by the real metrics engine (the same code the dashboard uses). */
const engineNet = (ts: ImportedTrade[]) => summarize(ts.map((t, i) => ({ id: String(i), side: t.side, quantity: t.quantity, entryPrice: t.entryPrice, exits: t.exits, fees: t.fees, multiplier: t.multiplier ?? 1, closedAt: t.closedAt }))).netPnl;
const cents = (x: number) => Math.round(x * 100) / 100;

function run(file: string, id: string, ctx = UTC) {
  expect(detectPreset(fx(file))?.id.replace("metatrader4", "metatrader")).toBe(id);
  const { preset, result } = parseWithPreset(fx(file), "auto", ctx);
  expect(preset?.id).toBe(id);
  return result;
}

describe("broker presets: auto-detect + hand-calculated totals", () => {
  it("MetaTrader 5 HTML: 3 positions, balance row and Orders section ignored, net $1,047.50, reconciles with broker profit", () => {
    // EURUSD +600 -7 = 593.00; XAUUSD +500 -4.70 = 495.30; GBPUSD -40 -0.80 (commission 1.40 less swap credit 0.60) = -40.80
    const r = run("mt5.html", "metatrader", { tz: "Europe/Athens", dateOrder: "mdy" });
    expect(r.trades).toHaveLength(3);
    expect(cents(engineNet(r.trades))).toBe(1047.5);
    expect(r.trades[0]).toMatchObject({ symbol: "EURUSD", side: "long", quantity: 1, entryPrice: 1.085, multiplier: 100000, fees: 7, openedAt: "2025-11-03T07:00:00.000Z" }); // 09:00 Athens (UTC+2) = 07:00 UTC
    expect(r.trades[1]).toMatchObject({ symbol: "XAUUSD", side: "short", multiplier: 100, fees: 4.7 });
    const rec = reconcile(r.trades);
    expect(rec).toMatchObject({ count: 3, withBroker: 3, mismatches: 0, netBroker: 1047.5, netOurs: 1047.5 });
  });
  it("MetaTrader 4 CSV: USDJPY short + EURUSD long with swap, net -$26.36", () => {
    // USDJPY: profit 33.44 - 0.70 = 32.74. EURUSD: -50 - 7 - 2.10 = -59.10.
    const r = run("mt4.csv", "metatrader");
    expect(r.trades).toHaveLength(2);
    expect(cents(engineNet(r.trades))).toBe(-26.36);
    expect(r.trades[0]).toMatchObject({ symbol: "USDJPY", side: "short", fees: 0.7 });
    expect(r.ignoredRows).toBe(1);
  });
  it("cTrader: units and lots quantities, net -$112.00", () => {
    const r = run("ctrader.csv", "ctrader");
    expect(r.trades.map((t) => t.quantity)).toEqual([0.5, 1]);
    expect(r.trades[0].openedAt).toBe("2025-11-03T09:00:00.000Z"); // day-first dates
    expect(cents(engineNet(r.trades))).toBe(-112);
    expect(reconcile(r.trades).mismatches).toBe(0);
  });
  it("Tradovate: ES/MNQ/CL with point values, short detected from timestamps, net $588.00", () => {
    // ES 10.25 x 50 x 2 = 1025; MNQ short 10.5 x 2 x 3 = 63; CL -0.5 x 1000 = -500
    const r = run("tradovate.csv", "tradovate");
    expect(r.trades.map((t) => [t.symbol, t.side, t.multiplier])).toEqual([["ESZ5", "long", 50], ["MNQZ5", "short", 2], ["CLZ5", "long", 1000]]);
    expect(cents(engineNet(r.trades))).toBe(588);
  });
  it("NinjaTrader: profit is gross of commission, net -$212.90", () => {
    const r = run("ninjatrader.csv", "ninjatrader", { tz: "America/New_York", dateOrder: "mdy" });
    expect(r.trades[0]).toMatchObject({ symbol: "ES 12-25", multiplier: 50, fees: 4.3, openedAt: "2025-11-03T14:35:00.000Z" });
    expect(r.trades[1]).toMatchObject({ side: "short", multiplier: 20 });
    expect(cents(engineNet(r.trades))).toBe(-212.9);
    expect(reconcile(r.trades).mismatches).toBe(0);
  });
  it("Bybit closed P&L: closing Sell = long, net -$1.25", () => {
    const r = run("bybit-derivatives.csv", "bybit-derivatives");
    expect(r.trades.map((t) => t.side)).toEqual(["long", "short"]);
    expect(cents(engineNet(r.trades))).toBe(-1.25);
  });
  it("Thinkorswim: statement preamble skipped; stock scaled out in 2 fills = one trade with 2 exits; option x100; net $400.00", () => {
    const r = run("thinkorswim.csv", "thinkorswim", { tz: "America/New_York", dateOrder: "mdy" });
    expect(r.trades).toHaveLength(2);
    expect(r.trades[0]).toMatchObject({ symbol: "AAPL", quantity: 100, entryPrice: 200, openedAt: "2025-11-03T14:31:05.000Z" }); // EST = UTC-5
    expect(r.trades[0].exits.map((e) => [e.quantity, e.price])).toEqual([[60, 202], [40, 199.5]]);
    expect(r.trades[1]).toMatchObject({ symbol: "SPY 21 NOV 25 600 CALL", assetClass: "option", multiplier: 100 });
    expect(cents(engineNet(r.trades))).toBe(400);
  });
  it("Interactive Brokers Flex: stock, futures position flip split into two trades with fees prorated, forex units->lots, open position reported; net $485.00", () => {
    // MSFT +200 - 2 = 198. ES short 5010->5005 = +250 - 4.50 = 245.50; ES long 5005->5002 = -150 - 4.50 = -154.50. EURUSD 1 lot +0.0020 = 200 - 4 = 196.
    const r = run("ibkr.csv", "ibkr");
    expect(r.trades).toHaveLength(4);
    expect(r.openPositions).toBe(1);
    expect(r.ignoredRows).toBe(1);
    const es = r.trades.filter((t) => t.symbol === "ESZ5");
    expect(es.map((t) => [t.side, t.entryPrice, t.fees])).toEqual([["short", 5010, 4.5], ["long", 5005, 4.5]]);
    expect(r.trades.find((t) => t.symbol === "EURUSD")).toMatchObject({ quantity: 1, multiplier: 100000, assetClass: "forex" });
    expect(cents(engineNet(r.trades))).toBe(485);
  });
  it("TradingView paper: exchange prefix stripped, cancelled orders ignored, net $544.00", () => {
    const r = run("tradingview.csv", "tradingview");
    expect(r.trades.map((t) => t.symbol)).toEqual(["AAPL", "BTCUSDT"]);
    expect(r.ignoredRows).toBe(1);
    expect(cents(engineNet(r.trades))).toBe(544);
  });
  it("Webull: EST suffix respected, net $5.00", () => {
    const r = run("webull.csv", "webull", { tz: "Asia/Tokyo", dateOrder: "mdy" }); // explicit EST beats the user's zone
    expect(r.trades[0].openedAt).toBe("2025-11-03T14:30:01.000Z");
    expect(cents(engineNet(r.trades))).toBe(5);
  });
  it("Binance spot: base-asset fee converted, BNB fee reported not guessed, net $2.30 (2.295)", () => {
    const r = run("binance-spot.csv", "binance-spot", { tz: "Asia/Tokyo", dateOrder: "mdy" }); // UTC export: user zone ignored
    expect(r.trades[0].openedAt).toBe("2025-11-03T10:00:00.000Z");
    expect(engineNet(r.trades)).toBeCloseTo(2.295, 8);
    expect(r.warnings.join(" ")).toMatch(/1 fee/);
  });
  it("Binance futures: net $9.03 (9.028)", () => {
    const r = run("binance-futures.csv", "binance-futures");
    expect(engineNet(r.trades)).toBeCloseTo(9.028, 8);
  });
  it("Bybit spot: net $9.69", () => {
    const r = run("bybit-spot.csv", "bybit-spot");
    expect(r.trades[0].symbol).toBe("SOLUSDT");
    expect(engineNet(r.trades)).toBeCloseTo(9.69, 8);
  });
  it("unrecognised file falls back to manual mapping", () => {
    expect(detectPreset("a,b,c\n1,2,3\n")).toBeNull();
    expect(parseWithPreset("a,b,c\n1,2,3\n", "auto", UTC).result.errors[0].message).toMatch(/manual/);
  });
  it("a chosen preset that does not match the file is refused", () => {
    expect(parseWithPreset(fx("mt4.csv"), "ibkr", UTC).preset).toBeNull();
  });
});

describe("fill grouping", () => {
  it("scale-in then scale-out: VWAP entry, two exits", () => {
    const at = (h: number) => `2025-01-01T${String(h).padStart(2, "0")}:00:00.000Z`;
    const { trades, openPositions } = groupFills([
      { symbol: "X", side: "buy", quantity: 1, price: 10, at: at(1), fees: 1, row: 1 },
      { symbol: "X", side: "buy", quantity: 3, price: 14, at: at(2), fees: 1, row: 2 },
      { symbol: "X", side: "sell", quantity: 2, price: 15, at: at(3), fees: 1, row: 3 },
      { symbol: "X", side: "sell", quantity: 2, price: 16, at: at(4), fees: 1, row: 4 },
    ]);
    expect(openPositions).toBe(0);
    expect(trades[0]).toMatchObject({ side: "long", quantity: 4, entryPrice: 13, fees: 4, closedAt: at(4) }); // (10 + 42) / 4 = 13
    // P&L = 2x(15-13) + 2x(16-13) - 4 = 6
    expect(engineNet(trades)).toBe(6);
  });
});

describe("helpers", () => {
  it("numbers in broker formats", () => {
    expect(num("$(12.50)")).toBe(-12.5);
    expect(num("1,234.50")).toBe(1234.5);
    expect(num("0.488 USDT")).toBe(0.488);
    expect(num("-3.2")).toBe(-3.2);
    expect(num("10 000.00")).toBe(10000);
    expect(num("")).toBeNaN();
  });
  it("implied multiplier", () => {
    expect(impliedMultiplier("long", 2, 5000, 5010.25, 1025)).toBe(50);
    expect(impliedMultiplier("long", 1, 10, 10, 5)).toBeNull();
  });
  it("time zones: naive times read in the user's zone, DST respected", () => {
    expect(parseBrokerTime("2025-07-01 09:30:00", "America/New_York")).toBe("2025-07-01T13:30:00.000Z"); // EDT
    expect(parseBrokerTime("2025-12-01 09:30:00", "America/New_York")).toBe("2025-12-01T14:30:00.000Z"); // EST
    expect(parseBrokerTime("2025-12-01T09:30:00+02:00", "America/New_York")).toBe("2025-12-01T07:30:00.000Z");
    expect(parseBrokerTime("20251103;093000", "UTC")).toBe("2025-11-03T09:30:00.000Z");
    expect(parseBrokerTime("3/11/2025 09:00", "UTC", "dmy")).toBe("2025-11-03T09:00:00.000Z");
    expect(parseBrokerTime("13/11/2025 09:00", "UTC", "mdy")).toBe("2025-11-13T09:00:00.000Z"); // unambiguous day-first
    expect(parseBrokerTime("11/3/2025 12:15:00 AM", "UTC")).toBe("2025-11-03T00:15:00.000Z");
    expect(parseBrokerTime("not a date", "UTC")).toBeNull();
    expect(zonedToUtc(2025, 3, 9, 2, 30, 0, "America/New_York")).toBe(Date.UTC(2025, 2, 9, 7, 30)); // non-existent spring-forward time
  });
  it("manual mapping reads naive times in the chosen zone", () => {
    const csv = "Symbol,Side,Qty,Entry,Exit,Open Time\nAAPL,buy,10,100,101,2025-12-01 09:30\n";
    const r = parseManual(csv, { symbol: "Symbol", side: "Side", quantity: "Qty", entryPrice: "Entry", exitPrice: "Exit", openedAt: "Open Time" }, "stock", { tz: "America/New_York", dateOrder: "mdy" });
    expect(r.trades[0]).toMatchObject({ openedAt: "2025-12-01T14:30:00.000Z", multiplier: 1 });
  });
});
