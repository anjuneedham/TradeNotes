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

drop policy if exists own_profile_select on tradenotes.profiles;
create policy own_profile_select on tradenotes.profiles for select using (id = (select tradenotes.uid()));
-- users may update their profile but not is_admin (enforced by trigger below)
drop policy if exists own_profile_update on tradenotes.profiles;
create policy own_profile_update on tradenotes.profiles for update using (id = (select tradenotes.uid())) with check (id = (select tradenotes.uid()));

drop policy if exists own_sub_select on tradenotes.subscriptions;
create policy own_sub_select on tradenotes.subscriptions for select using (user_id = (select tradenotes.uid()));
-- no insert/update/delete policy: only service role (webhook) writes subscriptions.

do $$
declare t text;
begin
  foreach t in array array['accounts','strategies','imports','trades','trade_exits','trade_screenshots','reviews'] loop
    execute format('drop policy if exists own_rows on tradenotes.%I', t);
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
drop trigger if exists profiles_protect_admin on tradenotes.profiles;
create trigger profiles_protect_admin before update on tradenotes.profiles for each row execute function tradenotes.protect_admin_flag();

-- Child rows must belong to the same user as their parent trade.
create or replace function tradenotes.check_trade_owner() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from tradenotes.trades where id = new.trade_id and user_id = new.user_id) then
    raise exception 'trade does not belong to user';
  end if;
  return new;
end $$;
drop trigger if exists exits_owner on tradenotes.trade_exits;
create trigger exits_owner before insert or update on tradenotes.trade_exits for each row execute function tradenotes.check_trade_owner();
drop trigger if exists shots_owner on tradenotes.trade_screenshots;
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
drop trigger if exists trades_refs on tradenotes.trades;
create trigger trades_refs before insert or update on tradenotes.trades for each row execute function tradenotes.check_trade_refs();

create or replace function tradenotes.check_import_refs() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from tradenotes.accounts where id = new.account_id and user_id = new.user_id) then
    raise exception 'account does not belong to user';
  end if;
  return new;
end $$;
drop trigger if exists imports_refs on tradenotes.imports;
create trigger imports_refs before insert or update on tradenotes.imports for each row execute function tradenotes.check_import_refs();
