-- 13: Phase 2 reviews (day / week / month). Idempotent. No new table: tradenotes.reviews already exists (04) with row-level security (05).
-- * period now allows 'month': the check constraint is dropped by name and re-added (a plain `add column` cannot widen a check).
-- * template columns: what worked (went_well), what to repeat (to_repeat), mistakes (to_improve), rule breaks (rule_breaks), next plan (focus_next).
-- * stats: a snapshot of the auto-filled figures at the time of saving (computed by the server, never taken from the form).
-- * integrity: text length caps, a week starts on a Monday and a month on the 1st (new rows only: NOT VALID), at most 2,000 reviews per user.

alter table tradenotes.reviews add column if not exists to_repeat text;
alter table tradenotes.reviews add column if not exists rule_breaks text;
alter table tradenotes.reviews add column if not exists stats jsonb;
alter table tradenotes.reviews add column if not exists updated_at timestamptz not null default now();

alter table tradenotes.reviews drop constraint if exists reviews_period_check;
alter table tradenotes.reviews drop constraint if exists reviews_period_chk;
alter table tradenotes.reviews add constraint reviews_period_chk check (period in ('day', 'week', 'month'));

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'reviews_text_len_chk') then
    alter table tradenotes.reviews add constraint reviews_text_len_chk check (
      coalesce(length(went_well), 0) <= 5000 and coalesce(length(to_improve), 0) <= 5000 and coalesce(length(focus_next), 0) <= 5000
      and coalesce(length(to_repeat), 0) <= 5000 and coalesce(length(rule_breaks), 0) <= 5000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'reviews_stats_len_chk') then
    alter table tradenotes.reviews add constraint reviews_stats_len_chk check (stats is null or length(stats::text) <= 4000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'reviews_start_chk') then
    alter table tradenotes.reviews add constraint reviews_start_chk check (
      period = 'day' or (period = 'week' and extract(isodow from period_start) = 1) or (period = 'month' and extract(day from period_start) = 1)) not valid;
  end if;
end $$;

-- Rows written before this constraint existed (there was no UI, so normally none) are moved to the start of their period where that does not collide
-- with another row, so they stay editable (the NOT VALID constraint above is still checked when a row is updated).
update tradenotes.reviews r set period_start = (r.period_start - (extract(isodow from r.period_start)::int - 1))
 where r.period = 'week' and extract(isodow from r.period_start) <> 1
   and not exists (select 1 from tradenotes.reviews o where o.user_id = r.user_id and o.period = 'week' and o.period_start = (r.period_start - (extract(isodow from r.period_start)::int - 1)));
update tradenotes.reviews r set period_start = date_trunc('month', r.period_start)::date
 where r.period = 'month' and extract(day from r.period_start) <> 1
   and not exists (select 1 from tradenotes.reviews o where o.user_id = r.user_id and o.period = 'month' and o.period_start = date_trunc('month', r.period_start)::date);

create index if not exists reviews_user_start_idx on tradenotes.reviews (user_id, period_start desc);

create or replace function tradenotes.check_review_cap() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- An upsert that edits an existing review fires this INSERT trigger first: never count that against the cap.
  if exists (select 1 from tradenotes.reviews where user_id = new.user_id and period = new.period and period_start = new.period_start) then
    return new;
  end if;
  if (select count(*) from tradenotes.reviews where user_id = new.user_id) >= 2000 then
    raise exception 'review limit reached';
  end if;
  return new;
end $$;
revoke all on function tradenotes.check_review_cap() from public;
drop trigger if exists reviews_cap on tradenotes.reviews;
create trigger reviews_cap before insert on tradenotes.reviews for each row execute function tradenotes.check_review_cap();

create or replace function tradenotes.touch_review() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;
revoke all on function tradenotes.touch_review() from public;
drop trigger if exists reviews_touch on tradenotes.reviews;
create trigger reviews_touch before update on tradenotes.reviews for each row execute function tradenotes.touch_review();

-- Same guard as 06/11: the public API roles never get a grant on anything TradeNotes owns.
do $$ declare r text; begin
  foreach r in array array['anon','authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on all tables in schema tradenotes from %I', r);
      execute format('revoke all on all functions in schema tradenotes from %I', r);
    end if;
  end loop;
end $$;
