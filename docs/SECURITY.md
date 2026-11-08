# Security
- Tenant isolation via Postgres RLS; server code uses the user's session client, never the service key, except the Stripe webhook and admin jobs.
- `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, market-data keys: server env only (Vercel encrypted env). Only `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are public.
- Stripe webhook: verify signature, idempotent on event id, entitlements derived from Stripe state, never from client redirects.
- Plan limits enforced in server actions (and P1: DB function), not just UI.
- Never store brokerage passwords. Future broker sync: OAuth / read-only API tokens only, encrypted.
- Screenshots: private bucket, path prefix = user id, storage RLS.
- CSV: parse server-side, cap 5 MB / 20k rows, no formula execution on export (prefix `=+-@` cells with `'`).
- Pre-launch: run Supabase security advisors; test RLS with two users (ticket SEC-1).
