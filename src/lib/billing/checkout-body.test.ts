import { describe, it, expect, afterEach, vi } from "vitest";
import { createSubscriptionCheckout } from "./handypay";
import { HANDYPAY_PRICE_IDS, CHECKOUT_LINKS, TRIAL_DAYS, PLANS, checkoutLink } from "../plans";

const UID = "0f8fad5b-d9cb-469f-a165-70867728950e";
afterEach(() => { vi.restoreAllMocks(); delete process.env.HANDYPAY_API_KEY; });
function capture() {
  process.env.HANDYPAY_API_KEY = "hp_test_fake";
  const sent: { url: string; body: Record<string, unknown> }[] = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
    sent.push({ url: String(url), body: JSON.parse(String(init?.body)) });
    return new Response(JSON.stringify({ session: { url: "https://checkout.handypay.me/s/abc" } }), { status: 200 });
  });
  return sent;
}
const make = (plan: "starter" | "pro", interval: "month" | "year", founding?: { amountCents: number }) =>
  createSubscriptionCheckout({ plan, userId: UID, email: "a@b.test", siteUrl: "https://tradenotes.dev", interval, founding });

describe("checkout carries the 14-day trial (price form) except the founding price (inline form)", () => {
  it("trial length is 14 days", () => { expect(TRIAL_DAYS).toBe(14); });
  it.each([["starter", "month"], ["starter", "year"], ["pro", "month"], ["pro", "year"]] as const)("%s %s uses its HandyPay price id with trial_period_days 14", async (plan, interval) => {
    const sent = capture();
    await make(plan, interval);
    const b = sent[0].body;
    expect(sent[0].url).toMatch(/\/subscription-sessions$/);
    expect(b.price_id).toBe(HANDYPAY_PRICE_IDS[plan][interval]);
    expect(b.trial_period_days).toBe(14);
    expect(b).not.toHaveProperty("amount_cents"); // the amount comes from the HandyPay price, never from us
    expect(b.metadata).toMatchObject({ user_id: UID, plan, interval });
    expect(b.customer_email).toBe("a@b.test");
    expect(String(b.success_url)).toBe("https://tradenotes.dev/app/billing?checkout=success");
  });
  it("founding price stays an inline custom amount with no trial and a founding flag", async () => {
    const sent = capture();
    await make("starter", "month", { amountCents: 600 });
    const b = sent[0].body;
    expect(b).toMatchObject({ amount_cents: 600, currency: "usd", interval: "month" });
    expect(b).not.toHaveProperty("trial_period_days"); expect(b).not.toHaveProperty("price_id");
    expect((b.metadata as Record<string, string>).founding).toBe("1");
  });
});

describe("the four HandyPay prices and links", () => {
  it("every price id and static link is distinct, and each link embeds its own price id (decoded)", () => {
    const ids = Object.values(HANDYPAY_PRICE_IDS).flatMap((v) => Object.values(v));
    expect(new Set(ids).size).toBe(4);
    for (const plan of ["starter", "pro"] as const) for (const iv of ["month", "year"] as const) {
      const token = checkoutLink(plan, iv).split("/subscribe/")[1].split(".")[0];
      const j = JSON.parse(Buffer.from(token, "base64url").toString());
      expect(j.r).toBe(HANDYPAY_PRICE_IDS[plan][iv]);
    }
    expect(Object.values(CHECKOUT_LINKS).flatMap((v) => Object.values(v))).toHaveLength(4);
  });
  it("prices match PLANS (verified on the hosted checkout pages: 12/24 monthly, 120/240 annual)", () => {
    expect([PLANS.starter.monthly, PLANS.pro.monthly, PLANS.starter.annual, PLANS.pro.annual]).toEqual([12, 24, 120, 240]);
  });
});
