-- 15: Opt-in weekly review reminder (idempotent; two columns on profiles, no new table).
-- review_reminders: the user turned the reminder on (default OFF: opt-in only). review_reminder_sent_at: when the last one was sent (at most one per 6 days).
-- The sender runs as the owner connection from a protected endpoint (GitHub Actions weekly); users only flip their own switch (existing own_profile_update policy).
alter table tradenotes.profiles add column if not exists review_reminders boolean not null default false;
alter table tradenotes.profiles add column if not exists review_reminder_sent_at timestamptz;
create index if not exists profiles_reminders_idx on tradenotes.profiles (review_reminder_sent_at nulls first) where review_reminders;
