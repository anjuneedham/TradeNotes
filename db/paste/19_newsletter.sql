-- 19: James's Daily Notes newsletter subscribers. Idempotent. One NEW table (TradeNotes now has 28).
-- Separate from tradenotes.leads on purpose: leads agreed to occasional weekly tips; this list agreed to a DAILY note, with double opt-in (pending -> confirmed).
-- Owner-only like leads/affiliates: RLS on, no policies, no grants to app_user/anon/authenticated. Written only by server code (owner pool).
create table if not exists tradenotes.note_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (length(email) between 3 and 254 and email = lower(email) and position('@' in email) > 1),
  status text not null default 'pending' check (status in ('pending','confirmed','unsubscribed')),
  token uuid not null unique default gen_random_uuid(),
  source text check (source is null or source ~ '^[a-z0-9_-]{1,40}$'),
  created_at timestamptz not null default now(),
  confirm_sent_at timestamptz,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  last_sent_on date
);
create index if not exists note_subscribers_status_idx on tradenotes.note_subscribers (status);
alter table tradenotes.note_subscribers enable row level security;
revoke all on tradenotes.note_subscribers from app_user;
do $$ declare r text; begin
  foreach r in array array['anon','authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then execute format('revoke all on tradenotes.note_subscribers from %I', r); end if;
  end loop;
end $$;
