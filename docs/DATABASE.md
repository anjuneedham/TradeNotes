# Database (Neon / Postgres)
Migration: `db/migrations/0001_init.sql` — **applied and tested on local Postgres 16; not yet applied to a Neon project.**

**Layout**
- `public`: Better Auth tables (`user`, `session`, `account`, `verification`, `rateLimit`) — ids are uuid.
- `tradenotes`: all product data — `profiles`, `subscriptions`, `accounts`, `strategies`, `imports`, `trades`, `trade_exits`, `trade_screenshots`, `reviews`, `audit_log`.

**Tenant isolation (defence in depth)**
- App request handlers run every query via `withUser(userId, …)` (`src/lib/db.ts`): one transaction, `SET LOCAL ROLE app_user`, `set_config('app.user_id', …)`. `app_user` is subject to row-level security: `user_id = tradenotes.uid()`.
- `app_user` cannot read auth tables, cannot write `subscriptions`/`audit_log`, cannot change `is_admin`.
- Triggers stop a trade referencing another user's account/strategy/import, and exits attaching to another user's trade.
- The owner connection (`pool`) bypasses RLS — used only by the auth library, and (future) payment webhooks/admin. Never use it in page code.
- Lazy bootstrap: `tradenotes.ensure_user()` creates profile + free subscription + default account on first visit.

**Other**: `trades.unique(account_id, fingerprint)` = cross-import dedupe; deleting an `imports` row cascades its trades; deleting a `public."user"` row cascades all of that user's data (erasure).
**Backups**: Neon point-in-time restore (window depends on plan) + branching. **Migration to another host**: `pg_dump` the whole DB — auth and product data are in the same database.
