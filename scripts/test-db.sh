#!/usr/bin/env bash
# Local DB test: fresh DB, apply migrations, run isolation tests. Non-zero exit on any FAIL/ERROR.
# Needs a local Postgres (>=15) reachable by the `postgres` OS user.
set -euo pipefail
cd "$(dirname "$0")/.."
PSQL="su postgres -c"
$PSQL "psql -q -c 'drop database if exists tn_test'"; $PSQL "psql -q -c 'create database tn_test'"
for f in db/migrations/*.sql; do $PSQL "psql -q -v ON_ERROR_STOP=1 -d tn_test -f $PWD/$f"; done
out=$($PSQL "psql -q -d tn_test -f $PWD/scripts/rls-test.sql" 2>&1)
echo "$out" | grep -E "PASS|FAIL|ERROR"
if echo "$out" | grep -qE "FAIL|ERROR"; then echo "RLS TESTS FAILED"; exit 1; fi
echo "RLS tests OK"
