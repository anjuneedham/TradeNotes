create schema if not exists tradenotes;
-- TradeNotes initial schema (own schema: coexists with other apps in the same project). Every user-owned table has RLS: user_id = auth.uid().
-- Entitlements/subscriptions are written ONLY by the service role (Stripe webhook).


create table tradenotes.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  experience_level text check (experience_level in ('beginner','intermediate','experienced')),
  markets text[] default '{}',
  onboarding_completed_at timestamptz,
  show_explanations boolean not null default true,
  is_admin boolean not null default false,       -- set manually by owner only
  created_at timestamptz not null default now()
);

create table tradenotes.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free','starter','pro')),
  status text not null default 'active',         -- mirrors Stripe status
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  current_period_end timestamptz,
  is_founding_member boolean not null default false,
  updated_at timestamptz not null default now()
);

create table tradenotes.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  broker text,
  currency char(3) not null default 'USD',
  starting_balance numeric(18,2) not null default 0,
  created_at timestamptz not null default now()
);

create table tradenotes.strategies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  rules text,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table tradenotes.imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
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
  user_id uuid not null references auth.users(id) on delete cascade,
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
  user_id uuid not null references auth.users(id) on delete cascade,
  quantity numeric(20,8) not null check (quantity > 0),
  price numeric(20,8) not null check (price > 0),
  exited_at timestamptz
);
create index trade_exits_trade_idx on tradenotes.trade_exits (trade_id);

create table tradenotes.trade_screenshots (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references tradenotes.trades(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,  -- private bucket "screenshots/{user_id}/..."
  caption text,
  created_at timestamptz not null default now()
);
create index trade_screenshots_trade_idx on tradenotes.trade_screenshots (trade_id);

create table tradenotes.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period text not null check (period in ('day','week')),
  period_start date not null,
  went_well text, to_improve text, focus_next text,
  created_at timestamptz not null default now(),
  unique (user_id, period, period_start)
);

create table tradenotes.audit_log (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
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

create policy own_profile_select on tradenotes.profiles for select using (id = (select auth.uid()));
-- users may update their profile but not is_admin (enforced by trigger below)
create policy own_profile_update on tradenotes.profiles for update using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy own_sub_select on tradenotes.subscriptions for select using (user_id = (select auth.uid()));
-- no insert/update/delete policy: only service role (webhook) writes subscriptions.

do $$
declare t text;
begin
  foreach t in array array['accounts','strategies','imports','trades','trade_exits','trade_screenshots','reviews'] loop
    execute format('create policy own_rows on tradenotes.%I for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;
-- audit_log: no client policies (service role only).

create or replace function tradenotes.protect_admin_flag() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.is_admin is distinct from old.is_admin and current_user in ('authenticated', 'anon') then
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

-- Lazy bootstrap (NO trigger on shared auth.users, so other apps' signups are unaffected).
create or replace function tradenotes.ensure_user() returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into tradenotes.profiles (id) values (auth.uid()) on conflict do nothing;
  insert into tradenotes.subscriptions (user_id) values (auth.uid()) on conflict do nothing;
  if not exists (select 1 from tradenotes.accounts where user_id = auth.uid()) then
    insert into tradenotes.accounts (user_id, name) values (auth.uid(), 'My Account');
  end if;
end $$;
revoke all on function tradenotes.ensure_user() from public, anon;
grant execute on function tradenotes.ensure_user() to authenticated;
revoke all on function tradenotes.protect_admin_flag(), tradenotes.check_trade_owner(), tradenotes.check_trade_refs(), tradenotes.check_import_refs() from public, anon, authenticated;

-- Privileges (custom schemas get no default grants). RLS still restricts rows.
grant usage on schema tradenotes to authenticated, service_role;
grant select, insert, update, delete on all tables in schema tradenotes to authenticated;
grant all on all tables in schema tradenotes to service_role;
revoke all on tradenotes.subscriptions, tradenotes.audit_log from authenticated;
grant select on tradenotes.subscriptions to authenticated;
grant usage, select on all sequences in schema tradenotes to service_role;
