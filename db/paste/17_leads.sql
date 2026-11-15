-- 17: Email list for free downloads (lead magnets). Idempotent. One NEW table (TradeNotes now has 26).
-- leads: an email someone typed to get a free download, with explicit consent to occasional emails. Not linked to an account.
-- Owner-only like the affiliate tables: RLS on, no policies, no grants to app_user/anon/authenticated. Written only by the server (owner pool).
create table if not exists tradenotes.leads (
  id uuid primary key default gen_random_uuid(),
  email text not null check (length(email) between 3 and 254 and email = lower(email) and position('@' in email) > 1),
  magnet text not null check (magnet ~ '^[a-z0-9-]{1,40}$'),
  source text check (source is null or source ~ '^[a-z0-9_-]{1,40}$'),
  consent_at timestamptz not null default now(),
  unsubscribe_token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (email)
);
alter table tradenotes.leads enable row level security;
revoke all on tradenotes.leads from app_user;
do $$ declare r text; begin
  foreach r in array array['anon','authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then execute format('revoke all on tradenotes.leads from %I', r); end if;
  end loop;
end $$;
