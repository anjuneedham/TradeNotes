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
- CI had failed on every run since commit 29e8aaa: `.github/workflows/ci.yml` had `${{ }}` inside an unquoted flow mapping (invalid YAML, so GitHub started no jobs). Fixed in PR #1; first green run 43339934841.
- Found while testing: `e2e-billing.js` has one failing check on unmodified `main` too (founding price $6 shown where the test expects $12 on a fresh DB). Not fixed here; belongs to the founding-offer owner.
- Merged `main` (SEO work) into the branch; one import conflict in the landing page.
- Next: owner merges PR #1 (after reviewing legal text), then Phase 2 on a new branch from `main`.
