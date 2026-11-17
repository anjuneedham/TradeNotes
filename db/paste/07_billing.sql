-- 07: Subscription infrastructure (idempotent; safe to re-run). Additive only: no column or row is dropped.
-- Writes to every table here come ONLY from the owner connection (payment webhook / admin). app_user may read its own rows.

-- Subscription state the billing screen and entitlement checks need.
alter table tradenotes.subscriptions add column if not exists provider text not null default 'manual';
alter table tradenotes.subscriptions add column if not exists provider_customer_id text;
alter table tradenotes.subscriptions add column if not exists provider_subscription_id text;
alter table tradenotes.subscriptions add column if not exists cancel_at_period_end boolean not null default false;
alter table tradenotes.subscriptions add column if not exists canceled_at timestamptz;
alter table tradenotes.subscriptions add column if not exists current_period_start timestamptz;
alter table tradenotes.subscriptions add column if not exists last_event_at timestamptz;   -- newest provider event applied (ignore older, out-of-order events)
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'subscriptions_status_check') then
    alter table tradenotes.subscriptions add constraint subscriptions_status_check
      check (status in ('active','trialing','past_due','canceled','unpaid','incomplete','pending')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'subscriptions_provider_check') then
    alter table tradenotes.subscriptions add constraint subscriptions_provider_check check (provider in ('manual','handypay'));
  end if;
end $$;
create unique index if not exists subscriptions_provider_sub_idx on tradenotes.subscriptions (provider, provider_subscription_id) where provider_subscription_id is not null;

-- Every webhook delivery, keyed by the provider's event id: the primary key makes processing idempotent (duplicates are no-ops).
create table if not exists tradenotes.billing_events (
  id text primary key,                         -- provider event id (evt_...)
  provider text not null default 'handypay',
  type text not null,
  user_id uuid references public.tn_user(id) on delete set null,
  provider_subscription_id text,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  outcome text                                  -- applied | ignored:<reason> | error:<message>
);
create index if not exists billing_events_user_idx on tradenotes.billing_events (user_id, received_at desc);

-- Payment history (invoices paid / failed / refunded), shown on the billing screen.
create table if not exists tradenotes.payments (
  id text primary key,                         -- provider invoice / charge id
  user_id uuid not null references public.tn_user(id) on delete cascade,
  provider text not null default 'handypay',
  provider_subscription_id text,
  amount_cents integer not null,
  currency char(3) not null,
  status text not null check (status in ('paid','failed','refunded')),
  description text,
  receipt_url text,
  occurred_at timestamptz not null default now()
);
create index if not exists payments_user_idx on tradenotes.payments (user_id, occurred_at desc);

alter table tradenotes.billing_events enable row level security;
alter table tradenotes.payments enable row level security;
drop policy if exists own_payments_select on tradenotes.payments;
create policy own_payments_select on tradenotes.payments for select using (user_id = (select tradenotes.uid()));
-- billing_events: no client policy (owner connection only).

revoke all on tradenotes.billing_events, tradenotes.payments from app_user;
grant select on tradenotes.payments to app_user;
do $$ declare r text; begin
  foreach r in array array['anon','authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on tradenotes.billing_events, tradenotes.payments from %I', r);
    end if;
  end loop;
end $$;
