import { describe, it, expect } from "vitest";
import { commissionFor, cleanRef } from "./affiliate";

const d = (s: string) => new Date(s);
describe("affiliate commission", () => {
  it("pays 30% of cash with a 30-day hold", () => {
    const c = commissionFor({ amountCents: 1200, pct: 30, paymentAt: d("2026-12-01"), firstPaidAt: d("2026-12-01") });
    expect(c?.commissionCents).toBe(360);
    expect(c?.payableAfter.toISOString().slice(0, 10)).toBe("2026-12-31");
  });
  it("uses the amount actually paid (discounted founding price)", () => {
    expect(commissionFor({ amountCents: 600, pct: 30, paymentAt: d("2026-12-01"), firstPaidAt: d("2026-12-01") })?.commissionCents).toBe(180);
  });
  it("annual plan pays once on 12000", () => {
    expect(commissionFor({ amountCents: 12000, pct: 30, paymentAt: d("2026-12-01"), firstPaidAt: d("2026-12-01") })?.commissionCents).toBe(3600);
    expect(commissionFor({ amountCents: 12000, pct: 30, paymentAt: d("2027-12-01"), firstPaidAt: d("2026-12-01") })).toBeNull();
  });
  it("stops after 12 months of monthly payments", () => {
    expect(commissionFor({ amountCents: 1200, pct: 30, paymentAt: d("2027-11-01"), firstPaidAt: d("2026-12-01") })).not.toBeNull();
    expect(commissionFor({ amountCents: 1200, pct: 30, paymentAt: d("2027-12-01"), firstPaidAt: d("2026-12-01") })).toBeNull();
  });
  it("ignores zero, negative and 0% payments", () => {
    expect(commissionFor({ amountCents: 0, pct: 30, paymentAt: d("2026-12-01"), firstPaidAt: d("2026-12-01") })).toBeNull();
    expect(commissionFor({ amountCents: 1200, pct: 0, paymentAt: d("2026-12-01"), firstPaidAt: d("2026-12-01") })).toBeNull();
  });
  it("cleans ref codes", () => {
    expect(cleanRef(" FXKing7 ")).toBe("fxking7");
    expect(cleanRef("a")).toBeNull();
    expect(cleanRef("bad code!")).toBeNull();
    expect(cleanRef(undefined)).toBeNull();
  });
});
