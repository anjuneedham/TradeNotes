import { describe, it, expect } from "vitest";
import { tradeFormSchema, plannedRisk, toTradeInputs, exitsOf } from "./trade-schema";
import { effectivePlan, canAddTrade } from "./entitlements";
import { summarize } from "./metrics";

const base = {
  account_id: "11111111-1111-4111-8111-111111111111", symbol: "eur/usd", asset_class: "forex", side: "long",
  quantity: "1", entry_price: "1.1000", opened_at: "2026-11-02T09:00", emotions: [], mistakes: [],
};
const parse = (o: object) => tradeFormSchema.safeParse({ ...base, ...o });
const errPaths = (o: object) => { const r = parse(o); return r.success ? [] : r.error.issues.map((i) => i.path[0]); };

describe("tradeFormSchema", () => {
  it("normalises symbol and accepts an open trade", () => {
    const r = parse({});
    expect(r.success && r.data.symbol).toBe("EURUSD");
  });
  it("blank optional numbers become undefined, not 0", () => {
    const r = parse({ stop_price: "", fees: "" });
    expect(r.success && r.data.stop_price).toBeUndefined();
  });
  it("rejects stop on wrong side", () => {
    expect(errPaths({ stop_price: "1.2" })).toContain("stop_price");
    expect(errPaths({ side: "short", stop_price: "1.0" })).toContain("stop_price");
    expect(errPaths({ stop_price: "1.09" })).toEqual([]);
  });
  it("rejects target on wrong side", () => {
    expect(errPaths({ target_price: "1.05" })).toContain("target_price");
  });
  it("exit with price only exits the full position and needs a time", () => {
    expect(errPaths({ exit1_price: "1.11" })).toContain("closed_at");
    const r = parse({ exit1_price: "1.11", closed_at: "2026-11-02T10:00" });
    expect(r.success && exitsOf(r.data)).toEqual([{ quantity: 1, price: 1.11 }]);
  });
  it("rejects exits larger than position", () => {
    expect(errPaths({ exit1_qty: "0.7", exit1_price: "1.1", exit2_qty: "0.7", exit2_price: "1.2", closed_at: "2026-11-02T10:00" })).toContain("exit1_qty");
  });
  it("accepts partial exits", () => {
    const r = parse({ exit1_qty: "0.5", exit1_price: "1.11", exit2_qty: "0.5", exit2_price: "1.12", closed_at: "2026-11-02T10:00" });
    expect(r.success).toBe(true);
  });
  it("rejects exit before entry", () => {
    expect(errPaths({ exit1_price: "1.11", closed_at: "2026-11-02T08:00" })).toContain("closed_at");
  });
  it("rejects half-filled exit and negative fees", () => {
    expect(errPaths({ exit1_qty: "0.5" })).toContain("exit1_price");
    expect(errPaths({ fees: "-1" })).toContain("fees");
  });
});

describe("plannedRisk", () => {
  const d = (o = {}) => ({ entry_price: 1.1, stop_price: 1.095, quantity: 1, multiplier: undefined as number | undefined, asset_class: "forex" as const, ...o });
  it("forex: 50 pips on 1 lot = $500", () => expect(plannedRisk(d(), 1)).toBe(500));
  it("null without stop or fx", () => {
    expect(plannedRisk(d({ stop_price: undefined }), 1)).toBeNull();
    expect(plannedRisk(d(), null)).toBeNull();
  });
  it("applies fx to account currency", () => expect(plannedRisk(d(), 0.5)).toBe(250));
});

describe("DB rows -> metrics (end to end)", () => {
  it("handles PostgREST string numerics and fx", () => {
    const rows = [{ id: "t1", side: "long" as const, quantity: "1.00000000", entry_price: "1.10000000", fees: "7.00", multiplier: "100000", initial_risk: "500.00", currency: "USD", fx_to_account: null, closed_at: "2026-11-02T10:00:00Z" }];
    const exits = [{ trade_id: "t1", quantity: "1.00000000", price: "1.10500000" }];
    const s = summarize(toTradeInputs(rows, exits, "USD"));
    expect(s.netPnl).toBe(493); // 0.005 * 100000 - 7
    expect(s.avgR).toBeCloseTo(0.986);
  });
  it("trade with no exits is open and excluded", () => {
    const rows = [{ id: "t1", side: "long" as const, quantity: "1", entry_price: "1.1", fees: "0", multiplier: "1", initial_risk: null, currency: null, fx_to_account: null, closed_at: null }];
    expect(summarize(toTradeInputs(rows, [], "USD")).excluded.open_or_partial).toEqual(["t1"]);
  });
  it("foreign quote currency without fx is excluded, not mixed in", () => {
    const rows = [{ id: "t1", side: "long" as const, quantity: "1", entry_price: "150", fees: "0", multiplier: "1000", initial_risk: null, currency: "JPY", fx_to_account: null, closed_at: null }];
    expect(summarize(toTradeInputs(rows, [{ trade_id: "t1", quantity: "1", price: "151" }], "USD")).excluded.missing_fx).toEqual(["t1"]);
  });
});

describe("entitlements", () => {
  const future = new Date(Date.now() + 864e5).toISOString(), past = new Date(Date.now() - 864e5).toISOString();
  it("active paid plan unlocks", () => expect(effectivePlan({ plan: "pro", status: "active", current_period_end: future })).toBe("pro"));
  it("past_due keeps access through the paid period + grace, then free", () => {
    expect(effectivePlan({ plan: "pro", status: "past_due", current_period_end: future })).toBe("pro");
    const end = new Date("2026-01-10T00:00:00Z").toISOString();
    expect(effectivePlan({ plan: "pro", status: "past_due", current_period_end: end }, new Date("2026-01-12T00:00:00Z"))).toBe("pro");
    expect(effectivePlan({ plan: "pro", status: "past_due", current_period_end: end }, new Date("2026-01-14T00:00:00Z"))).toBe("free");
    expect(effectivePlan({ plan: "pro", status: "past_due", current_period_end: null })).toBe("free");
  });
  it("canceled, expired fall back to free", () => {
    expect(effectivePlan({ plan: "pro", status: "canceled", current_period_end: future })).toBe("free");
    expect(effectivePlan({ plan: "starter", status: "active", current_period_end: past })).toBe("free");
  });
  it("unknown plan / no subscription is free", () => {
    expect(effectivePlan({ plan: "enterprise", status: "active", current_period_end: null })).toBe("free");
    expect(effectivePlan(null)).toBe("free");
  });
  it("trade limits", () => {
    expect(canAddTrade("free", 49)).toBe(true);
    expect(canAddTrade("free", 50)).toBe(false);
    expect(canAddTrade("pro", 1e6)).toBe(true);
  });
});

import { ASSET_CLASSES as AC } from "./trade-schema";
describe("asset classes match the database check constraint", () => {
  it("every form value is allowed by trades.asset_class", () => {
    const db = ["stock", "option", "future", "forex", "crypto", "other"]; // db/paste trades_asset_class check
    for (const a of AC) expect(db).toContain(a);
  });
});
