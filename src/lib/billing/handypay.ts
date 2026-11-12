/**
 * HandyPay client (REST, no SDK). Docs: https://www.handypay.me/docs/api-reference (read 2026-11-11).
 * - Auth: `Authorization: Bearer hp_live_… | hp_test_…` (HANDYPAY_API_KEY). Base: https://api.handypay.me/api/v1
 * - Webhooks: header `X-HandyPay-Signature: sha256=<hex>`, HMAC-SHA256 of the RAW body with the endpoint secret
 *   (HANDYPAY_WEBHOOK_SECRET). No timestamp in the signature, so replay protection = event-id idempotency (billing_events PK).
 * Disabled (returns null) until HANDYPAY_API_KEY is set; the billing page then falls back to the static checkout links.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { PLANS, type PlanId } from "../plans";

const BASE = () => process.env.HANDYPAY_API_URL ?? "https://api.handypay.me/api/v1"; // HANDYPAY_API_URL: test hook only
export const handypayEnabled = () => Boolean(process.env.HANDYPAY_API_KEY);
export const webhookSecretSet = () => Boolean(process.env.HANDYPAY_WEBHOOK_SECRET);

/** Only https URLs are followed (plain http allowed solely when the HANDYPAY_API_URL test hook points at a local fake). */
export const safeUrl = (u: string) => /^https:\/\//.test(u) || (Boolean(process.env.HANDYPAY_API_URL) && /^http:\/\/(localhost|127\.0\.0\.1)[:/]/.test(u));

export function signPayload(rawBody: string, secret: string): string {
  return "sha256=" + createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
}

/** Constant-time check of `sha256=<hex>` (or bare hex) against the raw body. */
export function verifySignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header || !secret) return false;
  const hex = header.trim().replace(/^sha256=/i, "");
  if (!/^[0-9a-f]{64}$/i.test(hex)) return false;
  const want = createHmac("sha256", secret).update(rawBody, "utf8").digest();
  const got = Buffer.from(hex, "hex");
  return got.length === want.length && timingSafeEqual(got, want);
}

async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const key = process.env.HANDYPAY_API_KEY;
  if (!key) throw new Error("HandyPay is not configured");
  const res = await fetch(BASE() + path, {
    method, headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err = (json.error as { code?: string } | undefined)?.code ?? res.status;
    throw new Error(`HandyPay ${method} ${path} failed: ${err}`); // never includes the key or customer data
  }
  return json as T;
}

const urlIn = (j: Record<string, unknown>): string | null => {
  const s = (j.session ?? j.data ?? j) as Record<string, unknown>;
  return typeof s.url === "string" ? s.url : typeof j.url === "string" ? (j.url as string) : null;
};

/**
 * Create a hosted subscription checkout for this user. Uses the documented inline form so `metadata` (user id + plan)
 * is echoed on webhooks — that, not the email, is how the payment is matched to the account.
 */
export async function createSubscriptionCheckout(opts: { plan: Exclude<PlanId, "free">; userId: string; email: string; siteUrl: string }): Promise<string> {
  const p = PLANS[opts.plan];
  const j = await call<Record<string, unknown>>("POST", "/subscription-sessions", {
    amount_cents: p.monthly * 100, currency: "usd", interval: "month", interval_count: 1, quantity: 1,
    name: `TradeNotes ${p.name}`, customer_email: opts.email,
    success_url: `${opts.siteUrl}/app/billing?checkout=success`, cancel_url: `${opts.siteUrl}/app/billing?checkout=cancelled`,
    metadata: { user_id: opts.userId, plan: opts.plan },
  });
  const url = urlIn(j);
  if (!url || !safeUrl(url)) throw new Error("HandyPay returned no checkout URL");
  return url;
}

/** Cancel at the end of the paid period (HandyPay's documented behaviour). */
export const cancelAtPeriodEnd = (subscriptionId: string) => call("POST", `/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`, {});
export const resumeSubscription = (subscriptionId: string) => call("POST", `/subscriptions/${encodeURIComponent(subscriptionId)}/resume`, {});
export async function portalUrl(subscriptionId: string): Promise<string | null> {
  return urlIn(await call<Record<string, unknown>>("POST", `/subscriptions/${encodeURIComponent(subscriptionId)}/portal-session`, {}));
}
