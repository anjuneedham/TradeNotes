#!/usr/bin/env bash
# HQ DB test: fresh DB, simulate Supabase roles, apply the CUSTOMER schema then the HQ schema (twice = idempotency), run checks.
# Needs a local Postgres (>=15) reachable by the `postgres` OS user.
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$(cd .. && pwd)"
PSQL="su postgres -c"
$PSQL "psql -q -c 'drop database if exists hq_test'"; $PSQL "psql -q -c 'create database hq_test'"
$PSQL "psql -q -v ON_ERROR_STOP=1 -d hq_test" <<'SQL'
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
end $$;
grant usage on schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
SQL
for f in "$ROOT"/db/paste/*.sql; do $PSQL "psql -q -v ON_ERROR_STOP=1 -d hq_test -f $f" >/dev/null; done
echo "customer schema applied"
for round in 1 2; do for f in db/paste/*.sql; do $PSQL "psql -q -v ON_ERROR_STOP=1 -d hq_test -f $PWD/$f" >/dev/null; done; echo "hq schema applied (run $round)"; done
# Run the checks as superuser (like Supabase's `postgres` owner role).
out=$($PSQL "psql -q -t -A -d hq_test -f $PWD/scripts/db-test.sql" 2>&1)
echo "$out" | grep -E "PASS|FAIL|ERROR" || true
if echo "$out" | grep -qE "FAIL|ERROR"; then echo "HQ DB TESTS FAILED"; echo "$out" | tail -20; exit 1; fi
n=$(echo "$out" | grep -c "^PASS" || true)
if [ "$n" -lt 20 ]; then echo "HQ DB TESTS FAILED: only $n checks reported (expected >= 20)"; echo "$out" | tail -20; exit 1; fi
echo "HQ DB tests OK ($n checks)"
