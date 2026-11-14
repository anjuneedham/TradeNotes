# Build log: "8/10 trading journal" session (spec: docs/NEXT_BUILD_BRIEF.md)

## Baseline (2026-11-12, main @ 2c0575e)
`npm ci` ok · `npm run lint` exit 0 · `npx tsc --noEmit` exit 0 · `npm test` 103 passed / 2 skipped (DB tests skip without a DB) ·
`bash scripts/test-paste.sh` 40 PASS + idempotent re-run · `migrate.mjs` 20 tables · `verify-db.mjs` 43 passed, 0 failed · founding/affiliate DB tests 2 passed.
Note: the session branch was created from an older commit (1458f71) that lacks the brief; work is based on `origin/main` instead.

## Plan (one branch + PR per phase)
| Phase | Branch | Scope | Status |
|---|---|---|---|
| 1 Capture and evidence | `phase1-capture` (PR #1) | broker presets + auto-detect + fixtures; timezone setting; fill grouping; instrument specs; multiple accounts (switcher, limits, combined view); screenshots (Supabase Storage adapter + in-memory fake, caps, quotas) | built, reviewed, CI green; awaiting owner merge |
| 2 Analytics and review | `claude/phase2-analytics-qa4aj3` (session-assigned name) | global filter bar; expectancy/drawdown/R distribution/heatmap/hold time/streaks/MAE-MFE/mistake cost; calendar; daily journal + weekly/monthly reviews; playbook adherence; 10k-trade performance | in progress (see Phase 2 below) |
| 3 Differentiation | `phase3-growth` | strategy comparison; manual backtest log; /demo; share links; mobile quick-log | built, see Phase 3 below |
| 4 Memos | `phase4-memos` | broker sync, AI summaries, replay data licensing (memos only) | todo |

## Progress notes

### 2026-11-13: Phase 1
- Built all four parts; code review (10 findings) and security review done; see docs/QA_RESULTS_2026-11-13.md for evidence and the honest gap list.
- CI had failed on every `main` run I could inspect (runs 6 to 36): `.github/workflows/ci.yml` had `${{ }}` inside an unquoted flow mapping (invalid YAML, so GitHub started no jobs). Fixed in PR #1; first green run 43339934841.
- Found while testing: `e2e-billing.js` has one failing check on unmodified `main` too (founding price $6 shown where the test expects $12 on a fresh DB). Not fixed here; belongs to the founding-offer owner.
- Merged `main` (SEO work) into the branch; one import conflict in the landing page.
- Next: owner merges PR #1 (after reviewing legal text), then Phase 2 on a new branch from `main`.

### 2026-11-13: Phase 2 plan (branch `claude/phase2-analytics-qa4aj3`, from main @ 8af47d1)
Baseline on this branch before any change (local Postgres 16, simulated Supabase roles): `npm ci` ok · lint exit 0 · `tsc --noEmit` exit 0 · `npm test` 171 passed / 2 skipped ·
`test-paste.sh` 40 PASS + re-run OK · `migrate.mjs` 20 tables · `verify-db.mjs` 53 passed, 0 failed.
The branch name is the one this session was assigned (the owner's prompt said `phase2-analytics`); it is the Phase 2 branch.

| # | Task | Notes / decisions | Status |
|---|---|---|---|
| 1 | Filter bar + `src/lib/filters.ts` | URL state, invalid values ignored, first valid value wins for repeated single params, `tag` may repeat (any-of). Server-rendered GET form (works without JS). Dashboard, analytics, journal, calendar. | DONE (commit pushed; 102/102 e2e) |
| 2 | SQL aggregation + indexes (`db/paste/12_*.sql`) | SQL does filtering, joins, exit aggregation and the per-trade result (same formula as `evaluateTrade`, equality asserted on a seeded 10,000-trade set). `metrics.ts` keeps every aggregate formula (new `summarizeResults`). No row cap. | DONE (see notes) |
| 3 | `src/lib/analytics-extra.ts` | R buckets, weekday x hour heatmap (entry time, user zone), hold-time buckets, mistake cost, drawdown with recovery, profit factor + sample warning. MAE/MFE: NOT built (owner has not asked). | DONE |
| 4 | `/app/calendar` | Month grid in user zone, weekly totals, click-through to filtered journal, colour-blind-safe (sign + intensity labels), 390px. Standard and up (tier matrix: "Calendar + weekly review"). | DONE |
| 5 | `/app/reviews` | `13_reviews.sql`: period `month`, template columns, stats snapshot. Standard and up, gated on the server; data stays readable after a downgrade. Reminder emails NOT built (no owner confirmation of a free scheduler). | DONE (reminder emails not built) |
| 6 | Playbook | `playbook_items`, `trade_checks` (new tables: RLS, trigger ownership checks, isolation checks; 20 -> 22 tables). Plan: Standard and up (ASSUMPTION, no tier given in the brief: flagged for the owner). | DONE (plan tier is an assumption) |
| 7 | Plan copy | FEATURES_DEV -> FEATURES_NOW, PLANS flags, pricing, billing, landing, tests, privacy page + LEGAL_FILL_IN. | DONE |
| 8 | After the phase | PR, CI, code-review (high), security-review (new tables), plan matrix, 10k timings, `docs/QA_RESULTS_<date>.md`. | DONE: PR #3, CI green, code review (10 fixed), security review (none), QA in docs/QA_RESULTS_2026-11-13_phase2.md |

#### Task 2 notes (SQL aggregation), 2026-11-13
- Baseline before the change (Task 1 code, 10,000 seeded trades, local Postgres, warm median): dashboard 284 ms (response body 1.35 MB: all 10,000 equity points were sent to the browser), analytics 1,274 ms (a new `Intl.DateTimeFormat` per trade in the weekday table), journal 73 ms.
- After: dashboard 214 ms (body 132 KB, curve thinned to <= 402 points for display only), analytics 272 ms, journal 72 ms. Data layer alone: 133 ms for 10,300 trades, `summarizeResults` 10 ms.
- Design: SQL does filter + join + exit sums + the per-trade result; `summarizeResults` (metrics.ts) does every aggregate. `aggregate.db.test.ts` asserts SQL == `evaluateTrade` per trade (statuses, net/gross/fees, R) and == `summarize` for every aggregate, over 10,300 trades, with filters, a EUR account, and RLS. I broke the SQL twice on purpose (fee conversion; status precedence) and the test failed both times.
- Finding: under row-level security `coalesce(closed_at, opened_at) >= x` can never use an index (COALESCE is treated as leaky, the range shows up as a heap filter). The date filter is written on plain columns instead. Planner evidence is in `db/paste/12_analytics_indexes.sql`: only `trades_user_closed` was kept; an expression index, a symbol index and a covering exits index were measured and rejected (no gain).
- No row cap any more. Honest limit: a single query for a 100,000-trade user takes about 1.2 s; very large journals should use the date filter.

#### Phase 2 wrap-up, 2026-11-13
- Final local run: lint/tsc exit 0, 260 unit + 3 DB tests, test-paste 40 + re-run, build with migrate (22 tables) + verify-db 72/0, e2e 174/174, e2e-billing 42/43 (same as main). The local Postgres died once mid-run (stale pid); restarted and rerun.
- 10,000 trades: dashboard 209 ms, analytics 387 ms, journal 60 ms, calendar 48 ms (local, warm median).
- Rating update and next steps: docs/READINESS_REVIEW.md (top). Not built: MAE/MFE, reminder emails.

### 2026-11-13: Phase 3 plan (branch `phase3-growth`, from main @ fbb3be1)
Note: the owner's prompt said main was at 8af47d1 and the next migration was 12. Main had moved on (Phase 2 merged, migrations up to 15), so the new migration is **16** and the table count goes **22 -> 25**.
Baseline before any change (local Postgres 16, simulated Supabase roles): `npm ci` ok · lint exit 0 · `tsc --noEmit` exit 0 · `npm test` 277 passed / 3 skipped · `test-paste.sh` 40 PASS + re-run · `migrate.mjs` 22 tables · `verify-db.mjs` 72 passed, 0 failed · 3 DB tests passed.

| # | Task | Decisions / assumptions (flagged for the owner) | Status |
|---|---|---|---|
| 1 | Strategy comparison `/app/strategies/compare` (Premium) | Real trades only. 2 to 4 strategies picked by name; same filters (strategy filter hidden, the selection decides). Metrics from `summarizeResults` so a number equals the analytics page. Curves by trade number, colour + line style per series. Gate in the page, so no trade data is loaded below Premium | DONE |
| 2 | Manual backtest log (Premium) | **Two** new tables, not one: `backtest_trades` (exits as a JSON list, max 10) and `backtest_screenshots` (a screenshot needs its own row; the real table points at real trades). Screenshots: same bucket, prefix `<user>/backtest/<id>/`, same per-user quota and upload window. No account, no FX (amounts as typed, shown with the account currency as a label only). Own CSV export labelled HYPOTHETICAL in the first line, every row and the file name. After a downgrade entries stay readable/exportable/deletable, writes are refused by the server. Not included in comparison or share links | DONE |
| 3 | Public `/demo`, `/demo/analytics`, `/demo/trades/<id>` | Data generated in code from a fixed seed (190 trades, Jan to Oct 2026, fixed "today"), no database. To show the **real components** the page bodies were extracted into `DashboardView`, `AnalyticsView`, `TradeView`, used by both /app and /demo (existing e2e 174/174 still pass). SAMPLE DATA banner in the demo layout. In sitemap + CI smoke; trade pages noindex | DONE |
| 4 | Share links `/r/<token>` | One new table `share_links`. Token 256 bits, only the SHA-256 hash stored, shown once. `resolve_share_link(hash)` (SECURITY DEFINER) refuses revoked/expired. The public page is built from the `ShareReport` type (aggregates only) and tests scan the HTML for planted private strings. 404 for unknown/revoked/expired. **Assumptions:** scope = all time / this year / 90 days / 30 days; expiry 7/30/90 days (no "never"); max 5 usable links; **available on every plan** (growth feature; one flag `shareLinks` in PLANS to change); no view counter (privacy) | DONE (security-review: see QA file) |
| 5 | Quick-log `/app/quick` | Six fields, 56px targets, defaults from the last trade (instrument, side, size), one-tap save. Goes through the same validation and insert as the full form (`lib/trade-save.ts`; the trade-saving helpers moved out of the server-action file). Times = now (edit later). Manifest + icons (generated from the logo with the pre-installed Chromium, no new tool) + add-to-home-screen hint. **No service worker** (not needed; stated in the UI) | DONE |
| 6 | Plan copy | PLANS flags `comparison`, `backtesting` (existing flag, now means the backtest log), `shareLinks`; FEATURES_NOW rows, FEATURES_DEV now empty (replay removed: not built, not approved, would need paid market data: docs/BACKTEST_REPLAY_LICENSING.md); pricing/landing/billing blurbs; privacy page, disclaimer line, LEGAL_FILL_IN | DONE |
| 7 | After the phase | PR, CI, code review (high), security review, plan matrix, 10k timings, QA file | DONE: PR #7, CI green on d4f2a12, code review 10 fixed, security review none, QA in docs/QA_RESULTS_2026-11-13_phase3.md |

#### Phase 3 wrap-up, 2026-11-13
- Final local run on d4f2a12: lint/tsc exit 0, 329 unit + DB tests, test-paste 40 + re-run, build with migrate (25 tables) + verify-db 101/0, e2e 252/252 (257/257 after the follow-up), e2e-billing 42/43 (same as main), viewport-check 21/21.
- Found while testing: quick-log lost its "Saved" confirmation at the plan limit (fixed). Code review found a CSV bug that wrote negative numbers as text (fixed).
- Not built: bar replay (needs a paid data licence: docs/BACKTEST_REPLAY_LICENSING.md). Owner decisions needed: share links on every plan, two backtest tables, legal wording (docs/LEGAL_FILL_IN.md).
- Follow-up 2026-11-14: share links hide money amounts by default (opt-in per link, fixed at creation, removed server-side); storage adapter tested over real HTTP against a local Storage API emulation; installability confirmed by Chromium itself (scripts/check-installable.js). Real Supabase / production / a real phone remain owner-only (checklist in the QA file).

### 2026-11-14: Phase 4 plan (branch `phase4-memos`, from main @ eea2ef1): memos and re-score only, nothing built
Main had moved on from the brief's 8af47d1 (Phases 1 to 3 merged; migrations up to 16, 25 tables). No migration, no code, no env change. Baseline before any change (local Postgres 16): `npm ci` ok, lint exit 0, `tsc --noEmit` exit 0, `npm test` 330 passed / 4 skipped without a database, `test-paste.sh` 40 PASS + re-run, `migrate.mjs` 25 tables, `verify-db.mjs` 102 passed / 0 failed.
| # | Task | Status |
|---|---|---|
| 1 | docs/decisions/MEMO_BROKER_SYNC.md (SnapTrade: pricing, brokers, privacy, legal, effort, go/no-go) | DONE: no-go now, conditions listed; unread pages marked UNVERIFIED |
| 2 | docs/decisions/MEMO_AI_SUMMARIES.md (cost per user per week, data, opt-in, advice risk, injection, spend cap) | DONE: conditional go (pilot); Anthropic retention terms UNVERIFIED |
| 3 | docs/decisions/MEMO_REPLAY_DATA.md (vendor table rechecked, BYO CSV, vendor question, cost range) | DONE: do not buy now; about $300 to $1,000 per month |
| 4 | Re-score in docs/READINESS_REVIEW.md: main vs live columns; table sums to 4.05 at start; industry headline reset to the table (6.5) | DONE; all six rows missed target, listed with reasons |
| 5 | Owner checklist at the end of READINESS_REVIEW.md | DONE |
Notes: research used a page-fetch tool on 2026-11-14; vendor pages carry no dates unless stated in the memos. Found: reminder-email code (acbf253, "WIP, e2e pending") exists in main while docs say "not built"; scored as not delivered. Browser e2e and the production build were not re-run (no code changed); CI covers lint, types, tests, build and smoke.
