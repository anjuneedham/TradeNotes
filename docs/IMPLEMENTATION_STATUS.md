# Implementation Status
Labels: NOT STARTED · IN PROGRESS · IMPLEMENTED (code exists) · TESTED · PRODUCTION VERIFIED · BLOCKED

| Feature | Status | Tested how | Prod-ready? | Remaining / blockers |
|---|---|---|---|---|
| Metrics engine | TESTED | 16 unit tests | needs UI exposure review | per-group R, timezone |
| CSV parser + dedupe | TESTED (lib only) | 3 unit tests | no | **IMP-1 UI + insert not built** |
| DB schema + RLS (Neon/Postgres) | TESTED (local PG16) | 23 isolation checks | no — not applied to Neon | **BLOCKED: Neon project (founder)** |
| Auth (signup/login/logout; Better Auth) | TESTED (local e2e) | browser e2e | no | password reset + email confirm need Resend; untested on live |
| Onboarding | TESTED (local e2e) | browser e2e | no | |
| Manual trade entry (partial exits, forex lots, FX, risk) | TESTED (local e2e) | 19 unit + browser e2e | no | edit page |
| Journal list (search, filter, paginate, delete) | TESTED (local e2e: list, delete) | browser e2e | no | edit/detail page (JRNL-2); filters/pagination only lightly tested |
| Dashboard (KPIs, equity curve, breakdowns, empty state) | TESTED (local e2e) | browser e2e, hand-calculated numbers | no | |
| Plan limits / entitlements | IMPLEMENTED (logic TESTED) | 5 tests | no | no source of paid plans yet |
| Landing/pricing/learn/legal | IMPLEMENTED | HTTP 200 locally | no — not deployed; legal unreviewed | |
| Payments (Handypay) | IMPLEMENTED (checkout links + /app/billing); activation MANUAL | build only | no | webhook docs needed for automation; no founding coupon; no annual link |
| Deployment | BLOCKED | — | — | Vercel project exists; needs Neon + env vars |
| Backtesting / replay | NOT STARTED | — | — | data licence; founder trades forex → pick forex-capable provider |
| Internal ops app (HQ: outreach CRM, customers + plan activation, content studio, social/ads, nurture email, reports, launch gates) | TESTED (local) | 39 unit + 21 DB + 98 browser checks | no — **not deployed** | needs Vercel project, env vars, domain, password (see HQ.md) |

## Tickets (in order). Each: `npm test && npm run build && npm run lint` must pass.
**INFRA-1 (founder + Opus):** create Neon project, run `db/migrations/0001_init.sql`, set Vercel env vars (see DEPLOYMENT.md). Vercel project already exists.

**AUTH-1 — DONE (Better Auth).** See TEST_RESULTS.md. Remaining: Resend email for confirmation/reset.

**ONB-1** `/app/onboarding`: experience level, markets, account name/currency/starting balance, explanation toggle → sets `onboarding_completed_at`. `/app` redirects here until complete. AC: beginner sees 3-step "log your first trade" checklist on dashboard.

**JRNL-1** `/app/journal/new` + server action `createTrade`: zod schema mirrors `trades` + `trade_exits[]`. Validation: exit qty sum ≤ qty; stop on wrong side warns (not blocks); initial_risk auto = |entry−stop|·qty·multiplier if blank. Enforce `PLANS[plan].tradeLimit` server-side (count trades). Tests: action validation unit tests.

**JRNL-2** `/app/journal` list (filters: date range, symbol, strategy, side, win/loss, mistake tag; paginate 50) + `/app/journal/[id]` detail/edit/delete + calendar month view (daily net P&L colour). Empty states with CTA.

**IMP-1** `/app/import`: upload → `guessMapping` → editable mapping UI → `previewImport` (show valid/errors/dup counts) → confirm inserts `imports` row then trades with `on conflict (account_id, fingerprint) do nothing`; record skipped counts. Import history page with "Roll back" (delete import). Gate on `PLANS.csvImport`. 5 MB cap.

**ANL-1** `/app` dashboard + `/app/analytics`: map DB rows → `TradeInput`, call `summarize`/`groupSummary` (strategy, session, weekday of closed_at in user tz, symbol, side). Each stat has a "?" linking `/learn#slug`. Show exclusion notice and small-sample badge. Equity curve as inline SVG (no chart lib needed).

**BILL-1** Handypay webhook endpoint (verify signature, idempotent on event id, owner-connection upsert into `tradenotes.subscriptions`, set `current_period_end` from event). Blocked on Handypay docs.

**SEC-1 — DONE locally** (`npm run test:db`, 23 checks); re-run against Neon after migration.

**ADM-1** `/admin` (server-checked `is_admin`): user count, plan counts, recent signups. Read-only.

**BT-1** (after data licence) `MarketDataProvider` interface + provider impl + `candles` cache; `/app/backtest` replay: only bars ≤ cursor sent to client, play/pause/step/speed, market/limit orders with SL/TP, position sizing from risk %, session notes, report via `summarize`, CSV export.
