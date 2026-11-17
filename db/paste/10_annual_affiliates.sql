-- 10: Annual billing + affiliate program (idempotent; additive only). All affiliate tables are OWNER-CONNECTION ONLY
-- (no policies, no grants to app_user/anon/authenticated); the app reads them server-side after its own checks.
alter table tradenotes.subscriptions add column if not exists billing_interval text not null default 'month';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'subscriptions_interval_check') then
    alter table tradenotes.subscriptions add constraint subscriptions_interval_check check (billing_interval in ('month','year'));
  end if;
end $$;

create table if not exists tradenotes.affiliates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9]{3,24}$'),          -- the ?ref= value
  name text not null,
  email text not null,
  payout_details text,                                                   -- e.g. "PayPal: name@x.com"; never shown to customers
  commission_pct integer not null default 30 check (commission_pct between 0 and 60),
  status text not null default 'active' check (status in ('active','paused','terminated')),
  dashboard_token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),  -- private stats link
  notes text,
  created_at timestamptz not null default now()
);

-- Which affiliate brought a user (first valid referral wins; one per user).
create table if not exists tradenotes.referrals (
  user_id uuid primary key references public.tn_user(id) on delete cascade,
  affiliate_id uuid not null references tradenotes.affiliates(id),
  created_at timestamptz not null default now()
);
create index if not exists referrals_affiliate_idx on tradenotes.referrals (affiliate_id);

-- One row per customer payment that earns a commission. payment_id is unique, so a replayed webhook can never pay twice.
create table if not exists tradenotes.commissions (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references tradenotes.affiliates(id),
  user_id uuid references public.tn_user(id) on delete set null,         -- kept (nulled) if the customer deletes their account
  payment_id text not null unique,
  base_cents integer not null,
  commission_cents integer not null,
  status text not null default 'pending' check (status in ('pending','paid','void')),   -- pending = earned; payable once payable_after has passed
  payable_after timestamptz not null,
  paid_at timestamptz,
  payout_ref text,
  created_at timestamptz not null default now()
);
create index if not exists commissions_affiliate_idx on tradenotes.commissions (affiliate_id, status);
create index if not exists commissions_user_idx on tradenotes.commissions (user_id);

alter table tradenotes.affiliates enable row level security;
alter table tradenotes.referrals enable row level security;
alter table tradenotes.commissions enable row level security;
revoke all on tradenotes.affiliates, tradenotes.referrals, tradenotes.commissions from app_user;
do $$ declare r text; begin
  foreach r in array array['anon','authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on tradenotes.affiliates, tradenotes.referrals, tradenotes.commissions from %I', r);
    end if;
  end loop;
end $$;
