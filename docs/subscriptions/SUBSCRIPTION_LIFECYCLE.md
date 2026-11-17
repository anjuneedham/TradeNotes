# Subscription lifecycle
| # | Step | Trigger | State after | Access | Email | Tested |
|---|---|---|---|---|---|---|
| 1 | Free registration | sign up | row `free/active` created lazily | Free | Welcome | unit + e2e-billing |
| 2 | Free plan access | — | — | 50 trades | — | e2e-billing (limit at 50) |
| 3/4 | Standard / Premium selection | Subscribe button | unchanged | Free | — | e2e-billing |
| 5 | Checkout | HandyPay hosted page | unchanged (redirect never activates) | Free | — | e2e-billing |
| 6 | Successful payment | `checkout.session.completed` (+ `invoice.paid`) | plan, `active`, period end, subscription id | Paid | Plan active | unit + e2e |
| 7 | Entitlement activation | next request | — | limit lifted server-side | — | e2e-billing |
| 8 | Renewal | `invoice.paid` | period extended, payment recorded | Paid | (HandyPay receipt only) | unit + e2e |
| 9 | Failed payment | `invoice.payment_failed` | `past_due` | Paid until period end **+ 3 days** | Payment failed | unit + e2e |
| 9b | Retry succeeds | `invoice.paid` | `active` | Paid | — | unit + e2e |
| 10 | Cancellation | Cancel button → HandyPay cancel; `customer.subscription.updated` with `cancel_at_period_end` | `cancel_at_period_end=true` | Paid | Cancellation confirmed (sent by the app) | unit + e2e |
| 10b | Resume | Resume button → HandyPay resume | flag cleared | Paid | — | unit + e2e |
| 11 | Downgrade | cancel → period ends | Free | Free, data kept | Plan ended | e2e |
| 12 | Paid-through access | between cancel and period end | — | Paid | — | unit + e2e |
| 13 | Expired | `customer.subscription.deleted`, or period end passes with no renewal | `canceled` / period in past | Free | Plan ended | unit + e2e |
| 14 | Re-subscription | new checkout | new subscription id, `active` | Paid | Plan active | unit + e2e |
| — | Plan switch Standard↔Premium | email support | handled by moving the HandyPay subscription | — | — | **Manual** (no in-app switch) |
| — | Refund | `charge.refunded` | payment row `refunded` | unchanged (follows subscription events) | — | unit |

## Edge cases handled
Duplicate delivery (PK no-op) · out-of-order events (older than last applied ⇒ ignored) · late events for a replaced subscription ⇒ ignored · unknown plan/amount ⇒ ignored · unknown user ⇒ stored as `ignored:no-matching-user` · second checkout while paid ⇒ refused.

## Not yet verified with the real provider
All of the above ran against a fake HandyPay that follows the documented API. **"Ready" requires the same sequence once in HandyPay test mode** (PAYMENT_TEST_REPORT.md).
