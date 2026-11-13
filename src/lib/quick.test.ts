import { describe, it, expect } from "vitest";
import { inferAssetClass, quickToFormData, stampUtc } from "./quick";
import { tradeFormSchema, exitsOf, plannedRisk } from "./trade-schema";

const ACCT = "3f1b2c3d-1111-4222-8333-444455556666";
describe("inferAssetClass", () => {
  it("uses what you last logged for that symbol first", () => {
    expect(inferAssetClass("EURUSD", "stock", null)).toBe("stock");
    expect(inferAssetClass("ABCDEF", "crypto", "forex")).toBe("crypto");
  });
  it("then known futures roots, six-letter pairs, coin pairs, and your onboarding market", () => {
    expect(inferAssetClass("ES", null, null)).toBe("future");
    expect(inferAssetClass("NQ", null, null)).toBe("future");
    expect(inferAssetClass("EURUSD", null, null)).toBe("forex");
    expect(inferAssetClass("eur/usd", null, null)).toBe("forex");
    expect(inferAssetClass("BTCUSDT", null, null)).toBe("crypto");
    expect(inferAssetClass("BTCEUR", null, null)).toBe("crypto");
    expect(inferAssetClass("ETHBTC", null, null)).toBe("crypto");
    expect(inferAssetClass("GBPUSD", null, null)).toBe("forex");
    expect(inferAssetClass("AAPL", null, "stocks")).toBe("stock");
    expect(inferAssetClass("AAPL", null, "options")).toBe("option");
    expect(inferAssetClass("ZZZ", null, "futures")).toBe("future");
    expect(inferAssetClass("AAPL", null, "forex")).toBe("forex");
    expect(inferAssetClass("AAPL", null, null)).toBe("other");
    expect(inferAssetClass("AAPL", null, "nonsense")).toBe("other");
  });
});

describe("quickToFormData builds a normal trade from six fields", () => {
  const now = new Date("2026-11-13T09:05:42Z");
  it("formats the time as a UTC minute", () => { expect(stampUtc(now)).toBe("2026-11-13T09:05"); expect(stampUtc(new Date("2026-01-02T03:04:00Z"))).toBe("2026-01-02T03:04"); });
  it("EURUSD short 2 lots 1.1000 -> 1.0950, stop 1.1050: passes the full-form schema; planned risk 0.005 x 2 x 100,000 = 1,000; one exit of the whole position", () => {
    const fd = quickToFormData({ symbol: " eurusd ", side: "short", quantity: "2", entry_price: "1.1000", exit_price: "1.0950", stop_price: "1.1050" }, { accountId: ACCT, assetClass: "forex", now });
    const p = tradeFormSchema.safeParse({ ...Object.fromEntries(fd), emotions: [], mistakes: [] });
    expect(p.success).toBe(true);
    if (!p.success) return;
    expect(p.data.symbol).toBe("EURUSD"); expect(p.data.side).toBe("short");
    expect(exitsOf(p.data)).toEqual([{ quantity: 2, price: 1.095 }]);
    expect(plannedRisk(p.data, 1)).toBe(1000);
    expect(p.data.closed_at).toBe("2026-11-13T09:05");
  });
  it("a blank exit is an open trade (no exit, no close time); a blank stop is no stop", () => {
    const fd = quickToFormData({ symbol: "AAPL", side: "long", quantity: "10", entry_price: "190", exit_price: "  ", stop_price: "" }, { accountId: ACCT, assetClass: "stock", now });
    expect(fd.has("exit1_price")).toBe(false); expect(fd.has("closed_at")).toBe(false); expect(fd.has("stop_price")).toBe(false);
    const p = tradeFormSchema.safeParse({ ...Object.fromEntries(fd), emotions: [], mistakes: [] });
    expect(p.success).toBe(true); if (p.success) expect(exitsOf(p.data)).toEqual([]);
  });
  it("anything but 'short' is long, and only the six fields plus the filled-in account, market and times exist", () => {
    const fd = quickToFormData({ symbol: "X", side: "weird", quantity: "1", entry_price: "1", notes: "ignored", fees: "99" } as never, { accountId: ACCT, assetClass: "other", now });
    expect(fd.get("side")).toBe("long");
    expect([...fd.keys()].sort()).toEqual(["account_id", "asset_class", "entry_price", "opened_at", "quantity", "side", "symbol"]);
  });
  it("the same validation as the full form: wrong-side stop, zero size and missing entry are refused", () => {
    const bad = (o: object) => tradeFormSchema.safeParse({ ...Object.fromEntries(quickToFormData({ symbol: "EURUSD", side: "long", quantity: "1", entry_price: "1.1", ...o }, { accountId: ACCT, assetClass: "forex", now })), emotions: [], mistakes: [] }).success;
    expect(bad({ stop_price: "1.2" })).toBe(false); expect(bad({ quantity: "0" })).toBe(false); expect(bad({ entry_price: "" })).toBe(false); expect(bad({ stop_price: "1.0" })).toBe(true);
  });
});
