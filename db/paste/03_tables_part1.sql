create table if not exists tradenotes.profiles (
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

create table if not exists tradenotes.subscriptions (
  user_id uuid primary key references public.tn_user(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free','starter','pro')),
  status text not null default 'active',         -- mirrors payment-provider status
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  current_period_end timestamptz,
  is_founding_member boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists tradenotes.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.tn_user(id) on delete cascade,
  name text not null,
  broker text,
  currency char(3) not null default 'USD',
  starting_balance numeric(18,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists tradenotes.strategies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.tn_user(id) on delete cascade,
  name text not null,
  description text,
  rules text,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists tradenotes.imports (
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
