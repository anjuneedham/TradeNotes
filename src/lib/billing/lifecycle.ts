/**
 * Subscription lifecycle as a PURE function: (current state, provider event) -> new state + side effects to record.
 * The webhook route does the I/O (signature check, idempotency, DB writes); everything that decides access lives here
 * so every lifecycle step is unit-tested (see lifecycle.test.ts).
 *
 * Event shape: HandyPay documents `{ id, type, created, data }` and Stripe-style event names. The object fields used below
 * (status, current_period_end, cancel_at_period_end, metadata, subscription, amount_paid…) follow the Stripe conventions
 * HandyPay's events are named after. `objectOf` accepts both `data.object` and a bare `data`. VERIFY against a real
 * test-mode delivery before charging money (docs/subscriptions/PAYMENT_TEST_REPORT.md).
 */
import type { PlanId } from "../plans";

export type SubStatus = "active" | "trialing" | "past_due" | "canceled" | "unpaid" | "incomplete" | "pending";
export interface SubState {
  plan: PlanId;
  status: SubStatus;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  provider_subscription_id: string | null;
  provider_customer_id: string | null;
  last_event_at: string | null;
}
export interface ProviderEvent { id: string; type: string; created: number; data: Record<string, unknown> }
export interface PaymentRecord { id: string; amount_cents: number; currency: string; status: "paid" | "failed" | "refunded"; description: string; receipt_url: string | null; occurred_at: string }
export type Notify = "subscription_confirmed" | "payment_failed" | "cancellation_scheduled" | "subscription_ended" | "renewed";
export interface Outcome { next: SubState | null; payment: PaymentRecord | null; notify: Notify | null; note: string }

/** Monthly prices in cents, used only when an event carries no plan metadata. */
export const PLAN_BY_AMOUNT: Record<number, PlanId> = { 1200: "starter", 2400: "pro", 12000: "starter", 24000: "pro" };

type Obj = Record<string, unknown>;
export const objectOf = (e: ProviderEvent): Obj => ((e.data?.object as Obj) ?? e.data ?? {}) as Obj;
const str = (v: unknown) => (typeof v === "string" && v ? v : null);
const numv = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : null);
const iso = (unix: unknown) => { const n = numv(unix); return n === null ? null : new Date(n * 1000).toISOString(); };
const meta = (o: Obj) => ((o.metadata as Obj) ?? {}) as Obj;

/** Plan named by an event object: metadata.plan, else price amount. */
export function planOf(o: Obj): PlanId | null {
  const m = str(meta(o).plan);
  if (m === "starter" || m === "pro") return m;
  const items = ((o.items as Obj)?.data as Obj[] | undefined) ?? ((o.lines as Obj)?.data as Obj[] | undefined) ?? [];
  const amount = numv(((items[0]?.price as Obj)?.unit_amount)) ?? numv(o.amount_cents) ?? numv(o.amount_total) ?? numv(o.amount_paid) ?? numv(o.amount_due);
  return amount !== null ? PLAN_BY_AMOUNT[amount] ?? null : null;
}
/** The subscription id an event refers to. */
export function subscriptionIdOf(e: ProviderEvent): string | null {
  const o = objectOf(e);
  if (e.type.startsWith("customer.subscription.")) return str(o.id);
  return str(o.subscription) ?? str((o.subscription as Obj)?.id);
}
export const userIdOf = (e: ProviderEvent): string | null => {
  const o = objectOf(e);
  return str(meta(o).user_id) ?? str(meta((o.subscription_details as Obj) ?? {}).user_id);
};

const STATUS: Record<string, SubStatus> = { active: "active", trialing: "trialing", past_due: "past_due", canceled: "canceled", cancelled: "canceled", unpaid: "unpaid", incomplete: "incomplete", incomplete_expired: "canceled" };

export const FREE: SubState = { plan: "free", status: "active", current_period_end: null, cancel_at_period_end: false, canceled_at: null, provider_subscription_id: null, provider_customer_id: null, last_event_at: null };

/** Apply one provider event. `cur` is the user's current row (FREE if none). Never throws on unknown input: it ignores it. */
export function applyEvent(cur: SubState, e: ProviderEvent): Outcome {
  const o = objectOf(e);
  const at = new Date(e.created * 1000).toISOString();
  const subId = subscriptionIdOf(e);
  const base: SubState = { ...cur, provider_subscription_id: subId ?? cur.provider_subscription_id, provider_customer_id: str(o.customer) ?? cur.provider_customer_id };
  // Subscription-state events older than the last applied one are stale (webhooks can arrive out of order).
  const stale = cur.last_event_at !== null && at < cur.last_event_at;
  // An event about a different subscription than the one we track (e.g. an old, replaced subscription) must not change access.
  const foreign = cur.provider_subscription_id !== null && subId !== null && subId !== cur.provider_subscription_id
    && !(e.type === "checkout.session.completed" || e.type === "customer.subscription.created");
  const state = (s: Partial<SubState>, notify: Notify | null, note: string, payment: PaymentRecord | null = null): Outcome =>
    stale || foreign ? { next: null, payment, notify: null, note: `ignored:${stale ? "stale" : "other-subscription"}` }
      : { next: { ...base, ...s, last_event_at: at }, payment, notify, note };

  switch (e.type) {
    case "checkout.session.completed": {
      if (!subId) return { next: null, payment: null, notify: null, note: "ignored:not-a-subscription-checkout" };
      const plan = planOf(o);
      if (!plan) return { next: null, payment: null, notify: null, note: "ignored:unknown-plan" };
      // Provisional period until invoice.paid / subscription.updated supply the real one.
      const end = cur.provider_subscription_id === subId && cur.current_period_end ? cur.current_period_end : new Date(e.created * 1000 + 32 * 86400000).toISOString();
      return state({ plan, status: "active", current_period_end: end, cancel_at_period_end: false, canceled_at: null }, "subscription_confirmed", "applied:checkout");
    }
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const plan = planOf(o) ?? (cur.plan !== "free" ? cur.plan : null);
      if (!plan) return { next: null, payment: null, notify: null, note: "ignored:unknown-plan" };
      const status = STATUS[String(o.status)] ?? cur.status;
      const cancelling = o.cancel_at_period_end === true;
      const notify: Notify | null = cancelling && !cur.cancel_at_period_end ? "cancellation_scheduled" : null;
      return state({ plan, status, current_period_end: iso(o.current_period_end) ?? cur.current_period_end, cancel_at_period_end: cancelling,
        canceled_at: cancelling ? cur.canceled_at ?? at : null }, notify, `applied:${e.type}`);
    }
    case "customer.subscription.deleted":
      return state({ status: "canceled", cancel_at_period_end: false, canceled_at: cur.canceled_at ?? at,
        current_period_end: iso(o.ended_at) ?? iso(o.current_period_end) ?? at }, "subscription_ended", "applied:deleted");
    case "invoice.paid":
    case "invoice.payment_succeeded": {
      const lines = ((o.lines as Obj)?.data as Obj[] | undefined) ?? [];
      const periodEnd = iso((lines[0]?.period as Obj)?.end) ?? iso(o.period_end);
      const pay: PaymentRecord = { id: str(o.id) ?? e.id, amount_cents: numv(o.amount_paid) ?? numv(o.total) ?? 0, currency: (str(o.currency) ?? "usd").toUpperCase(),
        status: "paid", description: "Subscription payment", receipt_url: str(o.hosted_invoice_url) ?? str(o.receipt_url), occurred_at: at };
      const plan = planOf(o) ?? (cur.plan !== "free" ? cur.plan : null);
      if (!plan) return { next: null, payment: pay, notify: null, note: "ignored:unknown-plan(payment recorded)" };
      const renewal = cur.plan !== "free" && cur.status === "active" && cur.provider_subscription_id === subId;
      return state({ plan, status: "active", current_period_end: periodEnd ?? cur.current_period_end }, renewal ? "renewed" : null, "applied:paid", pay);
    }
    case "invoice.payment_failed": {
      const pay: PaymentRecord = { id: str(o.id) ? `${o.id}:failed:${e.id}` : e.id, amount_cents: numv(o.amount_due) ?? numv(o.total) ?? 0, currency: (str(o.currency) ?? "usd").toUpperCase(),
        status: "failed", description: "Payment failed", receipt_url: str(o.hosted_invoice_url), occurred_at: at };
      if (cur.plan === "free") return { next: null, payment: pay, notify: null, note: "ignored:no-paid-plan(payment recorded)" };
      return state({ status: "past_due" }, "payment_failed", "applied:failed", pay);
    }
    case "charge.refunded": {
      const pay: PaymentRecord = { id: `${str(o.id) ?? e.id}:refund`, amount_cents: numv(o.amount_refunded) ?? numv(o.amount) ?? 0, currency: (str(o.currency) ?? "usd").toUpperCase(),
        status: "refunded", description: "Refund", receipt_url: str(o.receipt_url), occurred_at: at };
      return { next: null, payment: pay, notify: null, note: "recorded:refund" }; // access follows the subscription events, not the refund
    }
    default:
      return { next: null, payment: null, notify: null, note: `ignored:${e.type}` };
  }
}
