#!/usr/bin/env bash
# Verifies the paste-in chunks (db/paste/*.sql): apply in order to a fresh DB with simulated Supabase roles,
# run the isolation tests, then apply ALL chunks a second time to prove they are safe to re-run.
set -euo pipefail
cd "$(dirname "$0")/.."
P="su postgres -c"
$P "psql -q -c 'drop database if exists tn_paste'"; $P "psql -q -c 'create database tn_paste'"
$P "psql -q -v ON_ERROR_STOP=1 -d tn_paste" <<'SQL'
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end $$;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
SQL
apply() { for f in db/paste/*.sql; do $P "psql -q -v ON_ERROR_STOP=1 -d tn_paste" < "$f" 2>&1 | grep -v NOTICE || true; done; }
echo "-- first run"; apply
out=$($P "psql -q -d tn_paste" < scripts/rls-test.sql 2>&1)
echo "$out" | grep -cE "PASS" | sed 's/^/PASS count: /'
if echo "$out" | grep -qE "FAIL|ERROR"; then echo "$out" | grep -E "FAIL|ERROR"; echo "PASTE TESTS FAILED"; exit 1; fi
echo "-- second run (idempotency)"; 
for f in db/paste/*.sql; do if ! $P "psql -q -v ON_ERROR_STOP=1 -d tn_paste" < "$f" >/dev/null 2>/tmp/claude-0/paste-err.txt; then echo "RE-RUN FAILED in $f"; cat /tmp/claude-0/paste-err.txt; exit 1; fi; done
echo "re-run OK"
