# Database
Migration: `supabase/migrations/20261108000000_init.sql` (**written, not yet applied** — no TradeNotes Supabase project exists).

Tables: `profiles`, `subscriptions` (service-role writes only), `accounts`, `strategies`, `imports`, `trades`, `trade_exits`, `trade_screenshots`, `reviews`, `audit_log`.
- RLS on every table; user tables `user_id = auth.uid()` for all ops.
- `trades.unique(account_id, fingerprint)` → cross-import dedupe. Insert with `on conflict do nothing`, count skips.
- Rollback = delete `imports` row → cascades its trades.
- Triggers: new-user bootstrap (profile, free sub, default account); child-row owner check; `is_admin` immutable for client roles.
- P1 tables: `candles(provider, symbol, tf, ts, o,h,l,c,v)`, `backtest_sessions`, `backtest_trades`.
- Deletion: deleting `auth.users` cascades all user data (GDPR/DPA erasure). Export: JSON/CSV of all user tables.
