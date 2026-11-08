# Database
**Isolation model:** everything lives in its own Postgres schema `tradenotes`. Nothing is created in `public`, no trigger touches the shared `auth.users`, and no extension is installed — so TradeNotes can share a Supabase project with another app (Agriloop) without interfering. New users are bootstrapped lazily by `tradenotes.ensure_user()` (called from `getContext`).
**Extraction later:** `pg_dump -n tradenotes` gives all TradeNotes data. Auth users live in the shared `auth` schema and must be moved separately (export the relevant `auth.users`/`auth.identities` rows by user id — password hashes carry over). Only users who ever opened TradeNotes have a `tradenotes.profiles` row; use that list to select them.
**Required project setting:** add `tradenotes` to Settings → API → Exposed schemas. Project-wide settings shared with the other app: Auth Site URL / Redirect URLs / email templates (add TradeNotes URLs, don't replace), email-confirmation toggle, SMTP, and the free-tier pause/backups.
Migrations: `20261108000000_init.sql`, `20261108010000_onboarding_fields.sql` (**written and tested locally, not yet applied to any Supabase project**).

Tables: `profiles`, `subscriptions` (service-role writes only), `accounts`, `strategies`, `imports`, `trades`, `trade_exits`, `trade_screenshots`, `reviews`, `audit_log`.
- RLS on every table; user tables `user_id = auth.uid()` for all ops.
- `trades.unique(account_id, fingerprint)` → cross-import dedupe. Insert with `on conflict do nothing`, count skips.
- Rollback = delete `imports` row → cascades its trades.
- Triggers: new-user bootstrap (profile, free sub, default account); child-row owner check; `is_admin` immutable for client roles.
- P1 tables: `candles(provider, symbol, tf, ts, o,h,l,c,v)`, `backtest_sessions`, `backtest_trades`.
- Deletion: deleting `auth.users` cascades all user data (GDPR/DPA erasure). Export: JSON/CSV of all user tables.
