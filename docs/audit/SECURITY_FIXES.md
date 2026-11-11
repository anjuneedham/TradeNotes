# Security fixes this round
| # | Fix | Files | Verified by |
|---|---|---|---|
| 1 | Next's bundled PostCSS 8.4.31 → 8.5.32 via npm `overrides` (4 advisories) | package.json, package-lock.json | `npm audit --omit=dev` → 0 |
| 2 | Payment ↔ account link by signed `metadata.user_id` instead of payer email | lib/billing/* | e2e-billing |
| 3 | Email fallback restricted to **verified**, uniquely-matching addresses | lib/billing/webhook.ts | code review |
| 4 | Webhook: HMAC verification, constant-time compare, size cap, idempotency PK, transaction, stale/foreign-subscription guards | lib/billing/*, api/webhooks/handypay | 23 unit + 37 e2e |
| 5 | Billing tables write-protected from `app_user`; build verifies it | db/paste/07, verify-db.mjs | verify-db 42/42 |
| 6 | Provider redirect URLs must be https | lib/billing/handypay.ts | code review |
| 7 | CSV export neutralises spreadsheet formulas | app/export/route.ts | code review |
| 8 | Account deletion requires password + typed confirmation; cancels billing first | settings/actions.ts | e2e |
| 9 | FK indexes (faster RLS filters/cascades; avoids lock-heavy deletes) | db/paste/08 | migrate + test-paste |
| 10 | No double subscription: `startCheckout` refuses when already paid | billing/actions.ts | e2e-billing |

## Open (owner action needed)
Resend + domain (turns on email verification) · `DATABASE_SSL_CA` · `HANDYPAY_WEBHOOK_SECRET` · Sentry · CSP.
