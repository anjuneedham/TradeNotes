-- SEC-1: two-user isolation test. Run against a DB with the migration applied.
-- (Local: after supabase-shim.sql. Supabase grants table privileges to authenticated by default; we mimic that.)
\set ON_ERROR_STOP off
grant select, insert, update, delete on all tables in schema public to authenticated;
reset role;
insert into auth.users (id, email) values ('aaaaaaaa-0000-0000-0000-000000000001','a@x.test'),('bbbbbbbb-0000-0000-0000-000000000002','b@x.test');

create temp table results(name text, ok boolean);
grant all on results to authenticated;

-- User A creates data
set role authenticated; select set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-000000000001',false);
insert into trades (user_id, account_id, symbol, side, quantity, entry_price, opened_at)
  select auth.uid(), id, 'EURUSD','long',1,1.1,now() from accounts limit 1;
insert into trade_exits (trade_id, user_id, quantity, price) select id, user_id, 1, 1.2 from trades;
insert into results select 'A sees own trade', count(*)=1 from trades;
insert into results select 'A sees own exit', count(*)=1 from trade_exits;

-- User B
select set_config('request.jwt.claim.sub','bbbbbbbb-0000-0000-0000-000000000002',false);
insert into results select 'B sees 0 of A trades', count(*)=0 from trades;
insert into results select 'B sees 0 of A exits', count(*)=0 from trade_exits;
insert into results select 'B sees only own account', count(*)=1 from accounts;
insert into results select 'B sees only own profile', count(*)=1 from profiles;
insert into results select 'B sees only own subscription', count(*)=1 from subscriptions;
with u as (update trades set symbol='HACK' returning 1) insert into results select 'B cannot update A trades', count(*)=0 from u;
with d as (delete from trades returning 1) insert into results select 'B cannot delete A trades', count(*)=0 from d;
-- B inserts a trade pointing at A's account (account_id belongs to A) -> must be blocked by composite ownership? record outcome
do $$ declare a uuid; begin
  select id into a from accounts where false;
end $$;
-- B cannot attach exit to A's trade
do $$ declare ok boolean := false; tid uuid; begin
  reset role;
  select id into tid from trades limit 1;
  set role authenticated;
  begin
    insert into trade_exits (trade_id, user_id, quantity, price) values (tid, 'bbbbbbbb-0000-0000-0000-000000000002', 1, 1);
  exception when others then ok := true; end;
  insert into results values ('B cannot attach exit to A trade', ok);
end $$;
-- B cannot grant self admin or paid plan
do $$ declare ok boolean := false; begin
  begin update profiles set is_admin = true; exception when others then ok := true; end;
  insert into results values ('B cannot set is_admin', ok);
end $$;
with s as (update subscriptions set plan='pro' returning 1) insert into results select 'B cannot self-upgrade plan', count(*)=0 from s;
do $$ declare ok boolean := false; begin
  begin insert into audit_log(action) values ('x'); exception when others then ok := true; end;
  insert into results values ('B cannot write audit_log', ok);
end $$;
do $$ declare ok boolean := false; aid uuid; begin
  reset role; select id into aid from accounts where user_id='aaaaaaaa-0000-0000-0000-000000000001'; set role authenticated;
  begin
    insert into trades (user_id, account_id, symbol, side, quantity, entry_price, opened_at)
      values ('bbbbbbbb-0000-0000-0000-000000000002', aid, 'X','long',1,1,now());
  exception when others then ok := true; end;
  insert into results values ('B cannot put a trade in A account', ok);
end $$;
do $$ declare ok boolean := false; sid uuid; begin
  reset role; insert into strategies(user_id,name) values ('aaaaaaaa-0000-0000-0000-000000000001','S') returning id into sid;
  set role authenticated;
  begin
    insert into trades (user_id, account_id, strategy_id, symbol, side, quantity, entry_price, opened_at)
      select user_id, id, sid, 'X','long',1,1,now() from accounts;
  exception when others then ok := true; end;
  insert into results values ('B cannot reference A strategy', ok);
end $$;
select name, case when ok then 'PASS' else 'FAIL' end from results;
