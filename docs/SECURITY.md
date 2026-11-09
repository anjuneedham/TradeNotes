# Security
- Tenant isolation via Postgres RLS: page/action code only queries through `withUser()` (role `app_user`). The owner `pool` is reserved for the auth library and future webhook/admin code.
- `DATABASE_URL`, `BETTER_AUTH_SECRET`, `RESEND_API_KEY`, market-data keys: server env only (Vercel Sensitive env vars). No `NEXT_PUBLIC_*` secrets exist.
- Payment webhook (when built): verify signature, idempotent on event id, entitlements derived from provider state, never from client redirects. Until then: manual activation by owner.
- Auth: password hashing and sessions by Better Auth; login/signup rate-limited via shared DB counters; generic login error (no user enumeration); email verification enforced once `RESEND_API_KEY` is set.
- Plan limits enforced in server actions (and P1: DB function), not just UI.
- Never store brokerage passwords. Future broker sync: OAuth / read-only API tokens only, encrypted.
- Screenshots: private bucket, path prefix = user id, storage RLS.
- CSV: parse server-side, cap 5 MB / 20k rows, no formula execution on export (prefix `=+-@` cells with `'`).
- Verified locally: 23 two-user isolation checks (`npm run test:db`) and a browser test with two users (`scripts/e2e.js`). Pre-launch: re-run both against the live deployment.
