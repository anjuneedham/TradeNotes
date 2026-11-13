import { describe, it, expect } from "vitest";
import { futuresRoot, futuresSpec, defaultMultiplierFor, pipSize, moveInUnits, guessAssetClass, forexQuote, roundCrypto } from "./instruments";
import { evaluateTrade } from "./metrics";

const t = (o: Partial<Parameters<typeof evaluateTrade>[0]>) => ({ id: "x", side: "long" as const, quantity: 1, entryPrice: 1, exits: [], fees: 0, ...o });

describe("futures specs", () => {
  it("resolves roots from common symbol styles", () => {
    expect(futuresRoot("ESZ5")).toBe("ES");
    expect(futuresRoot("ESZ2025")).toBe("ES");
    expect(futuresRoot("/ESZ25")).toBe("ES");
    expect(futuresRoot("MNQH6")).toBe("MNQ");
    expect(futuresRoot("MES 12-25")).toBe("MES");
    expect(futuresRoot("CL")).toBe("CL");
    expect(futuresRoot("6EZ5")).toBe("6E");
    expect(futuresRoot("AAPL")).toBeNull();
  });
  it("point values = tick value / tick size", () => {
    expect(futuresSpec("ESZ5")!.pointValue).toBe(50);
    expect(futuresSpec("MNQH6")!.pointValue).toBe(2);
    expect(futuresSpec("CLF6")!.pointValue).toBe(1000);
    expect(futuresSpec("GCG6")!.pointValue).toBe(100);
    expect(futuresSpec("ZBH6")!.pointValue).toBe(1000);
    expect(futuresSpec("6EZ5")!.pointValue).toBe(125000);
  });
  it("unknown futures root gives no default multiplier (ask the user, never guess)", () => {
    expect(defaultMultiplierFor("future", "XYZZ5")).toBeNull();
  });
});

describe("P&L stays correct with instrument multipliers (hand-calculated)", () => {
  it("ES long 2 @ 5000.00 -> 5010.25, fees 4.20: 10.25 pts x $50 x 2 = $1,025.00 gross, $1,020.80 net", () => {
    const r = evaluateTrade(t({ quantity: 2, entryPrice: 5000, exits: [{ quantity: 2, price: 5010.25 }], fees: 4.2, multiplier: defaultMultiplierFor("future", "ESZ5")! }));
    expect(r).toMatchObject({ grossPnl: 1025, netPnl: 1020.8 });
  });
  it("MNQ short 3 @ 18000.50 -> 17990.00: 10.5 pts x $2 x 3 = $63.00", () => {
    const r = evaluateTrade(t({ side: "short", quantity: 3, entryPrice: 18000.5, exits: [{ quantity: 3, price: 17990 }], multiplier: defaultMultiplierFor("future", "MNQH6")! }));
    expect(r).toMatchObject({ netPnl: 63 });
  });
  it("CL long 1 @ 75.00 -> 74.50: -0.50 x $1,000 = -$500.00 (= 50 ticks x $10)", () => {
    const r = evaluateTrade(t({ entryPrice: 75, exits: [{ quantity: 1, price: 74.5 }], multiplier: defaultMultiplierFor("future", "CLF6")! }));
    expect(r).toMatchObject({ netPnl: -500 });
    expect(moveInUnits("future", "CLF6", -0.5)).toEqual({ value: -50, unit: "ticks" });
  });
  it("Option long 2 contracts @ 3.20 -> 4.70, fees 1.30: 1.50 x 100 x 2 = $300.00 gross, $298.70 net", () => {
    const r = evaluateTrade(t({ quantity: 2, entryPrice: 3.2, exits: [{ quantity: 2, price: 4.7 }], fees: 1.3, multiplier: defaultMultiplierFor("option")! }));
    expect(r).toMatchObject({ grossPnl: 300, netPnl: 298.7 });
  });
  it("USDJPY long 0.5 lot @ 150.00 -> 150.50 = 50 pips; 0.50 x 50,000 = JPY 25,000; at fx 0.0066 = $165.00", () => {
    expect(pipSize("USDJPY")).toBe(0.01);
    expect(moveInUnits("forex", "USDJPY", 0.5)).toEqual({ value: 50, unit: "pips" });
    const r = evaluateTrade(t({ quantity: 0.5, entryPrice: 150, exits: [{ quantity: 0.5, price: 150.5 }], multiplier: defaultMultiplierFor("forex")!, sameCurrencyAsAccount: false, fxToAccount: 0.0066 }));
    expect(r).toMatchObject({ netPnl: 165 });
  });
  it("EURUSD micro lot 0.01 @ 1.0850 -> 1.0910 = 60 pips = $6.00", () => {
    expect(moveInUnits("forex", "EURUSD", 0.006)).toEqual({ value: 60, unit: "pips" });
    const r = evaluateTrade(t({ quantity: 0.01, entryPrice: 1.085, exits: [{ quantity: 0.01, price: 1.091 }], multiplier: 100000 }));
    expect(r).toMatchObject({ netPnl: 6 });
  });
  it("Crypto 0.01234567 BTC @ 60,000 -> 61,000 = $12.34567 (8-decimal precision kept)", () => {
    const r = evaluateTrade(t({ quantity: 0.01234567, entryPrice: 60000, exits: [{ quantity: 0.01234567, price: 61000 }] }));
    expect(r).toMatchObject({ netPnl: 12.34567 });
    expect(roundCrypto(0.123456789)).toBe(0.12345679);
  });
});

describe("asset class guess", () => {
  it.each([["EURUSD", "forex"], ["EUR/USD", "forex"], ["BTCUSDT", "crypto"], ["ETHUSDT.P", "crypto"], ["ESZ5", "future"], ["/MNQH26", "future"], ["AAPL", "stock"], ["AAPL  251219C00200000", "option"]])("%s -> %s", (s, c) => {
    expect(guessAssetClass(s)).toBe(c);
  });
  it("forex quote currency", () => { expect(forexQuote("GBPJPY")).toBe("JPY"); expect(forexQuote("ES")).toBeNull(); });
});
