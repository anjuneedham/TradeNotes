-- Two-user isolation test for the Neon/Postgres setup. Requires db/migrations applied.
-- Handlers run as app_user with app.user_id set per transaction; the owner connection (this script's default role) bypasses RLS.
\set ON_ERROR_STOP off
insert into public.tn_user(id, name, email) values
 ('aaaaaaaa-0000-0000-0000-000000000001','A','a@x.test'),
 ('bbbbbbbb-0000-0000-0000-000000000002','B','b@x.test');
create temp table results(name text, ok boolean);
grant all on results to app_user;

-- User A
set role app_user; select set_config('app.user_id','aaaaaaaa-0000-0000-0000-000000000001',false) \gset
select tradenotes.ensure_user(); select tradenotes.ensure_user();
insert into tradenotes.trades (user_id, account_id, symbol, side, quantity, entry_price, opened_at)
  select tradenotes.uid(), id, 'EURUSD','long',1,1.1,now() from tradenotes.accounts limit 1;
insert into tradenotes.trade_exits (trade_id, user_id, quantity, price) select id, user_id, 1, 1.2 from tradenotes.trades;
insert into tradenotes.strategies(user_id,name) values (tradenotes.uid(),'S');
insert into results select 'A sees own trade', count(*)=1 from tradenotes.trades;
insert into results select 'A sees own exit', count(*)=1 from tradenotes.trade_exits;
insert into results select 'ensure_user idempotent (A has 1 account)', count(*)=1 from tradenotes.accounts;

-- User B
select set_config('app.user_id','bbbbbbbb-0000-0000-0000-000000000002',false) \gset
select tradenotes.ensure_user();
insert into results select 'B sees 0 of A trades', count(*)=0 from tradenotes.trades;
insert into results select 'B sees 0 of A exits', count(*)=0 from tradenotes.trade_exits;
insert into results select 'B sees 0 of A strategies', count(*)=0 from tradenotes.strategies;
insert into results select 'B sees only own account', count(*)=1 from tradenotes.accounts;
insert into results select 'B sees only own profile', count(*)=1 from tradenotes.profiles;
insert into results select 'B sees only own subscription', count(*)=1 from tradenotes.subscriptions;
with u as (update tradenotes.trades set symbol='HACK' returning 1) insert into results select 'B cannot update A trades', count(*)=0 from u;
with d as (delete from tradenotes.trades returning 1) insert into results select 'B cannot delete A trades', count(*)=0 from d;
do $$ declare ok boolean := false; tid uuid; begin
  reset role; select id into tid from tradenotes.trades limit 1; set role app_user;
  begin insert into tradenotes.trade_exits (trade_id, user_id, quantity, price) values (tid, 'bbbbbbbb-0000-0000-0000-000000000002', 1, 1); exception when others then ok := true; end;
  insert into results values ('B cannot attach exit to A trade', ok);
end $$;
do $$ declare ok boolean := false; aid uuid; begin
  reset role; select id into aid from tradenotes.accounts where user_id='aaaaaaaa-0000-0000-0000-000000000001'; set role app_user;
  begin insert into tradenotes.trades (user_id, account_id, symbol, side, quantity, entry_price, opened_at) values ('bbbbbbbb-0000-0000-0000-000000000002', aid, 'X','long',1,1,now()); exception when others then ok := true; end;
  insert into results values ('B cannot put a trade in A account', ok);
end $$;
do $$ declare ok boolean := false; sid uuid; begin
  reset role; select id into sid from tradenotes.strategies limit 1; set role app_user;
  begin insert into tradenotes.trades (user_id, account_id, strategy_id, symbol, side, quantity, entry_price, opened_at) select user_id, id, sid, 'X','long',1,1,now() from tradenotes.accounts; exception when others then ok := true; end;
  insert into results values ('B cannot use A strategy', ok);
end $$;
do $$ declare ok boolean := false; begin
  begin update tradenotes.profiles set is_admin = true; exception when others then ok := true; end;
  insert into results values ('B cannot set is_admin', ok);
end $$;
do $$ declare ok boolean := false; n int; begin
  begin update tradenotes.subscriptions set plan='pro'; get diagnostics n = row_count; ok := (n = 0); exception when others then ok := true; end;
  insert into results values ('B cannot self-upgrade plan', ok);
end $$;
do $$ declare ok boolean := false; begin
  begin insert into tradenotes.subscriptions(user_id, plan) values ('bbbbbbbb-0000-0000-0000-000000000002','pro'); exception when others then ok := true; end;
  insert into results values ('B cannot insert a paid subscription', ok);
end $$;
do $$ declare ok boolean := false; begin
  begin insert into tradenotes.audit_log(action) values ('x'); exception when others then ok := true; end;
  insert into results values ('B cannot write audit_log', ok);
end $$;
do $$ declare ok boolean := false; begin
  begin perform 1 from public.tn_session; exception when others then ok := true; end;
  insert into results values ('app_user cannot read auth sessions', ok);
end $$;
do $$ declare ok boolean := false; begin
  begin perform 1 from public.tn_user; exception when others then ok := true; end;
  insert into results values ('app_user cannot read auth users', ok);
end $$;

-- No identity set => nothing visible, ensure_user refuses
select set_config('app.user_id','',false) \gset
insert into results select 'no identity sees 0 trades', count(*)=0 from tradenotes.trades;
insert into results select 'no identity sees 0 accounts', count(*)=0 from tradenotes.accounts;
do $$ declare ok boolean := false; begin
  begin perform tradenotes.ensure_user(); exception when others then ok := true; end;
  insert into results values ('ensure_user refuses without identity', ok);
end $$;


-- Supabase API roles (simulated by test-db.sh): the public anon key / signed-in API users must see NOTHING of ours.
reset role;
do $$ declare r text; t text; ok boolean; begin
  foreach r in array array['anon','authenticated'] loop
    foreach t in array array['public.tn_user','public.tn_session','public.tn_account','public.tn_verification','public.tn_rate_limit','tradenotes.trades','tradenotes.profiles','tradenotes.subscriptions'] loop
      ok := false;
      execute format('set local role %I', r);
      begin execute format('select 1 from %s limit 1', t); exception when others then ok := true; end;
      reset role;
      insert into results values (format('%s cannot read %s', r, t), ok);
    end loop;
  end loop;
end $$;
do $$ declare ok boolean := false; begin
  set local role anon;
  begin perform tradenotes.ensure_user(); exception when others then ok := true; end;
  reset role;
  insert into results values ('anon cannot call ensure_user', ok);
end $$;

reset role;
select name, case when ok then 'PASS' else 'FAIL' end from results;
