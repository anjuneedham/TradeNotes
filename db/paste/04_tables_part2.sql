create table if not exists tradenotes.trades (
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
create index if not exists trades_user_opened on tradenotes.trades (user_id, opened_at desc);
create index if not exists trades_account_idx on tradenotes.trades (account_id);
create index if not exists trades_strategy_idx on tradenotes.trades (strategy_id);
create index if not exists trades_import_idx on tradenotes.trades (import_id);

create table if not exists tradenotes.trade_exits (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references tradenotes.trades(id) on delete cascade,
  user_id uuid not null references public.tn_user(id) on delete cascade,
  quantity numeric(20,8) not null check (quantity > 0),
  price numeric(20,8) not null check (price > 0),
  exited_at timestamptz
);
create index if not exists trade_exits_trade_idx on tradenotes.trade_exits (trade_id);

create table if not exists tradenotes.trade_screenshots (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references tradenotes.trades(id) on delete cascade,
  user_id uuid not null references public.tn_user(id) on delete cascade,
  storage_path text not null,  -- private bucket "screenshots/{user_id}/..."
  caption text,
  created_at timestamptz not null default now()
);
create index if not exists trade_screenshots_trade_idx on tradenotes.trade_screenshots (trade_id);

create table if not exists tradenotes.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.tn_user(id) on delete cascade,
  period text not null check (period in ('day','week')),
  period_start date not null,
  went_well text, to_improve text, focus_next text,
  created_at timestamptz not null default now(),
  unique (user_id, period, period_start)
);

create table if not exists tradenotes.audit_log (
  id bigint generated always as identity primary key,
  user_id uuid references public.tn_user(id) on delete set null,
  action text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);
