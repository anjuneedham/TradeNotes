# Deployment readiness (checked live via Vercel API, 2026-11-11)
## Current state
| Item | State |
|---|---|
| Production deployment | `main` @ 1458f71 (before Fable's and this round's work), READY |
| This branch | Preview deployments READY for every push. **Previews have no `DATABASE_URL`** (it is Production-only), so preview builds skip migration and can't run the app — expected |
| Production env vars present | `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`=https://tradenotes.dev, `NEXT_PUBLIC_SITE_URL`=https://tradenotes.dev |
| Production env vars missing | `HANDYPAY_API_KEY`, `HANDYPAY_WEBHOOK_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `DATABASE_SSL_CA` |
| Custom domain | `tradenotes.dev` not purchased/attached; `BETTER_AUTH_URL` already points to it → **auth on the live site needs the domain** |
| Deployment protection | `*.vercel.app` requires Vercel login |

## What happens when this branch is merged to `main`
1. Vercel builds Production: `migrate.mjs` applies `db/paste/01–08` → **adds** columns/tables/indexes (`07_billing.sql`, `08_fk_indexes.sql`). Nothing dropped. Existing rows unaffected (status check is `NOT VALID`).
2. `verify-db.mjs` re-checks 42 items incl. new billing isolation; **any failure fails the build and the previous version keeps serving.**
3. Without HandyPay env vars the billing page behaves exactly as today (static links, manual activation).
**I have not merged or deployed to production** — that needs your approval.

## Approval needed from the founder
- Merge `ccr-829eac0f-ubr2p9` → `main` (triggers production build + additive migration).

## Rollback
Vercel → Deployments → previous production → "Promote". Schema changes are additive and compatible with the old code.
