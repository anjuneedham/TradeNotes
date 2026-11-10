-- Supabase exposes `public` through its REST API (PostgREST) to the public anon key. Auth tables hold password hashes and session
-- tokens, so lock them: RLS on with NO policies + no grants to API roles. (Guarded: these roles only exist on Supabase.)
alter table public.tn_user enable row level security;
alter table public.tn_session enable row level security;
alter table public.tn_account enable row level security;
alter table public.tn_verification enable row level security;
alter table public.tn_rate_limit enable row level security;
do $$ declare r text; begin
  foreach r in array array['anon','authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on public.tn_user, public.tn_session, public.tn_account, public.tn_verification, public.tn_rate_limit from %I', r);
    end if;
  end loop;
end $$;

-- Part 2: restricted role + per-request identity.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'app_user') then create role app_user nologin; end if;
end $$;
grant app_user to current_user;  -- lets the connection run: SET LOCAL ROLE app_user
grant usage on schema public to app_user;

create schema if not exists tradenotes;
do $$ declare r text; begin
  foreach r in array array['anon','authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then execute format('revoke all on schema tradenotes from %I', r); end if;
  end loop;
end $$;
grant usage on schema tradenotes to app_user;
-- Signed-in user for this transaction, set by the app via set_config('app.user_id', $1, true). Unset => no rows visible.
create or replace function tradenotes.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.user_id', true), '')::uuid $$;
grant execute on function tradenotes.uid() to app_user;
