-- Lazy bootstrap on first visit (no trigger on the auth tables).
create or replace function tradenotes.ensure_user() returns void language plpgsql security definer set search_path = '' as $$
begin
  if tradenotes.uid() is null then raise exception 'not authenticated'; end if;
  insert into tradenotes.profiles (id) values (tradenotes.uid()) on conflict do nothing;
  insert into tradenotes.subscriptions (user_id) values (tradenotes.uid()) on conflict do nothing;
  if not exists (select 1 from tradenotes.accounts where user_id = tradenotes.uid()) then
    insert into tradenotes.accounts (user_id, name) values (tradenotes.uid(), 'My Account');
  end if;
end $$;
revoke all on function tradenotes.ensure_user() from public;
grant execute on function tradenotes.ensure_user() to app_user;
revoke all on function tradenotes.protect_admin_flag(), tradenotes.check_trade_owner(), tradenotes.check_trade_refs(), tradenotes.check_import_refs() from public;

-- Privileges. app_user = what request handlers run as (RLS applies). The owner connection (webhooks/admin) bypasses RLS.
grant select, insert, update, delete on all tables in schema tradenotes to app_user;
revoke all on tradenotes.subscriptions, tradenotes.audit_log from app_user;
grant select on tradenotes.subscriptions to app_user;

-- Belt and braces on Supabase: new objects can inherit default grants to the API roles. Strip them (guarded; no-op elsewhere).
do $$ declare r text; begin
  foreach r in array array['anon','authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on all tables in schema tradenotes from %I', r);
      execute format('revoke all on all functions in schema tradenotes from %I', r);
      execute format('revoke all on all sequences in schema tradenotes from %I', r);
    end if;
  end loop;
end $$;
