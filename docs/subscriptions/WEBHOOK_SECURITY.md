# Webhook security
Endpoint: `POST /api/webhooks/handypay` (Node runtime, dynamic).

| Control | Implementation |
|---|---|
| Authenticity | `X-HandyPay-Signature: sha256=<hex>` = HMAC-SHA256(raw body, endpoint secret). Verified on the **raw text** before JSON parsing; hex validated; `crypto.timingSafeEqual` |
| Missing secret | 503 — never processes unsigned events because of misconfiguration |
| Bad / missing signature | 401, nothing stored |
| Size | 512 KB cap → 413 |
| Shape | must have string `id`, `type`, numeric `created`, object `data` → else 400 |
| Idempotency | `billing_events.id` primary key; `insert … on conflict do nothing`; duplicate ⇒ 200 `duplicate` |
| Atomicity | event row, subscription update, payment, audit row in one transaction; error ⇒ rollback + 500 so the provider retries |
| Ordering | events older than `subscriptions.last_event_at` don't change state |
| Cross-subscription | events for a subscription other than the tracked one (except new checkouts) don't change state |
| User binding | `metadata.user_id` (set server-side at checkout from the session, never from the browser) → must exist; else tracked subscription id; else verified unique email |
| Least privilege | Only this path (and billing actions/account deletion) uses the owner connection to write billing tables |
| Logging | logs event type + id + error message only; no payload, card data or secrets |

## Replay
HandyPay's signature has no timestamp, so a captured request could be re-sent. Effects: an already-processed event id is a no-op; an older event is ignored as stale. Residual risk: an attacker who captured a valid, **never-delivered** event could deliver it — equivalent to HandyPay delivering it. Accepted.

## Secret rotation
HandyPay `POST /v1/webhook-endpoints/:id/rotate-secret` takes effect immediately. Rotate, update `HANDYPAY_WEBHOOK_SECRET` in Vercel, redeploy; events rejected in between are retried by HandyPay (endpoint deactivates after 10 consecutive failures — re-enable if needed).

## Tests
5 signature unit tests; e2e-billing: unsigned → 401, wrong key → 401, rejected events change nothing, duplicate → no-op, stale → ignored, old-subscription → ignored.
