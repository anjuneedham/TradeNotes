-- SEC-1: two-user isolation test. Run against a DB with the migration applied.
-- (Local: after supabase-shim.sql. Supabase grants table privileges to authenticated by default; we mimic that.)
\set ON_ERROR_STOP off
reset role;
insert into auth.users (id, email) values ('aaaaaaaa-0000-0000-0000-000000000001','a@x.test'),('bbbbbbbb-0000-0000-0000-000000000002','b@x.test');

create temp table results(name text, ok boolean);
grant all on results to authenticated;

-- User A creates data
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-000000000001',false); select tradenotes.ensure_user(); select tradenotes.ensure_user();
insert into tradenotes.trades (user_id, account_id, symbol, side, quantity, entry_price, opened_at)
  select auth.uid(), id, 'EURUSD','long',1,1.1,now() from tradenotes.accounts limit 1;
insert into tradenotes.trade_exits (trade_id, user_id, quantity, price) select id, user_id, 1, 1.2 from tradenotes.trades;
insert into results select 'A sees own trade', count(*)=1 from tradenotes.trades;
insert into results select 'A sees own exit', count(*)=1 from tradenotes.trade_exits;

-- User B
select set_config('request.jwt.claim.sub','bbbbbbbb-0000-0000-0000-000000000002',false); select tradenotes.ensure_user();
insert into results select 'B sees 0 of A trades', count(*)=0 from tradenotes.trades;
insert into results select 'B sees 0 of A exits', count(*)=0 from tradenotes.trade_exits;
insert into results select 'B sees only own account', count(*)=1 from tradenotes.accounts;
insert into results select 'B sees only own profile', count(*)=1 from tradenotes.profiles;
insert into results select 'B sees only own subscription', count(*)=1 from tradenotes.subscriptions;
with u as (update tradenotes.trades set symbol='HACK' returning 1) insert into results select 'B cannot update A trades', count(*)=0 from u;
with d as (delete from tradenotes.trades returning 1) insert into results select 'B cannot delete A trades', count(*)=0 from d;
-- B inserts a trade pointing at A's account (account_id belongs to A) -> must be blocked by composite ownership? record outcome
do $$ declare a uuid; begin
  select id into a from tradenotes.accounts where false;
end $$;
-- B cannot attach exit to A's trade
do $$ declare ok boolean := false; tid uuid; begin
  reset role;
  select id into tid from tradenotes.trades limit 1;
  set role authenticated;
  begin
    insert into tradenotes.trade_exits (trade_id, user_id, quantity, price) values (tid, 'bbbbbbbb-0000-0000-0000-000000000002', 1, 1);
  exception when others then ok := true; end;
  insert into results values ('B cannot attach exit to A trade', ok);
end $$;
-- B cannot grant self admin or paid plan
do $$ declare ok boolean := false; begin
  begin update tradenotes.profiles set is_admin = true; exception when others then ok := true; end;
  insert into results values ('B cannot set is_admin', ok);
end $$;
do $$ declare ok boolean := false; n int; begin
  begin update tradenotes.subscriptions set plan='pro'; get diagnostics n = row_count; ok := (n = 0);
  exception when others then ok := true; end;
  insert into results values ('B cannot self-upgrade plan', ok);
end $$;
do $$ declare ok boolean := false; begin
  begin insert into tradenotes.audit_log(action) values ('x'); exception when others then ok := true; end;
  insert into results values ('B cannot write audit_log', ok);
end $$;
do $$ declare ok boolean := false; aid uuid; begin
  reset role; select id into aid from tradenotes.accounts where user_id='aaaaaaaa-0000-0000-0000-000000000001'; set role authenticated;
  begin
    insert into tradenotes.trades (user_id, account_id, symbol, side, quantity, entry_price, opened_at)
      values ('bbbbbbbb-0000-0000-0000-000000000002', aid, 'X','long',1,1,now());
  exception when others then ok := true; end;
  insert into results values ('B cannot put a trade in A account', ok);
end $$;
do $$ declare ok boolean := false; sid uuid; begin
  reset role; insert into tradenotes.strategies(user_id,name) values ('aaaaaaaa-0000-0000-0000-000000000001','S') returning id into sid;
  set role authenticated;
  begin
    insert into tradenotes.trades (user_id, account_id, strategy_id, symbol, side, quantity, entry_price, opened_at)
      select user_id, id, sid, 'X','long',1,1,now() from tradenotes.accounts;
  exception when others then ok := true; end;
  insert into results values ('B cannot reference A strategy', ok);
end $$;
select name, case when ok then 'PASS' else 'FAIL' end from results;
-- ensure_user is idempotent; no trigger exists on auth.users
reset role;
select 'ensure_user idempotent (A has exactly 1 account)' as name, case when count(*)=1 then 'PASS' else 'FAIL' end from tradenotes.accounts where user_id='aaaaaaaa-0000-0000-0000-000000000001';
select 'no trigger on shared auth.users' as name, case when count(*)=0 then 'PASS' else 'FAIL' end from pg_trigger where tgrelid='auth.users'::regclass and not tgisinternal;
select 'nothing created in public schema' as name, case when count(*)=0 then 'PASS' else 'FAIL' end from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r';
