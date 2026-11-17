-- James's Daily Notes newsletter. Touched only by the owner connection (server code), never by app_user or the public API roles.
create table if not exists public.tn_subscriber (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  status text not null default 'pending' check (status in ('pending','confirmed','unsubscribed')),
  token uuid not null default gen_random_uuid(),
  source text,
  created_at timestamptz not null default now(),
  confirm_sent_at timestamptz,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  last_sent_on date
);
create unique index if not exists tn_subscriber_token_idx on public.tn_subscriber (token);
create index if not exists tn_subscriber_status_idx on public.tn_subscriber (status);
alter table public.tn_subscriber enable row level security;
do $$ declare r text; begin
  foreach r in array array['anon','authenticated','app_user'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on public.tn_subscriber from %I', r);
    end if;
  end loop;
end $$;
