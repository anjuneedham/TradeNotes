# Build log: "8/10 trading journal" session (spec: docs/NEXT_BUILD_BRIEF.md)

## Baseline (2026-11-12, main @ 2c0575e)
`npm ci` ok · `npm run lint` exit 0 · `npx tsc --noEmit` exit 0 · `npm test` 103 passed / 2 skipped (DB tests skip without a DB) ·
`bash scripts/test-paste.sh` 40 PASS + idempotent re-run · `migrate.mjs` 20 tables · `verify-db.mjs` 43 passed, 0 failed · founding/affiliate DB tests 2 passed.
Note: the session branch was created from an older commit (1458f71) that lacks the brief; work is based on `origin/main` instead.

## Plan (one branch + PR per phase)
| Phase | Branch | Scope | Status |
|---|---|---|---|
| 1 Capture and evidence | `phase1-capture` (PR #1) | broker presets + auto-detect + fixtures; timezone setting; fill grouping; instrument specs; multiple accounts (switcher, limits, combined view); screenshots (Supabase Storage adapter + in-memory fake, caps, quotas) | built, reviewed, CI green; awaiting owner merge |
| 2 Analytics and review | `phase2-analytics` | global filter bar; expectancy/drawdown/R distribution/heatmap/hold time/streaks/MAE-MFE/mistake cost; calendar; daily journal + weekly/monthly reviews; playbook adherence; 10k-trade performance | todo |
| 3 Differentiation | `phase3-growth` | strategy comparison; manual backtest log; /demo; share links; mobile quick-log | todo |
| 4 Memos | `phase4-memos` | broker sync, AI summaries, replay data licensing (memos only) | todo |

## Progress notes

### 2026-11-13: Phase 1
- Built all four parts; code review (10 findings) and security review done; see docs/QA_RESULTS_2026-11-13.md for evidence and the honest gap list.
- CI had failed on every `main` run I could inspect (runs 6 to 36): `.github/workflows/ci.yml` had `${{ }}` inside an unquoted flow mapping (invalid YAML, so GitHub started no jobs). Fixed in PR #1; first green run 43339934841.
- Found while testing: `e2e-billing.js` has one failing check on unmodified `main` too (founding price $6 shown where the test expects $12 on a fresh DB). Not fixed here; belongs to the founding-offer owner.
- Merged `main` (SEO work) into the branch; one import conflict in the landing page.
- Next: owner merges PR #1 (after reviewing legal text), then Phase 2 on a new branch from `main`.

### 2026-11-13 (later): production deploy and prompts
- Production deploy of `main` (8af47d1) READY at tradenotes.dev after PR #2 (verify-db storage check fix). Migration 11 applied; 20 tables, 196 columns verified in the build.
- Owner confirms the `trade-screenshots` bucket exists in the TradeNotes Supabase project (separate org, Free plan). **End-to-end upload on production is untested** (no paid test account yet).
- Empty `trade-screenshots` bucket created by mistake in the Agriloop project (YardScale-Digital); delete is pending the owner's Supabase confirmation.
- Prompts for Phase 2 to the end and for video production: `docs/prompts/`.
