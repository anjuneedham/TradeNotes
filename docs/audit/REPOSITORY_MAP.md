# Repository map (2026-11-11)
~4,300 lines of TypeScript in `src/`. Next.js 15.5 App Router, React 19, Tailwind 4, Better Auth, `pg` against Postgres (Supabase-hosted), Vitest, Playwright.

```
db/
  paste/01–07_*.sql      Idempotent schema, applied on EVERY build (scripts/migrate.mjs). 07_billing.sql is new.
  migrations/            Historical one-shot SQL. Never run by the build (0000 is a destructive reset for an old project).
  expected-columns.txt   164-column manifest the build verifies against the live DB.
scripts/
  migrate.mjs            Build step 1: apply db/paste (fails build on error; expects 17 tables)
  verify-db.mjs          Build step 2: 42 structure/security/isolation checks inside a rolled-back transaction
  e2e.js                 Browser e2e (two users, desktop + mobile): 53 checks
  e2e-billing.js         Subscription lifecycle e2e with fake HandyPay + Resend: 37 checks
  e2e-email.js           Email flows with fake Resend: 15 checks
  test-db.sh, rls-test.sql  Fresh-DB RLS suite simulating Supabase API roles
  unit-economics.py      Reproducible cost/margin model
src/
  middleware.ts          Optimistic /app cookie gate + ?src= attribution cookie
  lib/
    db.ts                Pool (owner) + withUser(): SET LOCAL ROLE app_user + app.user_id per transaction (RLS)
    app-context.ts       getContext(): session → profile/accounts/subscription → effective plan
    auth.ts              Better Auth (tn_* tables, DB rate limit, email verify/reset when Resend on, self-delete)
    entitlements.ts      effectivePlan (incl. 3-day past-due grace), canAddTrade
    plans.ts             Plan table (ids free/starter/pro; names Free/Standard/Premium), static checkout links
    billing/lifecycle.ts PURE subscription state machine (23 unit tests)
    billing/handypay.ts  HandyPay REST client + HMAC verification
    billing/webhook.ts   Verify → dedupe (event id PK) → apply → record payment → email, one transaction
    email.ts / email-templates.ts  Resend HTTP + 8 reusable HTML/text templates
    metrics.ts, trade-schema.ts, trades-data.ts, csv-import.ts, legal.ts, format.ts, glossary.ts, plan-features.ts
  app/
    (marketing)/         /, /pricing, /learn, /legal/{terms,privacy,subscription,disclaimer}
    (auth)/              /login, /signup, /forgot-password, /reset-password (+ actions)
    app/                 /app (dashboard), analytics, journal, journal/new, journal/[id], journal/[id]/edit,
                         billing (+ actions), settings (+ actions), onboarding, export (CSV route)
    api/auth/[...all]    Better Auth handler
    api/webhooks/handypay  Payment webhook
  components/            Fable's design system: ui.tsx, AppNav, TradeForm, EquityCurve, stats, PlanComparison, …
docs/
  design/                Fable's 16 documents (design system, IA, subscription UX, handoff)
  handover/ audit/ subscriptions/ email/ legal/ launch/ qa/ score/ content/ marketing/   This round's deliverables
  TRADENOTES_EXECUTION_TRACKER.md, TRADENOTES_BUSINESS_MODEL.md
  (older) ARCHITECTURE, DATABASE, DEPLOYMENT, KNOWN_ISSUES, READINESS_REVIEW, UNIT_ECONOMICS, CONTENT_ENGINE, …
```

## Branches
| Branch | State |
|---|---|
| `ccr-829eac0f-ubr2p9` | **This work** (Fable fast-forwarded in + all changes below) |
| `ccr-1a791cba-pqxtyk` | Fable's branch — fully contained in this branch |
| `main` | Production branch (commit 1458f71). Does not yet contain Fable's or this round's work |
