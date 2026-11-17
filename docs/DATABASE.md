# Database (Postgres on Supabase; works on Neon too)
Migrations: `0000_reset_old_tradenotes_schema.sql` (one-time, shared project only) and `0001_init.sql` — **tested on local Postgres 16 with simulated Supabase roles; NOT yet applied to the Supabase project.**

**Layout**
- `public`: Better Auth tables, prefixed so they cannot collide with Agriloop's: `tn_user`, `tn_session`, `tn_account`, `tn_verification`, `tn_rate_limit` (uuid ids). **RLS enabled with no policies and all grants to `anon`/`authenticated` revoked**, because Supabase would otherwise expose `public` (password hashes, session tokens) through its REST API.
- `tradenotes`: all product data — `profiles`, `subscriptions`, `accounts`, `strategies`, `imports`, `trades`, `trade_exits`, `trade_screenshots`, `reviews`, `audit_log`.

**Tenant isolation (defence in depth)**
- App request handlers run every query via `withUser(userId, …)` (`src/lib/db.ts`): one transaction, `SET LOCAL ROLE app_user`, `set_config('app.user_id', …)`. `app_user` is subject to row-level security: `user_id = tradenotes.uid()`.
- `app_user` cannot read auth tables, cannot write `subscriptions`/`audit_log`, cannot change `is_admin`.
- Triggers stop a trade referencing another user's account/strategy/import, and exits attaching to another user's trade.
- The owner connection (`pool`) bypasses RLS — used only by the auth library, and (future) payment webhooks/admin. Never use it in page code.
- Lazy bootstrap: `tradenotes.ensure_user()` creates profile + free subscription + default account on first visit.

**Other**: `trades.unique(account_id, fingerprint)` = cross-import dedupe; deleting an `imports` row cascades its trades; deleting a `public."user"` row cascades all of that user's data (erasure).
**Attribution:** `profiles.signup_source` stores the first `?src=` tag (validated `[a-z0-9-]{1,24}`) set at first sign-in.
**Backups:** per the Supabase plan of the host project. **Moving hosts:** dump `tradenotes` + `public.tn_*`.

## Phase 2 additions (2026-11-13)
- `db/paste/12_analytics_indexes.sql`: `trades_user_closed (user_id, closed_at)`. Date filters are written on plain columns because `coalesce(...)` can never use an index under row-level security.
- `db/paste/13_reviews.sql`: `reviews.period` now allows `month`; template columns, `stats` snapshot, length/shape checks, 2,000 reviews per user.
- `db/paste/14_playbook.sql`: new tables `playbook_items` and `trade_checks` (**22 tables** now): RLS `own_rows`, no `anon`/`authenticated` grants, owner-check triggers, caps (200 characters, 80 rules per strategy).
