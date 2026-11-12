# TradeNotes: build brief for the "8/10 trading journal" session
Written 2026-11-12 by the lead session. Read this whole file, then `docs/READINESS_REVIEW.md`, `docs/KNOWN_ISSUES.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/SECURITY.md`, `docs/FEATURE_ROADMAP.md`.

## 0. Paste this to start the session
> You are the lead engineer on TradeNotes (repo `anjuneedham/TradeNotes`, Next.js 15 + Postgres, live at tradenotes.dev). Read `docs/NEXT_BUILD_BRIEF.md` and do exactly what it says: build the missing paid-tier journal features in the phases listed, test and review each phase, and finish with an evidence-based re-rating. Work on a feature branch, open pull requests into `main`, never push broken code to `main`, and ask the owner before any production deployment, data deletion or paid-service change. Keep all marketing truthful: a feature is only advertised once it ships and passes review.

## 1. Where the product stands (do not rebuild what exists)
**Live and verified:** signup/login, email confirmation (Resend), manual trade entry (long/short, partial exits, forex lots, fees, R-multiples, notes, emotion and mistake tags, trade edit), dashboard (8 core metrics, equity curve), analytics breakdowns (strategy, instrument, session, direction, weekday, mistake, emotion), plain-English explanations, CSV import (column mapping, preview, duplicate skip, roll-back, plan gate), CSV export, account deletion, plans (Free 50 trades / Standard 2,000 / Premium unlimited; monthly or annual), HandyPay checkout + webhook lifecycle, founding offer (10 seats, 50%), partner programme, legal pages, Sentry, CI (lint, types, unit tests, build, runtime smoke test, DB security checks), 20-table schema with row-level security.
**Already in the schema but without finished UI:** `trade_screenshots`, `reviews`, multiple `accounts`. Check `db/paste/*.sql` before adding tables.
**Not built (advertised as "in development"):** trade screenshots, calendar view and weekly reviews, multiple accounts, strategy comparison, backtesting/replay.
**Current rating:** overall 7.6, app-type 7.9, **industry-specific 5.3**. Goal: industry-specific **at least 8.0**, overall at least 8.5.

## 2. What "8/10 as a trading journal" means (scorecard to be re-scored at the end)
Benchmarks: Tradezella, TraderSync, Edgewonk, Tradervue. A trader choosing between them looks at the rows below.
| Area | Weight | Today | Target | Needed to hit target |
|---|---|---|---|---|
| Data capture and import | 25% | 4 | 8 | Broker presets with auto-detect, timezone handling, futures/options/crypto instrument specs, import validation report |
| Analytics depth and filtering | 25% | 5 | 8 | Global filters, expectancy, drawdown, R distribution, time-of-day and hold-time analysis, streaks, MAE/MFE where data exists, mistake-cost report, performance on 10k+ trades |
| Review and journaling workflow | 20% | 4 | 8 | Calendar P&L view, daily journal, weekly/monthly review templates, pre-trade checklist and playbook adherence, goals, reminder emails |
| Visual evidence | 10% | 0 | 8 | Screenshot upload/gallery per trade, annotated notes, secure storage |
| Multiple accounts and organisation | 10% | 3 | 8 | Account switcher, per-account and combined analytics, plan limits enforced (Standard 2, Premium 10) |
| Trust, speed, mobile UX | 10% | 7 | 9 | Mobile quick-log, demo mode with sample data, accessibility, fast dashboards, empty states |
Weighted today about 4.6 on this scale vs the 5.3 headline; the aim is to move every row to its target. Re-score honestly at the end with evidence.

## 3. Build phases (ship each as its own PR; finish and review a phase before starting the next)
### Phase 1: capture and evidence (biggest buying drivers)
1. **Broker presets:** MT4/MT5 (CSV and HTML statement), TradingView, Tradovate, NinjaTrader, Thinkorswim, Interactive Brokers (Flex/activity CSV), cTrader, Webull, Binance/Bybit spot+futures. Auto-detect format from headers, show "we recognised X", fall back to manual mapping. Store sample fixtures (anonymised) in `src/lib/import-fixtures/` with unit tests per broker. Handle time zones (user setting, store UTC), multi-leg fills grouped into one trade, commissions/swap.
2. **Instrument specs:** futures tick size/value, options multiplier, forex pip and lot rules, crypto precision; P&L must stay correct. Extend `metrics` tests with hand-calculated cases.
3. **Screenshots:** upload (PNG/JPEG/WebP, size cap, content-type sniffing), gallery on trade detail, paste-from-clipboard, delete. Storage choice must be approved by the owner (Vercel Blob or Supabase Storage); access via signed URLs, per-user isolation proven by tests. Update Privacy Policy (new data and processor) and plan gates (Standard and up).
4. **Multiple accounts:** CRUD, switcher in the app shell, filter everywhere, "All accounts" combined view with currency handling, enforce plan limits server-side.
### Phase 2: analytics and review workflow
5. **Global filter bar** (date range, account, strategy, instrument, side, tags, session) shared by dashboard, analytics and journal; URL-based state.
6. **New analytics:** expectancy, profit factor with sample-size warnings (existing rule: no infinity), max drawdown and recovery, R-multiple distribution, time-of-day x weekday heatmap, hold-time buckets, win/loss streaks, MAE/MFE when entry/exit extremes are provided, mistake-cost report (P&L attributable to each mistake tag), "what to review" improvements.
7. **Calendar view:** month grid of daily P&L and trade count, click-through to the day, weekly summary column, colour-blind-safe scale.
8. **Daily journal and weekly/monthly reviews:** use the `reviews` table; templates (what worked, what to repeat, mistakes, rule breaks, next-week plan), auto-filled stats, history, optional reminder email via Resend (opt-in, unsubscribe link, rate-limited).
9. **Playbook:** strategies with rules and an entry checklist; per-trade checklist adherence; adherence score in analytics.
10. **Performance:** server-side aggregation and pagination so dashboards stay fast with 10,000+ trades (see KNOWN_ISSUES); add a seeded 10k-trade test and record timings.
### Phase 3: differentiation and growth
11. **Strategy comparison** (Premium): side-by-side metrics and equity curves.
12. **Manual backtest log** (Premium): record hypothetical trades with screenshots and the same metrics, flagged clearly as hypothetical. True bar-replay needs licensed market data: write a one-page cost/licensing recommendation for the owner instead of building it.
13. **Demo mode:** a public, read-only sample journal at `/demo` (static seeded data, no account), linked from the landing page and pricing.
14. **Shareable report links:** owner-controlled, revocable, read-only, no personal data; opt-in.
15. **Mobile quick-log:** a 6-field fast entry and PWA install hints.
### Phase 4 (decision memo only, do not build without owner approval)
Broker auto-sync via an aggregator (for example SnapTrade) and AI weekly summaries via the Claude API: write cost, privacy and legal impact, and a go/no-go recommendation.

## 4. Non-negotiable engineering rules
- **Branching:** feature branch per phase; PR into `main`; CI must be green. Never force-push `main`.
- **Schema:** idempotent files in `db/paste/NN_name.sql` only. Update `db/expected-columns.txt`, the table-count constants in `scripts/migrate.mjs` and `scripts/verify-db.mjs`, and add verification checks. Every new user table needs row-level security, no grants to `anon`/`authenticated`, and a two-user isolation test. Run `bash scripts/test-paste.sh` and the DB tests.
- **Edge runtime:** `src/middleware.ts` must never import anything that reaches `pg` (this caused a production 500 on 2026-11-12). Keep edge-safe config in separate files.
- **Money and plan gates:** enforce limits server-side (`src/lib/plans.ts`, `entitlements.ts`), never only in the UI. Adding a plan feature means updating `PLANS`, `plan-features.ts`, pricing, billing copy and tests together.
- **Truthfulness:** items in `FEATURES_DEV` move to `FEATURES_NOW` only when shipped, tested and reviewed. No testimonial, number or claim that is not real.
- **Privacy/legal:** any new data category or processor updates `src/app/(marketing)/legal/privacy` and `docs/LEGAL_FILL_IN.md`. Do not alter `src/lib/legal.ts` facts without the owner.
- **Secrets:** never print, log or commit keys. Production environment variables are managed by the owner in Vercel.
- **Tests:** vitest for logic (hand-calculated expected values), DB integration tests, Playwright e2e extended from `scripts/e2e.js` (two users, mobile widths 390px), runtime smoke test in CI extended to new public pages.
- **Production:** you cannot deploy to production without the owner's confirmation. Use preview deployments and the checks below.

## 5. Review and verification (required before you re-rate)
1. **Per-phase review:** run the `code-review` skill on each PR at high effort and fix every confirmed finding; run `security-review` on phases touching uploads, sharing or new tables.
2. **Feature matrix test:** for every feature, test as Free, Standard and Premium user (gate works, limit message correct), plus a user with zero data and a user with 10,000 trades. Record pass/fail in `docs/QA_RESULTS_<date>.md`.
3. **Cross-tenant tests:** user B cannot read, update, delete or even detect user A's trades, screenshots, reviews, accounts, shared links. Include direct object-ID guessing.
4. **Money-path regression:** billing, founding seat, partner commission and webhook unit tests still pass; plan downgrade (cancel, lapse) leaves data readable and blocks only new writes.
5. **Imports:** every broker preset has a fixture test; run each through import, check totals against the broker's own report, then roll back.
6. **Accessibility and mobile:** keyboard operation, focus states, contrast in both themes, no horizontal scroll at 390px; run `scripts/viewport-check.js`.
7. **Performance:** record dashboard/analytics response times on the 10k-trade dataset; set a target of under 1.5 s server time.
8. **Production smoke:** after the owner promotes, run the route smoke test and one signed-in walkthrough; confirm Sentry shows no new errors.

## 6. Deliverables at the end
- Merged PRs per phase with green CI; `docs/QA_RESULTS_<date>.md` with evidence.
- Updated `docs/READINESS_REVIEW.md`: re-scored scorecard (section 2) with evidence per row, honest remaining gaps, and the new overall / industry / app-type ratings. If any row did not reach target, say so and why.
- Updated pricing, plan comparison, billing copy and landing page to match what truly shipped.
- Phase-4 decision memo and the data-licensing recommendation.
- A short owner checklist: anything needing owner action (storage choice, env vars, legal review of new text, deployments).

## 7. Owner-side items that run in parallel (not for the build session)
One real payment and refund; confirm a Sentry event appears; confirm ImprovMX delivery; branch protection on `main` and Production Branch set to `main`; Jamaican data-controller registration; lawyer review when budget allows; month-12 repricing process for founding members.
