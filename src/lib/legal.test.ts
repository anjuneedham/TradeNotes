import { describe, it, expect } from "vitest";
import { isFilled, show, LEGAL, missingLegalFields } from "./legal";
describe("legal config", () => {
  it("TODO and empty values are not filled", () => { expect(isFilled("TODO: x")).toBe(false); expect(isFilled("  ")).toBe(false); expect(isFilled("Acme Ltd")).toBe(true); });
  it("show() prints a visible marker for missing values", () => { expect(show("TODO: x", "support email")).toBe("[support email — not set yet]"); expect(show("a@b.co", "e")).toBe("a@b.co"); });
  it("lists exactly the required fields that are missing", () => { const m = missingLegalFields(); for (const k of m) expect(["businessName", "supportEmail"]).toContain(k); });
  it("the review notation and the responsibility statement never contradict each other", () => {
    expect(LEGAL.responsibilityStatement).toMatch(/accepts full responsibility/);
    // If the flag says a lawyer reviewed the pages, the on-page statement must say so, and must not still say they were written without review.
    if (LEGAL.counselReviewed) { expect(LEGAL.responsibilityStatement).toMatch(/reviewed by a lawyer/); expect(LEGAL.responsibilityStatement).not.toMatch(/without review/); }
    else expect(LEGAL.responsibilityStatement).toMatch(/without review by a lawyer/);
  });
  it("business name and address are filled", () => { expect(isFilled(LEGAL.businessName)).toBe(true); expect(isFilled(LEGAL.address)).toBe(true); });
  it("refund and deletion windows are sane numbers", () => { expect(LEGAL.refundDays).toBeGreaterThanOrEqual(0); expect(LEGAL.deletionDays).toBeGreaterThan(0); });
});
