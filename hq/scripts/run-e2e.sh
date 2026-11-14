#!/usr/bin/env bash
# Browser end-to-end test: fresh local DB (customer schema + HQ schema + seed), built app, fake Resend, Playwright.
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$(cd .. && pwd)"; PSQL="su postgres -c"; PORT=3201
$PSQL "psql -q -c 'drop database if exists hq_e2e'"; $PSQL "psql -q -c 'create database hq_e2e'"
$PSQL "psql -q -d hq_e2e -c \"do \\\$\\\$ begin if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if; if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if; end \\\$\\\$;\""
for f in "$ROOT"/db/paste/*.sql db/paste/*.sql; do $PSQL "psql -q -v ON_ERROR_STOP=1 -d hq_e2e -f $f" >/dev/null 2>&1; done
$PSQL "psql -q -v ON_ERROR_STOP=1 -d hq_e2e -f $PWD/scripts/seed-e2e.sql" >/dev/null
export DATABASE_URL="postgres://hqdev:hqdev@localhost:5432/hq_e2e"
export HQ_OWNER_EMAIL="owner@hq.test" HQ_SESSION_SECRET="e2e-session-secret-0123456789abcdef"
export HQ_TOTP_SECRET="JBSWY3DPEHPK3PXP"
export HQ_PASSWORD_HASH="$(node -e "const {randomBytes,scryptSync}=require('crypto');const s=randomBytes(16);console.log('scrypt\$16384\$8\$1\$'+s.toString('base64')+'\$'+scryptSync('correct-horse-battery',s,64,{N:16384,r:8,p:1}).toString('base64'))")"
export RESEND_API_KEY="fake-key" EMAIL_FROM="TradeNotes <hello@mail.test>" RESEND_API_URL="http://localhost:3299/emails" NEXT_PUBLIC_SITE_URL="http://localhost:3299"
export BASE_URL="http://localhost:$PORT"
fuser -k $PORT/tcp >/dev/null 2>&1 || true
npx next start -p $PORT > /tmp/hq-e2e-server.log 2>&1 &
SRV=$!; trap 'kill $SRV 2>/dev/null || true' EXIT
for i in $(seq 1 40); do curl -sf -o /dev/null "$BASE_URL/login" && break; sleep 0.5; done
node scripts/e2e.js
