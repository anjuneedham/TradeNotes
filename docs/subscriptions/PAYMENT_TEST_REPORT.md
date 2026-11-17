# Payment test report
## What was tested (2026-11-11, actual results)
| Suite | Environment | Result |
|---|---|---|
| `src/lib/billing/lifecycle.test.ts` | Vitest | **23/23** — all 14 lifecycle steps, duplicates, stale, foreign subscription, refunds, unknown input, 5 signature tests |
| `scripts/e2e-billing.js` | Real Next.js production build + PostgreSQL 16 + **fake** HandyPay API + **fake** Resend | **37/37** |

The fake implements HandyPay's documented endpoints (`/subscription-sessions`, `/subscriptions/:id/cancel|resume|portal-session`) and signs events exactly as documented.

## What was NOT tested
- **No real HandyPay call has been made.** No API key is available in this environment.
- Real webhook payload field names (documented envelope only; object fields assumed Stripe-style).
- Real card, real renewal timing, real retry schedule, real refund.

## Verdict
**Recurring subscriptions are NOT yet verified ready for real money.** The integration is complete and tested against the documented contract.

## Test-mode script for the founder (≈30 minutes)
1. HandyPay Merchant Portal → API keys → copy **test** key. Webhooks → add endpoint `https://<your domain>/api/webhooks/handypay`, all events → copy its secret.
2. Vercel → Environment Variables (Production): `HANDYPAY_API_KEY=hp_test_…`, `HANDYPAY_WEBHOOK_SECRET=…` (Sensitive). Redeploy.
3. Sign up a test account → Plan & billing → Subscribe to Standard → pay with HandyPay's test card.
4. Expect within a minute: badge **Active**, payment history row, confirmation email.
5. In Supabase SQL editor: `select type, outcome, payload from tradenotes.billing_events order by received_at desc limit 5;` → **send me the payloads** (no secrets inside) or check that `outcome` starts with `applied`.
6. Cancel → badge "Ends …" → Resume → Update card (portal opens).
7. In HandyPay, refund the test payment → history shows "refunded".
8. If any outcome is `ignored:unknown-plan` or `ignored:no-matching-user`, the payload shape differs — the fix is a few lines in `lifecycle.ts`.
9. Switch to `hp_live_…` + live webhook secret only after steps 3–7 pass.
