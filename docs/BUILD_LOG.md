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
| 3 Differentiation | `phase3-growth` | strategy comparison; manual backtest log; /demo; share links; mobile quick-log | todo |
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
| 8 | After the phase | PR, CI, code-review (high), security-review (new tables), plan matrix, 10k timings, `docs/QA_RESULTS_<date>.md`. | todo |

#### Task 2 notes (SQL aggregation), 2026-11-13
- Baseline before the change (Task 1 code, 10,000 seeded trades, local Postgres, warm median): dashboard 284 ms (response body 1.35 MB: all 10,000 equity points were sent to the browser), analytics 1,274 ms (a new `Intl.DateTimeFormat` per trade in the weekday table), journal 73 ms.
- After: dashboard 214 ms (body 132 KB, curve thinned to <= 402 points for display only), analytics 272 ms, journal 72 ms. Data layer alone: 133 ms for 10,300 trades, `summarizeResults` 10 ms.
- Design: SQL does filter + join + exit sums + the per-trade result; `summarizeResults` (metrics.ts) does every aggregate. `aggregate.db.test.ts` asserts SQL == `evaluateTrade` per trade (statuses, net/gross/fees, R) and == `summarize` for every aggregate, over 10,300 trades, with filters, a EUR account, and RLS. I broke the SQL twice on purpose (fee conversion; status precedence) and the test failed both times.
- Finding: under row-level security `coalesce(closed_at, opened_at) >= x` can never use an index (COALESCE is treated as leaky, the range shows up as a heap filter). The date filter is written on plain columns instead. Planner evidence is in `db/paste/12_analytics_indexes.sql`: only `trades_user_closed` was kept; an expression index, a symbol index and a covering exits index were measured and rejected (no gain).
- No row cap any more. Honest limit: a single query for a 100,000-trade user takes about 1.2 s; very large journals should use the date filter.
