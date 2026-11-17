# Database audit (2026-11-11)
Engine: PostgreSQL (Supabase-hosted in production; PG 16 locally). Schema `tradenotes` + 5 auth tables `public.tn_*`. **17 tables, 164 columns** (manifest: `db/expected-columns.txt`).

## Tables
| Table | Purpose | RLS | app_user grants | Notes |
|---|---|---|---|---|
| public.tn_user / tn_session / tn_account / tn_verification / tn_rate_limit | Better Auth | On, no policies | **none** | Password hashes and tokens unreachable from request handlers and Supabase API roles |
| profiles | Onboarding answers, prefs, `is_admin` | own row | select/update | Trigger blocks `is_admin` change by clients |
| subscriptions | Plan, status, period, cancel flag, provider ids | own row (select) | **select only** | Written only by webhook/owner. New columns this round |
| payments (new) | Paid/failed/refunded records | own rows (select) | **select only** | Written only by webhook |
| billing_events (new) | Every webhook delivery, PK = provider event id | no policy | **none** | Idempotency + audit |
| accounts, strategies, imports, trades, trade_exits, trade_screenshots, reviews | User data | `user_id = uid()` | CRUD | Ownership triggers on trades/exits/screenshots/imports |
| audit_log | Plan changes, cancel/resume requests, deletions | no policy | **none** | Owner only |

## Integrity
- Every user table cascades from `tn_user` → account deletion leaves no orphans (tested).
- Checks: side, quantity > 0, entry > 0, fees ≥ 0, discipline 1–5, plan ∈ {free, starter, pro}, status ∈ known set (added `NOT VALID` so existing rows can't block a deploy), provider ∈ {manual, handypay}, payment status ∈ {paid, failed, refunded}.
- Uniqueness: one subscription row per user; `(provider, provider_subscription_id)` unique; payment id unique; event id unique; `(account_id, fingerprint)` for future CSV dedupe.

## Indexes
Trades: `(user_id, opened_at desc)`, account, strategy, import. Exits: trade, **user (new)**. Accounts: **user (new)**. Imports: **user, account (new)**. Screenshots: trade, **user (new)**. Audit: **user (new)**. Payments: `(user_id, occurred_at desc)`. Billing events: `(user_id, received_at desc)`.
Six foreign keys had no index before this round (`db/paste/08_fk_indexes.sql`).

## Migrations
`db/paste/01…08` are idempotent and run on every build; the build fails if any chunk fails or the table count ≠ 17. Verified: fresh DB apply + second apply (`scripts/test-paste.sh`), and re-apply on an existing DB (`migrate.mjs` twice). **All changes this round are additive** (new tables, nullable/defaulted columns, indexes, a `NOT VALID` check) — no destructive change.

## Legacy columns
`subscriptions.stripe_customer_id / stripe_subscription_id` are unused (Stripe was never adopted). Left in place (dropping is destructive and buys nothing).
