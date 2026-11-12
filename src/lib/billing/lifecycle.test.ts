import { describe, it, expect } from "vitest";
import { applyEvent, FREE, planOf, subscriptionIdOf, userIdOf, type SubState, type ProviderEvent } from "./lifecycle";
import { effectivePlan } from "../entitlements";
import { verifySignature, signPayload } from "./handypay";

const U = "11111111-1111-4111-8111-111111111111";
const T0 = Date.UTC(2026, 10, 1) / 1000; // 2026-11-01
const DAY = 86400;
let n = 0;
const ev = (type: string, object: Record<string, unknown>, created = T0): ProviderEvent => ({ id: `evt_${++n}`, type, created, data: { object } });
const sub = (o: Record<string, unknown> = {}) => ({ id: "sub_1", customer: "cus_1", status: "active", current_period_end: T0 + 30 * DAY, cancel_at_period_end: false, metadata: { user_id: U, plan: "starter" }, ...o });
const inv = (o: Record<string, unknown> = {}) => ({ id: "in_1", subscription: "sub_1", amount_paid: 1200, currency: "usd", lines: { data: [{ period: { end: T0 + 30 * DAY } }] }, metadata: { user_id: U, plan: "starter" }, ...o });
/** Run events in order, returning the final state (null `next` keeps the state unchanged, as the webhook does). */
const run = (events: ProviderEvent[], start: SubState = FREE) => events.reduce((s, e) => applyEvent(s, e).next ?? s, start);
const at = (unix: number) => new Date(unix * 1000);

describe("subscription lifecycle", () => {
  it("1-2. free registration: no row / FREE state is the Free plan", () => {
    expect(effectivePlan(null)).toBe("free");
    expect(effectivePlan(FREE)).toBe("free");
  });

  it("3-7. Standard checkout -> payment -> entitlement active", () => {
    const s = run([ev("checkout.session.completed", { id: "cs_1", subscription: "sub_1", customer: "cus_1", metadata: { user_id: U, plan: "starter" } }),
      ev("invoice.paid", inv(), T0 + 5)]);
    expect(s.plan).toBe("starter");
    expect(s.status).toBe("active");
    expect(s.provider_subscription_id).toBe("sub_1");
    expect(s.current_period_end).toBe(at(T0 + 30 * DAY).toISOString());
    expect(effectivePlan(s, at(T0 + DAY))).toBe("starter");
  });

  it("4. Premium is identified by metadata or, failing that, by price", () => {
    expect(planOf({ metadata: { plan: "pro" } })).toBe("pro");
    expect(planOf({ amount_paid: 2400 })).toBe("pro");
    expect(planOf({ items: { data: [{ price: { unit_amount: 1200 } }] } })).toBe("starter");
    expect(planOf({ amount_paid: 999 })).toBeNull();
    expect(planOf({ metadata: { plan: "enterprise" } })).toBeNull();
  });

  it("checkout records a paid plan and confirmation email", () => {
    const o = applyEvent(FREE, ev("checkout.session.completed", { subscription: "sub_1", metadata: { user_id: U, plan: "pro" } }));
    expect(o.next?.plan).toBe("pro");
    expect(o.notify).toBe("subscription_confirmed");
  });

  it("one-time (non-subscription) checkout is ignored", () => {
    expect(applyEvent(FREE, ev("checkout.session.completed", { id: "cs_x", metadata: { user_id: U } })).next).toBeNull();
  });

  it("8. renewal extends the period and records a payment", () => {
    const s1 = run([ev("checkout.session.completed", { subscription: "sub_1", metadata: { user_id: U, plan: "starter" } }), ev("invoice.paid", inv(), T0 + 5)]);
    const o = applyEvent(s1, ev("invoice.paid", inv({ id: "in_2", lines: { data: [{ period: { end: T0 + 60 * DAY } }] } }), T0 + 30 * DAY));
    expect(o.next?.current_period_end).toBe(at(T0 + 60 * DAY).toISOString());
    expect(o.payment).toMatchObject({ id: "in_2", amount_cents: 1200, currency: "USD", status: "paid" });
    expect(o.notify).toBe("renewed");
    expect(effectivePlan(o.next!, at(T0 + 45 * DAY))).toBe("starter");
  });

  it("9. failed payment -> past_due: access through period end + grace, then Free", () => {
    const paid = run([ev("checkout.session.completed", { subscription: "sub_1", metadata: { user_id: U, plan: "starter" } }), ev("invoice.paid", inv(), T0 + 5)]);
    const o = applyEvent(paid, ev("invoice.payment_failed", inv({ id: "in_2", amount_due: 1200 }), T0 + 30 * DAY));
    expect(o.next?.status).toBe("past_due");
    expect(o.notify).toBe("payment_failed");
    expect(o.payment?.status).toBe("failed");
    expect(effectivePlan(o.next!, at(T0 + 31 * DAY))).toBe("starter");
    expect(effectivePlan(o.next!, at(T0 + 34 * DAY))).toBe("free");
  });

  it("9b. failed payment then successful retry restores active", () => {
    const s = run([ev("checkout.session.completed", { subscription: "sub_1", metadata: { user_id: U, plan: "starter" } }),
      ev("invoice.payment_failed", inv(), T0 + 30 * DAY), ev("invoice.paid", inv({ id: "in_2", lines: { data: [{ period: { end: T0 + 60 * DAY } }] } }), T0 + 31 * DAY)]);
    expect(s.status).toBe("active");
    expect(effectivePlan(s, at(T0 + 50 * DAY))).toBe("starter");
  });

  it("10-12. cancellation is at period end: access continues (paid-through), then ends", () => {
    const active = run([ev("checkout.session.completed", { subscription: "sub_1", metadata: { user_id: U, plan: "pro" } }), ev("invoice.paid", inv({ amount_paid: 2400, metadata: { plan: "pro" } }), T0 + 5)]);
    const o = applyEvent(active, ev("customer.subscription.updated", sub({ cancel_at_period_end: true, metadata: { user_id: U, plan: "pro" } }), T0 + 10 * DAY));
    expect(o.next?.cancel_at_period_end).toBe(true);
    expect(o.notify).toBe("cancellation_scheduled");
    expect(effectivePlan(o.next!, at(T0 + 20 * DAY))).toBe("pro"); // paid-through access
    const ended = applyEvent(o.next!, ev("customer.subscription.deleted", sub({ status: "canceled", ended_at: T0 + 30 * DAY }), T0 + 30 * DAY));
    expect(ended.next?.status).toBe("canceled");
    expect(ended.notify).toBe("subscription_ended");
    expect(effectivePlan(ended.next!, at(T0 + 30 * DAY + 1))).toBe("free"); // 11/13. downgrade / expired -> Free
  });

  it("resume before period end clears the scheduled cancellation", () => {
    const cancelling = run([ev("checkout.session.completed", { subscription: "sub_1", metadata: { user_id: U, plan: "starter" } }),
      ev("customer.subscription.updated", sub({ cancel_at_period_end: true }), T0 + DAY)]);
    const s = applyEvent(cancelling, ev("customer.subscription.updated", sub(), T0 + 2 * DAY)).next!;
    expect(s.cancel_at_period_end).toBe(false);
    expect(s.canceled_at).toBeNull();
  });

  it("13. expired subscription (period end passed, no renewal event) is Free", () => {
    const s = run([ev("checkout.session.completed", { subscription: "sub_1", metadata: { user_id: U, plan: "starter" } }), ev("invoice.paid", inv(), T0 + 5)]);
    expect(effectivePlan(s, at(T0 + 31 * DAY))).toBe("free");
  });

  it("14. re-subscription after cancellation activates the new subscription", () => {
    const ended = run([ev("checkout.session.completed", { subscription: "sub_1", metadata: { user_id: U, plan: "starter" } }),
      ev("customer.subscription.deleted", sub({ status: "canceled" }), T0 + 30 * DAY)]);
    const back = run([ev("checkout.session.completed", { subscription: "sub_2", metadata: { user_id: U, plan: "pro" } }, T0 + 40 * DAY),
      ev("invoice.paid", inv({ id: "in_9", subscription: "sub_2", amount_paid: 2400, metadata: { plan: "pro" }, lines: { data: [{ period: { end: T0 + 70 * DAY } }] } }), T0 + 40 * DAY + 5)], ended);
    expect(back.plan).toBe("pro");
    expect(back.status).toBe("active");
    expect(back.provider_subscription_id).toBe("sub_2");
    expect(back.canceled_at).toBeNull();
    expect(effectivePlan(back, at(T0 + 50 * DAY))).toBe("pro");
  });

  it("late events from an old, replaced subscription do not change access", () => {
    const s = run([ev("checkout.session.completed", { subscription: "sub_2", metadata: { user_id: U, plan: "pro" } }, T0 + 40 * DAY)]);
    const o = applyEvent(s, ev("customer.subscription.deleted", sub({ id: "sub_1", status: "canceled" }), T0 + 41 * DAY));
    expect(o.next).toBeNull();
    expect(o.note).toBe("ignored:other-subscription");
  });

  it("out-of-order (stale) events are ignored", () => {
    const s = run([ev("checkout.session.completed", { subscription: "sub_1", metadata: { user_id: U, plan: "starter" } }, T0 + 10),
      ev("customer.subscription.updated", sub({ cancel_at_period_end: true }), T0 + 100)]);
    const o = applyEvent(s, ev("customer.subscription.updated", sub({ cancel_at_period_end: false }), T0 + 50));
    expect(o.next).toBeNull();
    expect(o.note).toBe("ignored:stale");
  });

  it("duplicate delivery of the same event yields the same state (idempotent reducer; DB primary key also dedupes)", () => {
    const e = ev("invoice.paid", inv(), T0 + 5);
    const once = run([ev("checkout.session.completed", { subscription: "sub_1", metadata: { user_id: U, plan: "starter" } }), e]);
    expect(run([e], once)).toEqual(once);
  });

  it("refunds are recorded but do not change access by themselves", () => {
    const o = applyEvent(FREE, ev("charge.refunded", { id: "ch_1", amount_refunded: 1200, currency: "usd" }));
    expect(o.next).toBeNull();
    expect(o.payment).toMatchObject({ status: "refunded", amount_cents: 1200 });
  });

  it("unknown events and unknown plans are ignored, never throw", () => {
    expect(applyEvent(FREE, ev("charge.dispute.created", {})).next).toBeNull();
    expect(applyEvent(FREE, ev("customer.subscription.updated", { id: "sub_9", status: "active" })).note).toBe("ignored:unknown-plan");
    expect(applyEvent(FREE, { id: "e", type: "invoice.paid", created: T0, data: {} }).next).toBeNull();
  });

  it("extracts user and subscription ids", () => {
    expect(userIdOf(ev("checkout.session.completed", { metadata: { user_id: U } }))).toBe(U);
    expect(subscriptionIdOf(ev("customer.subscription.updated", { id: "sub_7" }))).toBe("sub_7");
    expect(subscriptionIdOf(ev("invoice.paid", { subscription: "sub_8" }))).toBe("sub_8");
  });
});

describe("webhook signature (HMAC-SHA256 over the raw body, header 'sha256=<hex>')", () => {
  const secret = "whsec_test";
  const body = JSON.stringify({ id: "evt_1", type: "invoice.paid", created: T0, data: {} });
  it("accepts a correct signature", () => expect(verifySignature(body, signPayload(body, secret), secret)).toBe(true));
  it("accepts the bare hex form", () => expect(verifySignature(body, signPayload(body, secret).slice(7), secret)).toBe(true));
  it("rejects a tampered body", () => expect(verifySignature(body.replace("paid", "PAID"), signPayload(body, secret), secret)).toBe(false));
  it("rejects a wrong secret", () => expect(verifySignature(body, signPayload(body, "other"), secret)).toBe(false));
  it("rejects missing, empty or malformed signatures", () => {
    expect(verifySignature(body, null, secret)).toBe(false);
    expect(verifySignature(body, "", secret)).toBe(false);
    expect(verifySignature(body, "sha256=zz", secret)).toBe(false);
    expect(verifySignature(body, signPayload(body, secret), "")).toBe(false);
  });
});
