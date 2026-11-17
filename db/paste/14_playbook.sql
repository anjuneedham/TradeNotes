-- 14: Phase 2 playbook. Idempotent. Two NEW user tables (TradeNotes now has 22):
--   playbook_items: the entry checklist of a strategy (archived items are kept so past adherence stays meaningful).
--   trade_checks:   for one trade, whether each checklist item was followed. Adherence % of a trade = followed / checked items.
-- Both: row-level security (own rows only), no grants to anon/authenticated, owner checks so a row can never point at someone else's strategy,
-- trade or item, and size caps (80 items per strategy, 200 characters per item).

create table if not exists tradenotes.playbook_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.tn_user(id) on delete cascade,
  strategy_id uuid not null references tradenotes.strategies(id) on delete cascade,
  text text not null check (length(text) between 1 and 200),
  position integer not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists playbook_items_user_strategy_idx on tradenotes.playbook_items (user_id, strategy_id, position);
create index if not exists playbook_items_strategy_idx on tradenotes.playbook_items (strategy_id);

create table if not exists tradenotes.trade_checks (
  trade_id uuid not null references tradenotes.trades(id) on delete cascade,
  item_id uuid not null references tradenotes.playbook_items(id) on delete cascade,
  user_id uuid not null references public.tn_user(id) on delete cascade,
  followed boolean not null,
  created_at timestamptz not null default now(),
  primary key (trade_id, item_id)
);
create index if not exists trade_checks_user_idx on tradenotes.trade_checks (user_id);
create index if not exists trade_checks_item_idx on tradenotes.trade_checks (item_id);

alter table tradenotes.playbook_items enable row level security;
alter table tradenotes.trade_checks enable row level security;
do $$
declare t text;
begin
  foreach t in array array['playbook_items','trade_checks'] loop
    execute format('drop policy if exists own_rows on tradenotes.%I', t);
    execute format('create policy own_rows on tradenotes.%I for all using (user_id = (select tradenotes.uid())) with check (user_id = (select tradenotes.uid()))', t);
  end loop;
end $$;

create or replace function tradenotes.check_playbook_item() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from tradenotes.strategies where id = new.strategy_id and user_id = new.user_id) then
    raise exception 'strategy does not belong to user';
  end if;
  if tg_op = 'INSERT' and (select count(*) from tradenotes.playbook_items where strategy_id = new.strategy_id) >= 80 then
    raise exception 'playbook item limit reached';
  end if;
  return new;
end $$;
revoke all on function tradenotes.check_playbook_item() from public;
drop trigger if exists playbook_items_refs on tradenotes.playbook_items;
create trigger playbook_items_refs before insert or update on tradenotes.playbook_items for each row execute function tradenotes.check_playbook_item();

create or replace function tradenotes.check_trade_check() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from tradenotes.trades where id = new.trade_id and user_id = new.user_id) then
    raise exception 'trade does not belong to user';
  end if;
  if not exists (select 1 from tradenotes.playbook_items where id = new.item_id and user_id = new.user_id) then
    raise exception 'playbook item does not belong to user';
  end if;
  return new;
end $$;
revoke all on function tradenotes.check_trade_check() from public;
drop trigger if exists trade_checks_refs on tradenotes.trade_checks;
create trigger trade_checks_refs before insert or update on tradenotes.trade_checks for each row execute function tradenotes.check_trade_check();

-- app_user is what request handlers run as (06 grants on tables that existed when it ran; new tables need their own grant).
grant select, insert, update, delete on tradenotes.playbook_items, tradenotes.trade_checks to app_user;

-- Same guard as 06/11/13: the public API roles never get a grant on anything TradeNotes owns.
do $$ declare r text; begin
  foreach r in array array['anon','authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on all tables in schema tradenotes from %I', r);
      execute format('revoke all on all functions in schema tradenotes from %I', r);
    end if;
  end loop;
end $$;
