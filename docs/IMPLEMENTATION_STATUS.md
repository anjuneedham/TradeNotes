# Implementation Status
Labels: NOT STARTED · IN PROGRESS · IMPLEMENTED (code exists) · TESTED · PRODUCTION VERIFIED · BLOCKED

| Feature | Status | Tested how | Prod-ready? | Remaining / blockers |
|---|---|---|---|---|
| Metrics engine | TESTED | 16 unit tests | needs UI exposure review | per-group R, timezone |
| CSV parser + dedupe | TESTED (lib only) | 3 unit tests | no | **IMP-1 UI + insert not built** |
| DB schema + RLS | TESTED (local PG16) | 15 isolation checks | no — not applied to Supabase | **BLOCKED: Supabase project (founder)** |
| Auth (signup/login/logout/reset) | IMPLEMENTED | typecheck/build/redirect smoke only | no | needs Supabase to verify |
| Onboarding | IMPLEMENTED | build only | no | needs Supabase |
| Manual trade entry (partial exits, forex lots, FX, risk) | IMPLEMENTED | 19 validation tests | no | needs Supabase for e2e |
| Journal list (search, filter, paginate, delete) | IMPLEMENTED | build only | no | edit/detail page (JRNL-2) |
| Dashboard (KPIs, equity curve, breakdowns, empty state) | IMPLEMENTED | metrics unit-tested; UI build only | no | needs Supabase |
| Plan limits / entitlements | IMPLEMENTED (logic TESTED) | 5 tests | no | no source of paid plans yet |
| Landing/pricing/learn/legal | IMPLEMENTED | HTTP 200 locally | no — not deployed; legal unreviewed | |
| Payments (Handypay) | BLOCKED | — | — | **need Handypay API docs: recurring billing support, webhook signature scheme, test mode** |
| Deployment | BLOCKED | — | — | Vercel project exists, no env/Supabase |
| Backtesting / replay | NOT STARTED | — | — | data licence; founder trades forex → pick forex-capable provider |
| Admin, internal ops app | NOT STARTED | — | — | |

## Tickets (in order). Each: `npm test && npm run build && npm run lint` must pass.
**INFRA-1 (Opus/founder):** create Supabase project `tradenotes`, apply migration, run security advisors; create Vercel project linked to repo; set env vars.

**AUTH-1** `src/lib/supabase/{server,client}.ts`, `src/middleware.ts`, `src/app/(auth)/{login,signup}/page.tsx`. @supabase/ssr cookie sessions; `/app/*` redirects to `/login` when no session. AC: signup creates profile+free sub+account (trigger); logout works; `?plan=` preserved through signup to billing.

**ONB-1** `/app/onboarding`: experience level, markets, account name/currency/starting balance, explanation toggle → sets `onboarding_completed_at`. `/app` redirects here until complete. AC: beginner sees 3-step "log your first trade" checklist on dashboard.

**JRNL-1** `/app/journal/new` + server action `createTrade`: zod schema mirrors `trades` + `trade_exits[]`. Validation: exit qty sum ≤ qty; stop on wrong side warns (not blocks); initial_risk auto = |entry−stop|·qty·multiplier if blank. Enforce `PLANS[plan].tradeLimit` server-side (count trades). Tests: action validation unit tests.

**JRNL-2** `/app/journal` list (filters: date range, symbol, strategy, side, win/loss, mistake tag; paginate 50) + `/app/journal/[id]` detail/edit/delete + calendar month view (daily net P&L colour). Empty states with CTA.

**IMP-1** `/app/import`: upload → `guessMapping` → editable mapping UI → `previewImport` (show valid/errors/dup counts) → confirm inserts `imports` row then trades with `on conflict (account_id, fingerprint) do nothing`; record skipped counts. Import history page with "Roll back" (delete import). Gate on `PLANS.csvImport`. 5 MB cap.

**ANL-1** `/app` dashboard + `/app/analytics`: map DB rows → `TradeInput`, call `summarize`/`groupSummary` (strategy, session, weekday of closed_at in user tz, symbol, side). Each stat has a "?" linking `/learn#slug`. Show exclusion notice and small-sample badge. Equity curve as inline SVG (no chart lib needed).

**BILL-1** (after processor decision) Checkout session route, Portal route, webhook (verify signature, idempotent, upsert `subscriptions` via service role), `/app/billing`. Founding coupon. Tests: webhook handler unit tests with fixture events.

**SEC-1** Two-user RLS test script (`scripts/rls-test.ts`): user B cannot read/update/delete A's trades, exits, accounts, imports, subscriptions; cannot set is_admin.

**ADM-1** `/admin` (server-checked `is_admin`): user count, plan counts, recent signups. Read-only.

**BT-1** (after data licence) `MarketDataProvider` interface + provider impl + `candles` cache; `/app/backtest` replay: only bars ≤ cursor sent to client, play/pause/step/speed, market/limit orders with SL/TP, position sizing from risk %, session notes, report via `summarize`, CSV export.
