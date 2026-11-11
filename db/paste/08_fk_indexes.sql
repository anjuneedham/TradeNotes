-- 08: Indexes on foreign keys used by row-level-security filters and by ON DELETE CASCADE (account deletion). Idempotent.
create index if not exists accounts_user_idx on tradenotes.accounts (user_id);
create index if not exists trade_exits_user_idx on tradenotes.trade_exits (user_id);
create index if not exists imports_user_idx on tradenotes.imports (user_id);
create index if not exists imports_account_idx on tradenotes.imports (account_id);
create index if not exists trade_screenshots_user_idx on tradenotes.trade_screenshots (user_id);
create index if not exists audit_log_user_idx on tradenotes.audit_log (user_id);
