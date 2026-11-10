-- TradeNotes schema for plain Postgres (Supabase or Neon).
-- Part 1: Better Auth tables (public, prefixed tn_ so they cannot collide with another app sharing the database). Columns match better-auth 1.7; ids are uuid (advanced.database.generateId = "uuid").
create table public.tn_user (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  "emailVerified" boolean not null default false,
  image text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create table public.tn_session (
  id uuid primary key default gen_random_uuid(),
  "expiresAt" timestamptz not null,
  token text not null unique,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  "ipAddress" text,
  "userAgent" text,
  "userId" uuid not null references public.tn_user(id) on delete cascade
);
create index tn_session_user_idx on public.tn_session ("userId");
create table public.tn_account (
  id uuid primary key default gen_random_uuid(),
  "accountId" text not null,
  "providerId" text not null,
  "userId" uuid not null references public.tn_user(id) on delete cascade,
  "accessToken" text, "refreshToken" text, "idToken" text,
  "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz,
  scope text, password text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create index tn_account_user_idx on public.tn_account ("userId");
create table public.tn_verification (
  id uuid primary key default gen_random_uuid(),
  identifier text not null,
  value text not null,
  "expiresAt" timestamptz not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create index tn_verification_identifier_idx on public.tn_verification (identifier);

-- Shared rate-limit counters for auth endpoints (works across serverless instances).
create table public.tn_rate_limit (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  count integer not null,
  "lastRequest" bigint not null
);

-- Supabase exposes `public` through its REST API (PostgREST) to the public anon key. Auth tables hold password hashes and session
-- tokens, so lock them: RLS on with NO policies + no grants to API roles. (Guarded: these roles only exist on Supabase.)
alter table public.tn_user enable row level security;
alter table public.tn_session enable row level security;
alter table public.tn_account enable row level security;
alter table public.tn_verification enable row level security;
alter table public.tn_rate_limit enable row level security;
do $$ declare r text; begin
  foreach r in array array['anon','authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on public.tn_user, public.tn_session, public.tn_account, public.tn_verification, public.tn_rate_limit from %I', r);
    end if;
  end loop;
end $$;

-- Part 2: restricted role + per-request identity.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'app_user') then create role app_user nologin; end if;
end $$;
grant app_user to current_user;  -- lets the connection run: SET LOCAL ROLE app_user
grant usage on schema public to app_user;

create schema if not exists tradenotes;
do $$ declare r text; begin
  foreach r in array array['anon','authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then execute format('revoke all on schema tradenotes from %I', r); end if;
  end loop;
end $$;
grant usage on schema tradenotes to app_user;
-- Signed-in user for this transaction, set by the app via set_config('app.user_id', $1, true). Unset => no rows visible.
create or replace function tradenotes.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.user_id', true), '')::uuid $$;
grant execute on function tradenotes.uid() to app_user;

-- TradeNotes initial schema (own schema: coexists with other apps in the same project). Every user-owned table has RLS: user_id = tradenotes.uid().
-- Entitlements/subscriptions are written ONLY by the owner connection (payment webhook / admin), never by app_user.


create table tradenotes.profiles (
  id uuid primary key references public.tn_user(id) on delete cascade,
  display_name text,
  experience_level text check (experience_level in ('beginner','intermediate','experienced')),
  markets text[] default '{}',
  onboarding_completed_at timestamptz,
  show_explanations boolean not null default true,
  is_admin boolean not null default false,       -- set manually by owner only
  trading_style text check (trading_style in ('scalping','day','swing','position')),
  preferred_timeframe text,
  main_goal text check (main_goal in ('consistency','risk','strategy','psychology','track')),
  primary_market text,
  signup_source text check (signup_source is null or signup_source ~ '^[a-z0-9-]{1,24}$'),
  created_at timestamptz not null default now()
);

create table tradenotes.subscriptions (
  user_id uuid primary key references public.tn_user(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free','starter','pro')),
  status text not null default 'active',         -- mirrors payment-provider status
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  current_period_end timestamptz,
  is_founding_member boolean not null default false,
  updated_at timestamptz not null default now()
);

create table tradenotes.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.tn_user(id) on delete cascade,
  name text not null,
  broker text,
  currency char(3) not null default 'USD',
  starting_balance numeric(18,2) not null default 0,
  created_at timestamptz not null default now()
);

create table tradenotes.strategies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.tn_user(id) on delete cascade,
  name text not null,
  description text,
  rules text,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table tradenotes.imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.tn_user(id) on delete cascade,
  account_id uuid not null references tradenotes.accounts(id) on delete cascade,
  file_name text,
  rows_total int not null default 0,
  rows_imported int not null default 0,
  rows_skipped_duplicate int not null default 0,
  rows_failed int not null default 0,
  status text not null default 'completed' check (status in ('completed','rolled_back')),
  created_at timestamptz not null default now()
);

create table tradenotes.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.tn_user(id) on delete cascade,
  account_id uuid not null references tradenotes.accounts(id) on delete cascade,
  strategy_id uuid references tradenotes.strategies(id) on delete set null,
  import_id uuid references tradenotes.imports(id) on delete cascade, -- rollback = delete import
  symbol text not null,
  asset_class text check (asset_class in ('stock','option','future','forex','crypto','other')),
  side text not null check (side in ('long','short')),
  quantity numeric(20,8) not null check (quantity > 0),
  entry_price numeric(20,8) not null check (entry_price > 0),
  stop_price numeric(20,8),
  target_price numeric(20,8),
  multiplier numeric(20,8) not null default 1,
  fees numeric(18,2) not null default 0 check (fees >= 0),
  initial_risk numeric(18,2),
  currency char(3),
  fx_to_account numeric(20,10),
  opened_at timestamptz not null,
  closed_at timestamptz,
  timeframe text,
  session text,
  pre_trade_notes text,
  post_trade_notes text,
  lessons text,
  emotions text[] default '{}',
  mistakes text[] default '{}',
  followed_plan boolean,
  discipline_score smallint check (discipline_score between 1 and 5),
  fingerprint text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, fingerprint)  -- cross-import duplicate prevention
);
create index trades_user_opened on tradenotes.trades (user_id, opened_at desc);
create index trades_account_idx on tradenotes.trades (account_id);
create index trades_strategy_idx on tradenotes.trades (strategy_id);
create index trades_import_idx on tradenotes.trades (import_id);

create table tradenotes.trade_exits (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references tradenotes.trades(id) on delete cascade,
  user_id uuid not null references public.tn_user(id) on delete cascade,
  quantity numeric(20,8) not null check (quantity > 0),
  price numeric(20,8) not null check (price > 0),
  exited_at timestamptz
);
create index trade_exits_trade_idx on tradenotes.trade_exits (trade_id);

create table tradenotes.trade_screenshots (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references tradenotes.trades(id) on delete cascade,
  user_id uuid not null references public.tn_user(id) on delete cascade,
  storage_path text not null,  -- private bucket "screenshots/{user_id}/..."
  caption text,
  created_at timestamptz not null default now()
);
create index trade_screenshots_trade_idx on tradenotes.trade_screenshots (trade_id);

create table tradenotes.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.tn_user(id) on delete cascade,
  period text not null check (period in ('day','week')),
  period_start date not null,
  went_well text, to_improve text, focus_next text,
  created_at timestamptz not null default now(),
  unique (user_id, period, period_start)
);

create table tradenotes.audit_log (
  id bigint generated always as identity primary key,
  user_id uuid references public.tn_user(id) on delete set null,
  action text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);

-- RLS -----------------------------------------------------------------------
alter table tradenotes.profiles enable row level security;
alter table tradenotes.subscriptions enable row level security;
alter table tradenotes.accounts enable row level security;
alter table tradenotes.strategies enable row level security;
alter table tradenotes.imports enable row level security;
alter table tradenotes.trades enable row level security;
alter table tradenotes.trade_exits enable row level security;
alter table tradenotes.trade_screenshots enable row level security;
alter table tradenotes.reviews enable row level security;
alter table tradenotes.audit_log enable row level security;

create policy own_profile_select on tradenotes.profiles for select using (id = (select tradenotes.uid()));
-- users may update their profile but not is_admin (enforced by trigger below)
create policy own_profile_update on tradenotes.profiles for update using (id = (select tradenotes.uid())) with check (id = (select tradenotes.uid()));

create policy own_sub_select on tradenotes.subscriptions for select using (user_id = (select tradenotes.uid()));
-- no insert/update/delete policy: only service role (webhook) writes subscriptions.

do $$
declare t text;
begin
  foreach t in array array['accounts','strategies','imports','trades','trade_exits','trade_screenshots','reviews'] loop
    execute format('create policy own_rows on tradenotes.%I for all using (user_id = (select tradenotes.uid())) with check (user_id = (select tradenotes.uid()))', t);
  end loop;
end $$;
-- audit_log: no client policies (service role only).

create or replace function tradenotes.protect_admin_flag() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.is_admin is distinct from old.is_admin and current_user = 'app_user' then
    raise exception 'is_admin cannot be changed by clients';
  end if;
  return new;
end $$;
create trigger profiles_protect_admin before update on tradenotes.profiles for each row execute function tradenotes.protect_admin_flag();

-- Child rows must belong to the same user as their parent trade.
create or replace function tradenotes.check_trade_owner() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from tradenotes.trades where id = new.trade_id and user_id = new.user_id) then
    raise exception 'trade does not belong to user';
  end if;
  return new;
end $$;
create trigger exits_owner before insert or update on tradenotes.trade_exits for each row execute function tradenotes.check_trade_owner();
create trigger shots_owner before insert or update on tradenotes.trade_screenshots for each row execute function tradenotes.check_trade_owner();


-- A trade may only reference the owner's own account / strategy / import (RLS alone checks only user_id).
create or replace function tradenotes.check_trade_refs() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from tradenotes.accounts where id = new.account_id and user_id = new.user_id) then
    raise exception 'account does not belong to user';
  end if;
  if new.strategy_id is not null and not exists (select 1 from tradenotes.strategies where id = new.strategy_id and user_id = new.user_id) then
    raise exception 'strategy does not belong to user';
  end if;
  if new.import_id is not null and not exists (select 1 from tradenotes.imports where id = new.import_id and user_id = new.user_id) then
    raise exception 'import does not belong to user';
  end if;
  return new;
end $$;
create trigger trades_refs before insert or update on tradenotes.trades for each row execute function tradenotes.check_trade_refs();

create or replace function tradenotes.check_import_refs() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from tradenotes.accounts where id = new.account_id and user_id = new.user_id) then
    raise exception 'account does not belong to user';
  end if;
  return new;
end $$;
create trigger imports_refs before insert or update on tradenotes.imports for each row execute function tradenotes.check_import_refs();

-- Lazy bootstrap on first visit (no trigger on the auth tables).
create or replace function tradenotes.ensure_user() returns void language plpgsql security definer set search_path = '' as $$
begin
  if tradenotes.uid() is null then raise exception 'not authenticated'; end if;
  insert into tradenotes.profiles (id) values (tradenotes.uid()) on conflict do nothing;
  insert into tradenotes.subscriptions (user_id) values (tradenotes.uid()) on conflict do nothing;
  if not exists (select 1 from tradenotes.accounts where user_id = tradenotes.uid()) then
    insert into tradenotes.accounts (user_id, name) values (tradenotes.uid(), 'My Account');
  end if;
end $$;
revoke all on function tradenotes.ensure_user() from public;
grant execute on function tradenotes.ensure_user() to app_user;
revoke all on function tradenotes.protect_admin_flag(), tradenotes.check_trade_owner(), tradenotes.check_trade_refs(), tradenotes.check_import_refs() from public;

-- Privileges. app_user = what request handlers run as (RLS applies). The owner connection (webhooks/admin) bypasses RLS.
grant select, insert, update, delete on all tables in schema tradenotes to app_user;
revoke all on tradenotes.subscriptions, tradenotes.audit_log from app_user;
grant select on tradenotes.subscriptions to app_user;

-- Belt and braces on Supabase: new objects can inherit default grants to the API roles. Strip them (guarded; no-op elsewhere).
do $$ declare r text; begin
  foreach r in array array['anon','authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on all tables in schema tradenotes from %I', r);
      execute format('revoke all on all functions in schema tradenotes from %I', r);
      execute format('revoke all on all sequences in schema tradenotes from %I', r);
    end if;
  end loop;
end $$;
