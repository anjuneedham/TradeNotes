# Payment provider evaluation
Sources: HandyPay docs `handypay.me/docs` and `/docs/api-reference` (read 2026-11-11), HandyPay Jamaica page, HandyPay WooCommerce plugin listing (third-party description, lower weight). Other providers from general knowledge — **re-verify current terms before switching**.

## HandyPay — capability check
| Need | Supported? | Evidence |
|---|---|---|
| Recurring monthly payments | **Yes** | `POST /v1/subscription-sessions`, `interval: month` |
| Renewals | Yes | `invoice.paid` event; plugin listing says renewals charge automatically |
| Supported countries | "10 countries" incl. Jamaica, Trinidad & Tobago | overview page; full list not in docs |
| Currencies | USD, JMD, TTD, XCD "and others" | API reference |
| Payment confirmation | Yes | `checkout.session.completed`, `invoice.paid` |
| Failed payments | Yes | `invoice.payment_failed`; plugin listing: retries, then cancels |
| Cancellation | Yes, at period end | `POST /v1/subscriptions/:id/cancel`; `/resume` |
| Refunds | Yes, full/partial | `POST /v1/refunds`; `charge.refunded` |
| Webhooks | Yes, 15 event types, per-endpoint secret, HMAC-SHA256 | API reference |
| Customer billing records / portal | Yes | `POST /v1/subscriptions/:id/portal-session` (response fields undocumented) |
| Status sync | Yes | `customer.subscription.created/updated/deleted` |
| Metadata echoed on webhooks | Yes on inline subscription form | API reference |
| Test mode | Yes, separate keys and data | docs |
| Fees | 4.9% + $0.40 (Free/Brand); 4.2% + $0.40 (Pro merchant plan) | docs; site pages disagree on plan prices |

**Gaps:** no timestamp in webhook signature (replay → we rely on event-id dedupe + ordering); payout/FX fees undocumented; exact object fields in webhook payloads not shown in the docs; coupons not documented.

## Alternatives
| | HandyPay | Stripe | Paddle / Lemon Squeezy (merchant of record) |
|---|---|---|---|
| Available to a Jamaica-based business | **Yes (built for it)** | Not directly (needs a company in a supported country, e.g. via Atlas/US LLC) | Generally yes for sellers in many countries — verify |
| International customers | Cards via hosted checkout | Excellent | Excellent; they handle global sales tax/VAT |
| Fees | 4.9% + $0.40 | ~2.9% + $0.30 (+intl/FX) | ~5% + $0.50 |
| Recurring billing, webhooks, portal | Yes | Best-in-class | Yes |
| Developer experience | Small, Stripe-like REST API | Excellent | Good |
| Operational complexity | Low (already set up) | High for a Jamaican founder (entity, US bank) | Low; tax handled for you |
| Sales tax / VAT liability | **On you** (confirm merchant-of-record status) | On you | **On them** |

## Recommendation
**Stay on HandyPay for launch.** It meets every lifecycle requirement on paper, is already configured, and is designed for Jamaica. The integration is built and tested against a faithful fake.

Conditions before taking real money (all in PAYMENT_TEST_REPORT.md):
1. One real **test-mode** purchase → confirm the webhook payload fields match what the reducer reads (stored raw in `billing_events.payload`).
2. Test cancel, resume, portal and a refund in test mode.
3. Get the fee and payout/FX schedule in writing.
4. Ask HandyPay who is merchant of record for international sales tax.

**Revisit** (Paddle/Lemon Squeezy) if international VAT/sales-tax exposure becomes material or HandyPay's subscription handling proves unreliable. The code isolates the provider in `src/lib/billing/handypay.ts`; the lifecycle reducer and database are provider-neutral.
