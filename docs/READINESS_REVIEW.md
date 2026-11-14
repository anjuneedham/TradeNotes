# Final re-score: 2026-11-14, after Phase 4 (memos only; nothing was built in this phase)
Two columns, as asked. **In main** = the code at `origin/main` (eea2ef1), judged from the QA files of 2026-11-13/14 plus today's baseline run. **Live on tradenotes.dev** = what I could observe from outside today with unauthenticated requests: `/`, `/pricing`, `/demo` (190 sample trades, SAMPLE DATA banner), `/demo/analytics`, `/manifest.webmanifest` return 200, an unknown `/r/<token>` returns 404, and signed-in routes (`/app/calendar`, `/reviews`, `/playbook`, `/strategies/compare`, `/backtest`, `/accounts`, `/import`, `/settings`, `/app/quick`) answer 307 (they exist and redirect to login). The pricing page lists share links, strategy comparison and the backtest log, so the live site is at least at Phase 3. I **cannot** confirm the deployed commit, and I did not sign in to production. Nothing here was measured in production. All scores are my own judgement.

## Rating of the three lenses
| Lens | In main | Live | Was (Phase 3 doc) | Why |
|---|---|---|---|---|
| **Overall app** | **8.2** | **8.0** | 8.2 | No code changed this phase. Live is 0.2 lower because no signed-in behaviour, money path, Sentry server event or real storage use was verified in production |
| **Industry-specific** (retail trading journal) | **6.5** | **6.4** | 7.2 | **Lowered from 7.2 to the table's weighted value.** The earlier headline numbers (5.3, 6.7, 7.2) were my own judgement and ran 0.4 to 1.25 above the brief's own table every time (4.05 at the start, 6.3 after Phase 2, 6.5 after Phase 3). The table is the evidence-based number, so the headline now equals it. Target 8.0: **not reached** |
| **App-type-specific** (paid B2C subscription app) | **7.9** | **7.9** | 7.9 | Unchanged. Payment, legal review, monitoring and backups are still the owner's list below; none was touched |

## Scorecard (docs/NEXT_BUILD_BRIEF.md section 2), row by row
Starting total from the brief's own table: 0.25x4 + 0.25x5 + 0.20x4 + 0.10x0 + 0.10x3 + 0.10x7 = **4.05** (the brief says 4.6; its table sums to 4.05, and the earlier "was about 4.6" in this file was wrong).
| Area (weight) | Start | Was (P3) | Main | Live | Target | Evidence | Why it missed target |
|---|---|---|---|---|---|---|---|
| Data capture and import (25%) | 4 | 6 | **6** | **6** | 8 | 13 broker fixtures in `src/lib/import-fixtures/` (MT4, MT5 HTML, cTrader, TradingView, Tradovate, NinjaTrader, Thinkorswim, IBKR, Webull, Binance spot and futures, Bybit spot and derivatives) with unit tests; time zone setting; futures and options specs; roll-back (docs/QA_RESULTS_2026-11-13.md) | Every fixture is **synthetic**; none was checked against a real broker export (QA gap 1). Fees are one number (KNOWN_ISSUES 5). No import validation report beyond a totals check. Thinkorswim and Tradovate exports carry no commissions. Not scored higher until real exports are verified |
| Analytics depth and filtering (25%) | 5 | 7.5 | **7.5** | **7.5** | 8 | Filters, expectancy, profit factor with warnings, drawdown and recovery, R distribution, weekday x hour heatmap, hold time, streaks, mistake cost, strategy comparison; 10,000 trades at 0.2 to 0.4 s locally (QA phase 2, phase 3) | No MAE/MFE (needs entry/exit extremes we do not capture), no saved views, timing never measured on real Supabase |
| Review and journaling workflow (20%) | 4 | 6 | **6** | **6** | 8 | Calendar, day/week/month reviews with auto-filled stats, playbook and adherence analytics (QA phase 2) | No goals, no free-form daily journal, no checklist inside the new-trade form. **Reminder emails: code exists in main (commit acbf253, message "work in progress, e2e pending") but docs and QA say "not built", no QA result exists for it, and the live pricing page says "Reminder emails are not available yet"; scored as not delivered** |
| Visual evidence (10%) | 0 | 4 | **4** | **3** | 8 | Upload, gallery, paste, delete, quotas, SVG-as-PNG rejection, cross-user 404 (QA phase 1), real-HTTP emulation of the Storage API (phase 3) | No "annotated notes". Never run against a real Supabase bucket. Live is 3 because the pricing page shows the screenshots row, which the code only shows when `SUPABASE_URL` and the service key are set, so the env vars look configured, but whether the bucket exists and works is **unverified** |
| Multiple accounts and organisation (10%) | 3 | 7 | **7** | **7** | 8 | Switcher, per-account and combined views, limits enforced server-side (Free 1, Standard 2, Premium 10), tests in QA phase 1 | "All accounts" does not convert currencies; other-currency accounts are excluded and disclosed |
| Trust, speed, mobile UX (10%) | 7 | 8 | **8** | **8** | 9 | Public demo, quick-log at 390px, installability confirmed by Chromium, 21/21 viewport check, empty states (QA phase 3) | No accessibility audit, no real-phone test, no timing against real Supabase |
| **Weighted total** | **4.05** | 6.475 | **6.48 (6.5)** | **6.38 (6.4)** | 8.1 | | 1.5 + 1.875 + 1.2 + 0.4 + 0.7 + 0.8 for main; live subtracts 0.1 (visual evidence 3) |
**Every row missed its target.** Largest weighted gaps: capture (2 points x 25% = 0.5), review workflow (2 x 20% = 0.4), analytics (0.5 x 25% = 0.125 only), visual evidence (4 x 10% = 0.4). The brief's aim (every row at target) is not met and the industry-specific target of 8.0 is not reached. No row moved in Phase 4 because Phase 4 builds nothing.

## Evidence from today's baseline (local; no code change in this phase)
`npm ci` ok; `npm run lint` exit 0; `npx tsc --noEmit` exit 0; `npm test` without a database 330 passed, 4 skipped (the DB tests; QA reports 334 with a database); `bash scripts/test-paste.sh` 40 PASS and the re-run succeeds; `node scripts/migrate.mjs` against local Postgres 16: 25 tables, expected 25; `node scripts/verify-db.mjs`: **102 passed, 0 failed**. Browser e2e, `e2e-billing.js` and the production build were **not re-run in this phase** because no application code changed; CI runs lint, types, unit tests, build and the runtime smoke test, and the last full e2e results are in docs/QA_RESULTS_2026-11-13_phase3.md (257/257 and billing 42/43, the known founding-price failure). Inference, not observation: the live site serves Phase 3 pages, and the build runs migrations and `verify-db` before deploying, so migration 16 very likely ran on production.

## Decision memos written in this phase (read before deciding)
- docs/decisions/MEMO_BROKER_SYNC.md: **no-go now**. Cost from $100/month plus $1 to $2 per connected user; the brokers verified are mostly stock/crypto, and MT4/MT5, cTrader, Tradovate and NinjaTrader were not on the pages read. Conditions listed.
- docs/decisions/MEMO_AI_SUMMARIES.md: **conditional go as an opt-in Premium pilot.** Cost per summary $0.0009 (Haiku 5.5) to $0.05 (Sonnet 5.5, heavy case); the risks are advice-like text, a new US processor and prompt injection; Anthropic's retention terms are unverified.
- docs/decisions/MEMO_REPLAY_DATA.md: **do not buy data now**; planning range about $300 to $1,000 per month; send the vendor question; bring-your-own-CSV first if demand appears.

## Corrections to older docs (found while scoring)
- NEXT_BUILD_BRIEF said the table sums to 4.6; it sums to 4.05.
- BUILD_LOG: Phase 3 notes still say main was at fbb3be1; today main is eea2ef1 (Phase 3 merged).
- Reminder emails: the code exists but docs call it "not built" (see the review row above). Decide: finish and test it, or remove it.
- KNOWN_ISSUES 32: the pricing FAQ still says plans are switched on by hand.

---
# Readiness rating: 2026-11-13, after Phase 3 (PR #7; my own judgement, local verification only, nothing measured in production)
| Lens | Now | Was | Why |
|---|---|---|---|
| **Overall app** | **8.2** | 8.0 | Public demo, quick-log, share links, strategy comparison and a labelled backtest log; 334 unit/DB + 257 browser + 102 database checks, CI green. Money path and legal are still unproven in production |
| **Industry-specific** | **7.2** | 6.7 | Demo mode, comparison and mobile quick-log close three gaps from the brief. Still missing: broker auto-sync, real-export-verified imports, MAE/MFE, replay (not approved). Target 8.0 is **not** reached |
| **App-type-specific** | **7.9** | 7.9 | Unchanged: no payment, legal-review, monitoring or backup work in this phase |
Scorecard rows that moved: analytics depth 7 to **7.5** (strategy comparison; no MAE/MFE), trust/speed/mobile 7.5 to **8** (demo, quick-log, 390px tested; no accessibility audit, no real-device test). Weighted about **6.5** on the brief's scale (was 6.3). Evidence: docs/QA_RESULTS_2026-11-13_phase3.md.
Next, in order: verify imports with real broker exports; reminder emails and goals (review workflow); owner setup of real screenshot storage; accessibility pass and a real-phone install test; Phase 4 memos.

---
# Readiness rating: 2026-11-13, after Phase 1 + Phase 2 (PR #3; my own judgement, local verification only, nothing measured in production)
| Lens | Now | Was | Why |
|---|---|---|---|
| **Overall app** | **8.0** | 7.6 | Much deeper product, 260 unit + 174 browser + 72 database checks, CI green; money path and legal are still unproven in production |
| **Industry-specific** (retail trading journal) | **6.7** | 5.3 | Filters, real analytics, calendar, reviews, playbook, accounts, broker import. Still missing what buyers weigh most: broker auto-sync, demo mode, real-export-verified imports, MAE/MFE. Target of 8.0 is **not** reached |
| **App-type-specific** (paid B2C subscription app) | **7.9** | 7.9 | Unchanged: nothing here touched payments, legal review, monitoring or backups |

## Scorecard from docs/NEXT_BUILD_BRIEF.md section 2, re-scored with evidence
| Area (weight) | Was | Now | Target | Evidence and what is missing |
|---|---|---|---|---|
| Data capture and import (25%) | 4 | **6** | 8 | 12 broker presets with auto-detect, time zones, futures/options specs, roll-back (Phase 1). Fixtures are synthetic, none verified against a real export; fees are one number; no import validation report beyond the totals check |
| Analytics depth and filtering (25%) | 5 | **7** | 8 | Filters on 4 views; expectancy, profit factor with warnings, drawdown + recovery, R distribution, weekday x hour heatmap, time held, streaks, mistake cost; 10,000 trades in 0.2 to 0.4 s locally with no row cap. Missing: MAE/MFE, strategy comparison, saved views, timing on real Supabase |
| Review and journaling workflow (20%) | 4 | **6** | 8 | Calendar, day/week/month reviews with auto-filled stats, playbook + adherence analytics. Missing: reminder emails, goals, free-form daily journal, checklist inside the new-trade form |
| Visual evidence (10%) | 0 | **4** | 8 | Screenshots built and tested with a fake store; real Supabase Storage untested and off until the owner creates the bucket and env vars |
| Multiple accounts and organisation (10%) | 3 | **7** | 8 | Switcher, per-account and combined view, limits enforced; no currency conversion in the combined view |
| Trust, speed, mobile UX (10%) | 7 | **7.5** | 9 | Measured speed, 390px tested, colour-blind-safe tints. No demo mode, no quick-log, no accessibility audit |
Weighted: about **6.3** on this scale (was about 4.6). The brief's aim (every row at target) is not met; the biggest remaining gaps by weight are capture (real exports), review workflow (reminders, goals) and visual evidence (owner setup).

# What to do next (recommended order)
**You (owner), before or right after merging**
1. Merging to `main` may trigger a Vercel production build, and the build runs migrations 12 to 14 on the production Supabase database (additive, idempotent, tested twice locally and in CI, `verify-db` runs after them). Watch that first build; if `verify-db` fails the build fails safely before deploying.
2. Confirm the **playbook tier** (I put it on Standard and Premium) and whether calendar/reviews stay Standard+.
3. Create the private `trade-screenshots` bucket and the two Vercel env vars (docs/OWNER_SETUP_STORAGE.md); until then screenshots stay "in development" on pricing.
4. Still open from before: one real payment and refund, Sentry event check, branch protection on `main`, Production Branch = `main`, lawyer review and Jamaican data-controller registration.
5. Decide on reminder emails: they need a scheduler that is free (a Vercel cron on your plan is the likely candidate); tell me and I will build them with opt-in, caps and unsubscribe.

**Next build session (Phase 3, in this order)**
1. Verify imports with 2 or 3 **real** broker exports (you provide anonymised files); that is the biggest credibility gap for the capture score.
2. Public **demo mode** at `/demo` (static sample journal): the cheapest way to lift conversion.
3. Strategy comparison (Premium), shareable read-only report links, mobile quick-log.
4. Small debts: run `scripts/viewport-check.js` and an accessibility pass, include reviews and playbook in the data export, fix the billing e2e founding-price expectation, time the pages against real Supabase, decide MAE/MFE.
5. Phase 4 memos only (broker sync aggregator, AI weekly summaries): cost, privacy and go/no-go; nothing built without your written approval.

---
**SEO (2026-11-12):** 6.5/10, up from 4, see `docs/SEO.md`.

# Projection: if the owner-side items below are done (estimate, not measured)
Assumes: one real payment and refund works end to end, a Sentry event is seen, ImprovMX delivery confirmed, branch protection on `main`, Production Branch = `main`.
| Lens | Now | Projected |
|---|---|---|
| Overall app | 7.6 | **8.2** |
| Industry-specific | 5.3 | **5.4** (these are operations items, not features) |
| App-type-specific | 7.9 | **8.8** |
Remaining caps after that: legal pages not reviewed by a lawyer and no Data Protection registration (-0.3 overall), no backup-restore drill, no public demo or broker sync. Feature build plan to reach 8.0+ industry: `docs/NEXT_BUILD_BRIEF.md`.

# Readiness rating — 2026-11-12 (night; production = commit ac9760f)
**Verified live today:** Sentry client reports reach Sentry (HTTP 200); Resend delivers real confirmation email; HandyPay live key works and creates a $6.00/month founding checkout (nothing paid); webhook rejects unsigned/forged calls; account deletion works. **Not verified:** a real payment activating a plan via the webhook, server-side Sentry events, ImprovMX delivery log, branch protection, Production Branch = `main`.

## Previous snapshot (441047f)
**Since the last rating:** legal pages filled and live (operator accepts responsibility, no lawyer review stated), support@tradenotes.dev forwarding set up (ImprovMX, delivery not yet confirmed from a second account), Resend verified and sending. **Still open:** Sentry not linked to the project, HandyPay key/webhook not set (see HANDYPAY_SETUP.md), no live payment test, no branch protection, Production Branch not `main`.

## Previous snapshot (29e8aaa)
| Lens | Score /10 | Was | One-line reason |
|---|---|---|---|
| **Overall app** | **7.6** | 7.2 | Solid, tested, live; money path and legal still unproven |
| **Industry-specific** (retail trading journal / fintech-adjacent) | **5.3** | 5.2 | Trust basics are good; the features buyers compare on (broker sync, depth) are not there |
| **App-type-specific** (paid B2C subscription web app) | **7.9** | 7.2 | Auth, isolation, email, CI in place; billing unverified, legal blank, monitoring not yet receiving data |

## Overall app (6.8)
+ 20-table database with row-level security, 43 verification checks on every build, 101 tests, CI with runtime smoke test, security headers, email confirmation working, production on the custom domain with rollback available.
- Payments never exercised end to end with the real provider; founding/annual/affiliate paths untested against live HandyPay events.
- Legal pages show the unfilled-details warning. Sentry not receiving events yet. No backup-restore drill. Branch protection on `main` not enabled, so CI does not block merges.
- Production branch in Vercel is not `main` (manual promote needed).

## Industry-specific (5.0): what traders compare you on
Strong: no broker credentials stored; honest metrics (open/partial trades disclosed, small-sample warnings); R-multiples, partial exits, forex lots; CSV import; risk disclaimer page; 18+ only; self-service export/delete.
Missing versus Tradezella/TraderSync/Edgewonk-class tools: **broker auto-sync** (the #1 purchase driver), futures/options contract specifics, calendar and weekly review, screenshots, backtesting/replay, mobile app, community/social proof, real testimonials. Marketing is truthful about this ("in development"), which protects trust but caps conversion.
Regulatory: you are a journaling tool, not an adviser. Keep "no financial advice / no performance promises" everywhere, and keep partner rules banning income claims. Registration with the Jamaican Information Commissioner (data controller) and a lawyer review are still open.
Moves it to 6.5+: CSV templates for the 5 biggest brokers (MT4/MT5, TradingView, Tradovate, NinjaTrader, Thinkorswim), calendar view, a public demo with sample data, 3 real user testimonials.

## App-type-specific (6.5): paid B2C SaaS checklist
Done: signup/login, email confirmation and reset, plans and limits enforced server-side, cancel/resume, payment history, data export, account deletion, partner program, analytics code, CI, monitoring code.
Not done: one real live payment and refund (including webhook field names), legal fill-in, Sentry data flowing, uptime check, branch protection, support inbox/process, backup restore test, DPA registration, tax position with HandyPay (merchant of record).
Moves it to 8: the six items above, in that order.

## Path to a paid launch
1) Legal fill-in (form submitted) 2) HandyPay key rotated + webhook secret 3) Sentry variables present, redeploy 4) test payment of the cheapest plan, then refund 5) branch protection + uptime check 6) Production Branch = `main`.

---
# Readiness review — 2026-11-12 update (after merging billing, CSV import, redesign; founding offer; analytics)
**Overall ~7.0 / 10 (was 6.5). Free/early-access launch: ready once legal fields + a public domain are set. Charging money: not yet.**
Done since 11-10: HandyPay checkout + signed webhooks + lifecycle (unit-tested, fake provider e2e), CSV import (paid feature now real), trade edit, data export/delete, frontend redesign, founding offer built and concurrency-tested (see FOUNDING_OFFER.md), Vercel Web Analytics code added.
**Blocking before the first payment:** (1) legal fields (`businessName`, `supportEmail`) still TODO; (2) no production deployment exists: every Vercel deployment is a branch preview behind SSO protection, and `main` has not been deployed; (3) one real HandyPay test-mode payment incl. discounted founding checkout (webhook field names unverified against real events); (4) public domain + Resend verification (last, per founder); (5) Vercel Web Analytics must be switched on in the dashboard (code is in, data is 0 until then); (6) error monitoring; CI gate; month-12 repricing of founding members is manual.

**Added 2026-11-12 (later):** annual billing (2 months free: $120/$240, founding = 50% of the annual), partner programme (docs/AFFILIATE_PROGRAM.md; 30% x 12 months, 30-day hold, CLI payouts), CI workflow + monitoring instructions (docs/MONITORING_AND_CI.md). Database now 20 tables, 43 verification checks, 101 tests. **Security:** a live HandyPay key was pasted into chat on 2026-11-12; rotate it and store only in Vercel (Sensitive).

---
# Readiness review — 2026-11-10 (commit 9783a7d, live on Vercel)

## Verdict
| Question | Answer |
|---|---|
| Technically live and working? | **Yes** — live smoke test 13/13, DB verified on every build, security headers live |
| Ready for a **free / early-access** launch (signups, feedback, content-led)? | **Yes, conditionally** — needs the public domain attached and the legal placeholders filled |
| Ready to **charge money**? | **No, not yet** — see gates below |

## Scores (out of 10)
| Lens | Score | One-line reason |
|---|---|---|
| Senior developer | **7 / 10** | Strong correctness + isolation + deploy safety for an MVP; missing monitoring, CI gate, verified email, automated payments |
| Product designer | **5.5 / 10** | Clean, honest, mobile-safe, beginner-friendly; but thin — text-only landing, long trade form, paid plans barely differ |
| Overall | **6.5 / 10** | A trustworthy foundation, not yet a product people should pay for |

## Evidence — engineering strengths
- Metrics engine is pure and tested (46 unit tests); live trade EURUSD 1 lot 1.0850→1.0910, $7 fees = **$593.00 / 1.98R**, matching a hand calculation.
- Tenant isolation in depth: row-level security + restricted `app_user` role + ownership triggers + locked-down login tables. **38 checks run on every production build** (incl. rolled-back two-user test); mutation-tested (RLS off / public grant / missing column all fail the build).
- Idempotent schema applied on deploy; build fails closed; previous version keeps serving on failure.
- Browser e2e 30/30 (two users, mobile widths). No secrets in repo; Sensitive env vars.
- Honest data handling: open/partial/FX-less trades excluded and disclosed; small-sample warnings; no ∞ profit factor.
## Evidence — engineering gaps
1. No error monitoring/alerting or uptime check (only Vercel logs).
2. No CI gate: unit/e2e tests are run by hand, not blocking deploys; `main` unprotected.
3. Supabase TLS is encrypted but not certificate-verified (set `DATABASE_SSL_CA`).
4. Email verification + password reset OFF until domain + Resend; payment matching is by email.
5. Payments manual: no webhook, no plan-change audit trail, renewals extended by hand.
6. No CSP header; no backup-restore drill; dashboard loads up to 10k trades per request; times stored UTC.
7. No trade edit, no delete confirmation, CSV import code exists but has no UI.

## Evidence — design strengths / gaps
+ Consistent dark system, clear hierarchy, empty states with guidance, labelled example, "Learn more" on every metric, no horizontal scroll at 390px.
− Landing page is text only (no product screenshots/demo) → weak trust and conversion.
− Trade form is long (5 cards) — intimidating for beginners; no "quick log" mode.
− Today the paid plans mainly raise the trade cap (50 → 2,000 → unlimited); breakdowns are free. Thin reason to pay.
− No calendar/weekly review/CSV import/backtesting yet (now honestly labelled "in development").

## Fixed today (found during this review)
Pricing, landing, billing and Terms advertised CSV import, screenshots, calendar/reviews, backtesting, strategy comparison and multi-account as available. They are now listed as "in development — not available yet". Baseline security headers added.

## Gates before taking the FIRST payment
1. Public domain attached (`tradenotes.dev`) + Resend email → verification and password reset.
2. Legal placeholders filled (support email, business name); founder has accepted responsibility.
3. One real Handypay payment + manual activation tested end to end (nobody has paid yet).
4. Error monitoring (e.g. Sentry free tier).
5. Decide what paid users actually get — ship CSV import (code + tests already exist) first.
## Next 5 engineering tasks
CSV import UI → trade edit/delete-confirm → email (Resend) → Sentry + CI gate → calendar/weekly review.
## Branch note
`main` was created on 2026-11-10 from the tested branch. Vercel's production branch and GitHub's default branch must be switched to `main` in their dashboards (the connector cannot change them).

---
# OWNER CHECKLIST (2026-11-14). Only you can do these; I did none of them.
Tick each one; the right-hand column says what to send me if it fails.

## 1. Decisions I need from you (nothing below is built or bought)
| # | Decision | My recommendation |
|---|---|---|
| 1 | Broker sync (SnapTrade): approve a recurring cost of at least $100/month plus $1 to $2 per connected user? | **No** until the conditions in MEMO_BROKER_SYNC.md hold (about 15 paying users asking, your core brokers supported, DPA, lawyer) |
| 2 | AI weekly summaries: approve a new Anthropic account, a monthly cap (suggested $10) and a Premium-only pilot? | **Conditional yes**, only after you read Anthropic's retention and training terms and the lawyer sees the wording |
| 3 | Replay data: buy a licence? | **No.** Send the question in MEMO_REPLAY_DATA.md to the vendors first (free). If demand appears, bring-your-own-CSV |
| 4 | Share links on every plan (flag `shareLinks` in `src/lib/plans.ts`); playbook on Standard and up; two backtest tables | Confirm or tell me to change |
| 5 | Reminder emails: finish and test the existing code, or remove it? It needs `CRON_SECRET` and `RESEND_API_KEY`, which production does not seem to have | Your call; I need an owner-approved free scheduler (GitHub Actions cron is what the code assumes) |

## 2. Environment variables (Vercel, Sensitive, Production and Preview; never paste values into chat)
- [ ] `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (screenshots; the live pricing page suggests they are set, so check they are right) and the private bucket `trade-screenshots` exists (docs/OWNER_SETUP_STORAGE.md).
- [ ] `DATABASE_SSL_CA` (KNOWN_ISSUES 16: TLS is encrypted but the certificate is not verified).
- [ ] `CRON_SECRET` only if you choose to finish reminder emails.
- [ ] Confirm HandyPay, Resend, Sentry variables are set and the exposed HandyPay key from 2026-11-12 was rotated.

## 3. Deployments
- [ ] Vercel **Production Branch = `main`** (the connector cannot change it).
- [ ] GitHub branch protection on `main` requiring both CI jobs.
- [ ] Merge this PR (docs only) when CI is green. Merging should not change the app.
- [ ] After any later merge: watch the first production build (it runs migrations and `verify-db` first and fails safely).
- [ ] Resubmit the sitemap in Search Console (it lists `/demo` and `/demo/analytics`).

## 4. Legal text and registration
- [ ] Lawyer review of the full Privacy Policy and Terms, **including** the 2026-11-13 additions (reviews, playbook, reminder emails, share links, backtests); KNOWN_ISSUES 9 says to confirm the lawyer saw them. The site makes no review claim, by your choice.
- [ ] If you approve broker sync or AI summaries: a new processor (SnapTrade or Anthropic) must be listed in the Privacy Policy and `docs/LEGAL_FILL_IN.md` first, and the landing page line "It doesn't connect to your broker or place trades" (src/app/(marketing)/page.tsx:135) must change the day sync ships.
- [ ] Register as a data controller with the Jamaican Information Commissioner; put the number in `dpaRegistrationNumber` in `src/lib/legal.ts` (a fact, so you edit it).
- [ ] Confirm who is merchant of record and owes sales tax with HandyPay.

## 5. Supabase Free-tier risks (source: supabase.com/pricing and supabase.com/kb/faqs/platform/free-project-pausing, read 2026-11-14)
- **No automatic backups or point-in-time recovery on Free.** If the project is lost or corrupted, customer data is gone. Until you upgrade, schedule your own export (for example `pg_dump` run by you) and test one restore.
- **Free projects pause after about a week of low activity**; real app requests count as activity. A paused site means login and every page that reads the database fail. Check the project is active; a monitor that calls the site daily helps but is not a guarantee. Paused projects are restorable (Supabase says for 90 days) from the dashboard.
- Limits on Free: 500 MB database, 1 GB storage, 5 GB egress (source above). Screenshot quotas (Standard 500 MB, Premium 2 GB per user) exceed 1 GB storage after very few users; the code stops uploads at 80% of the platform allowance, but you must tell it the real allowance and watch usage.
- Paid plans are never paused for inactivity (same source); upgrading is the fix for both pausing and backups, and it is a new cost, so your decision.

## 6. Money path (the biggest unproven risk)
- [ ] One **real payment** of the cheapest plan, confirm the plan switches on through the webhook, **then refund it**. Check the real webhook payload against the assumed field names (KNOWN_ISSUES 26). Also test the founding price: the billing e2e failure ($6 shown vs $12 expected on a fresh DB) is the test's expectation, not a loosened test.
- [ ] Confirm a Sentry event arrives (server and browser), ImprovMX delivers support@tradenotes.dev from a second account, and a cancelled user's data stays readable.

## 7. Real-world checks I cannot do
- [ ] Import 2 or 3 real broker exports (anonymised) and compare with the broker's own report; this is the largest scoring gap.
- [ ] On a real phone: open `/app/quick` signed in, add to the home screen, log a trade.
- [ ] With a Premium test account on the live site: backtest + screenshot, delete the account, confirm the file is gone; create share links (amounts hidden and shown) and open each in a private window.
- [ ] Accessibility pass (screen reader, contrast) and timing against real Supabase.
