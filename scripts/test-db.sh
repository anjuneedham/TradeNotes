#!/usr/bin/env bash
# Local DB test: fresh DB, shim, migrations, RLS tests. Exits non-zero on any FAIL.
set -euo pipefail
cd "$(dirname "$0")/.."
PSQL="su postgres -c"
$PSQL "psql -q -c 'drop database if exists tn_test'" ; $PSQL "psql -q -c 'create database tn_test'"
$PSQL "psql -q -v ON_ERROR_STOP=1 -d tn_test -f $PWD/scripts/supabase-shim.sql"
for f in supabase/migrations/*.sql; do $PSQL "psql -q -v ON_ERROR_STOP=1 -d tn_test -f $PWD/$f"; done
out=$($PSQL "psql -q -d tn_test -f $PWD/scripts/rls-test.sql")
echo "$out" | grep -E "PASS|FAIL"
if echo "$out" | grep -q FAIL; then echo "RLS TESTS FAILED"; exit 1; fi
echo "RLS tests OK"
