import { describe, expect, it } from "vitest";
import { PRICES, FOUNDING, effectivePlan, monthlyValue, mrr, daysLeft, extendedEnd, validatePlanChange } from "./plans";
import { PLANS, FOUNDING_OFFER } from "../../../src/lib/plans";
import { effectivePlan as appEffective } from "../../../src/lib/entitlements";

const now = new Date("2026-11-14T12:00:00Z");
const future = "2026-12-01T00:00:00Z", past = "2026-11-01T00:00:00Z";
describe("pricing mirrors the customer app", () => {
  it("prices and founding offer have not drifted", () => {
    expect(PRICES).toEqual({ free: PLANS.free.monthly, starter: PLANS.starter.monthly, pro: PLANS.pro.monthly });
    expect(FOUNDING).toEqual(FOUNDING_OFFER);
  });
  it("effectivePlan agrees with the customer app on every case", () => {
    const cases = [null, { plan: "pro", status: "active", current_period_end: future }, { plan: "pro", status: "active", current_period_end: past }, { plan: "starter", status: "canceled", current_period_end: future }, { plan: "starter", status: "trialing", current_period_end: null }, { plan: "bogus", status: "active", current_period_end: future }, { plan: "free", status: "active", current_period_end: null }];
    for (const c of cases) expect(effectivePlan(c, now)).toBe(appEffective(c, now));
  });
});
describe("revenue", () => {
  it("MRR counts only active, unexpired paid subs; founding = 50%", () => {
    const subs = [
      { plan: "starter", status: "active", current_period_end: future },
      { plan: "pro", status: "active", current_period_end: future, is_founding_member: true },
      { plan: "pro", status: "active", current_period_end: past },
      { plan: "starter", status: "canceled", current_period_end: future },
      { plan: "free", status: "active", current_period_end: null },
    ];
    expect(mrr(subs, now)).toBe(12 + 12);
    expect(monthlyValue(subs[1], now)).toBe(12);
  });
  it("daysLeft and extendedEnd never shorten a running period", () => {
    expect(daysLeft({ plan: "pro", status: "active", current_period_end: "2026-11-17T12:00:00Z" }, now)).toBe(3);
    expect(daysLeft({ plan: "free", status: "active", current_period_end: null }, now)).toBeNull();
    expect(new Date(extendedEnd("2026-11-20T12:00:00Z", now)).getTime()).toBe(new Date("2026-11-20T12:00:00Z").getTime() + 35 * 86_400_000);
    expect(new Date(extendedEnd(past, now)).getTime()).toBe(now.getTime() + 35 * 86_400_000);
  });
});
describe("plan change validation", () => {
  const base = { to: "starter" as const, founding: true, foundingUsed: 0, wasFounding: false, trades: 3, confirmNoTrades: false };
  it("allows a normal founding upgrade", () => expect(validatePlanChange(base)).toBeNull());
  it("blocks the 11th founding seat", () => expect(validatePlanChange({ ...base, foundingUsed: 10 })).toMatch(/seats are taken/));
  it("keeps an existing founding member editable when seats are full", () => expect(validatePlanChange({ ...base, foundingUsed: 10, wasFounding: true })).toBeNull());
  it("requires confirmation when no trades were logged", () => {
    expect(validatePlanChange({ ...base, trades: 0 })).toMatch(/only after/);
    expect(validatePlanChange({ ...base, trades: 0, confirmNoTrades: true })).toBeNull();
  });
  it("rejects founding on free and unknown plans", () => {
    expect(validatePlanChange({ ...base, to: "free" })).toMatch(/free/);
    expect(validatePlanChange({ ...base, to: "gold" as never })).toMatch(/Unknown/);
  });
});
