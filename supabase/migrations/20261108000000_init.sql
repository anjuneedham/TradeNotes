-- TradeNotes initial schema. Every user-owned table has RLS: user_id = auth.uid().
-- Entitlements/subscriptions are written ONLY by the service role (Stripe webhook).

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  experience_level text check (experience_level in ('beginner','intermediate','experienced')),
  markets text[] default '{}',
  onboarding_completed_at timestamptz,
  show_explanations boolean not null default true,
  is_admin boolean not null default false,       -- set manually by owner only
  created_at timestamptz not null default now()
);

create table public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free','starter','pro')),
  status text not null default 'active',         -- mirrors Stripe status
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  current_period_end timestamptz,
  is_founding_member boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  broker text,
  currency char(3) not null default 'USD',
  starting_balance numeric(18,2) not null default 0,
  created_at timestamptz not null default now()
);

create table public.strategies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  rules text,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  file_name text,
  rows_total int not null default 0,
  rows_imported int not null default 0,
  rows_skipped_duplicate int not null default 0,
  rows_failed int not null default 0,
  status text not null default 'completed' check (status in ('completed','rolled_back')),
  created_at timestamptz not null default now()
);

create table public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  strategy_id uuid references public.strategies(id) on delete set null,
  import_id uuid references public.imports(id) on delete cascade, -- rollback = delete import
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
create index trades_user_opened on public.trades (user_id, opened_at desc);

create table public.trade_exits (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references public.trades(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  quantity numeric(20,8) not null check (quantity > 0),
  price numeric(20,8) not null check (price > 0),
  exited_at timestamptz
);

create table public.trade_screenshots (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references public.trades(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,  -- private bucket "screenshots/{user_id}/..."
  caption text,
  created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period text not null check (period in ('day','week')),
  period_start date not null,
  went_well text, to_improve text, focus_next text,
  created_at timestamptz not null default now(),
  unique (user_id, period, period_start)
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);

-- RLS -----------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.accounts enable row level security;
alter table public.strategies enable row level security;
alter table public.imports enable row level security;
alter table public.trades enable row level security;
alter table public.trade_exits enable row level security;
alter table public.trade_screenshots enable row level security;
alter table public.reviews enable row level security;
alter table public.audit_log enable row level security;

create policy own_profile_select on public.profiles for select using (id = auth.uid());
-- users may update their profile but not is_admin (enforced by trigger below)
create policy own_profile_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy own_sub_select on public.subscriptions for select using (user_id = auth.uid());
-- no insert/update/delete policy: only service role (webhook) writes subscriptions.

do $$
declare t text;
begin
  foreach t in array array['accounts','strategies','imports','trades','trade_exits','trade_screenshots','reviews'] loop
    execute format('create policy own_rows on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;
-- audit_log: no client policies (service role only).

create or replace function public.protect_admin_flag() returns trigger language plpgsql as $$
begin
  if new.is_admin is distinct from old.is_admin and current_user in ('authenticated', 'anon') then
    raise exception 'is_admin cannot be changed by clients';
  end if;
  return new;
end $$;
create trigger profiles_protect_admin before update on public.profiles for each row execute function public.protect_admin_flag();

-- Child rows must belong to the same user as their parent trade.
create or replace function public.check_trade_owner() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.trades where id = new.trade_id and user_id = new.user_id) then
    raise exception 'trade does not belong to user';
  end if;
  return new;
end $$;
create trigger exits_owner before insert or update on public.trade_exits for each row execute function public.check_trade_owner();
create trigger shots_owner before insert or update on public.trade_screenshots for each row execute function public.check_trade_owner();


-- A trade may only reference the owner's own account / strategy / import (RLS alone checks only user_id).
create or replace function public.check_trade_refs() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.accounts where id = new.account_id and user_id = new.user_id) then
    raise exception 'account does not belong to user';
  end if;
  if new.strategy_id is not null and not exists (select 1 from public.strategies where id = new.strategy_id and user_id = new.user_id) then
    raise exception 'strategy does not belong to user';
  end if;
  if new.import_id is not null and not exists (select 1 from public.imports where id = new.import_id and user_id = new.user_id) then
    raise exception 'import does not belong to user';
  end if;
  return new;
end $$;
create trigger trades_refs before insert or update on public.trades for each row execute function public.check_trade_refs();

create or replace function public.check_import_refs() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.accounts where id = new.account_id and user_id = new.user_id) then
    raise exception 'account does not belong to user';
  end if;
  return new;
end $$;
create trigger imports_refs before insert or update on public.imports for each row execute function public.check_import_refs();

-- New user bootstrap: profile + free subscription + default account.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.subscriptions (user_id) values (new.id);
  insert into public.accounts (user_id, name) values (new.id, 'My Account');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
