# Rules for every build session (copied from docs/NEXT_BUILD_BRIEF.md, with lessons from Phase 1)
## Start
1. `git fetch`; branch from `origin/main`: one branch per phase (`phase2-analytics`, `phase3-growth`, `phase4-memos`). Never push to `main`, never force-push.
2. Read `docs/NEXT_BUILD_BRIEF.md`, `docs/QA_RESULTS_2026-11-13.md`, `docs/BUILD_LOG.md`, `docs/KNOWN_ISSUES.md`.
3. Baseline before changing anything: `npm ci`, `npm run lint`, `npx tsc --noEmit`, `npm test`. Local Postgres: `pg_ctlcluster 16 main start`; `bash scripts/test-paste.sh`; apply `db/paste` with `node scripts/migrate.mjs`, then `node scripts/verify-db.mjs`.
4. Add the plan to `docs/BUILD_LOG.md` and keep it current.

## Hard rules
- **Cost:** no new paid service, vendor, account, API or subscription. If something costs money, stop and ask the owner.
- **Owner-only:** do not change Vercel/Supabase/HandyPay/Resend/Sentry settings or env vars, do not delete data, do not touch the Agriloop Supabase project. Production deploys only when the owner says so.
- **Secrets:** never print, log or commit them. The production database is not available; test on local Postgres.
- **Database:** only idempotent files `db/paste/NN_name.sql` (next number is 12). A new user table needs row-level security, no grants to anon/authenticated, a two-user isolation check in `scripts/verify-db.mjs`, an updated `db/expected-columns.txt` (regenerate with the query in the Phase 1 commit history or the one at the top of verify-db), and the table-count constant `EXPECTED_TABLES` in `scripts/migrate.mjs` plus the "20 TradeNotes tables" check in `verify-db.mjs`.
- **Verify-db must pass on real Supabase too:** assert behaviour, not exact values that depend on the host (an earlier check failed the first production build because real storage was empty).
- **Edge safety:** `src/middleware.ts` must never import anything that reaches `pg`.
- **Plans:** limits are enforced on the server. A shipped feature updates `PLANS`, `src/lib/plan-features.ts`, pricing, billing copy and tests together. Never advertise anything that is not built, tested and reviewed.
- **Privacy:** any new data type updates `src/app/(marketing)/legal/privacy` and `docs/LEGAL_FILL_IN.md`. Do not change facts in `src/lib/legal.ts`.
- **Tests:** vitest for logic with hand-calculated expected values for any money or metric; extend `scripts/e2e.js` (two users, 390px). The CI workflow is `.github/workflows/ci.yml`: **never put `${{ }}` inside an unquoted `{ }` flow mapping** (that made every CI run fail with no jobs).
- If anything is ambiguous, unsafe or costs money: stop and ask. Do not guess. Report failures as failures.

## After the phase (all mandatory)
1. Open a PR into `main`. Wait for **both CI jobs green** (check with the GitHub MCP tools, not by assumption).
2. Run the `code-review` skill at high effort on the PR; fix every confirmed finding. Run `security-review` if the phase adds tables, sharing or uploads.
3. Test as Free, Standard, Premium, a user with no data, and a user with 10,000 trades; user B must not read or change user A's data (including by guessing ids).
4. Run `npm run lint`, `tsc`, `npm test`, `scripts/test-paste.sh`, the build with a database (`npm run build`), `scripts/e2e.js` and `scripts/e2e-billing.js` (compare billing with `main`; same result is fine, worse is a regression).
5. Write `docs/QA_RESULTS_<date>.md`: what was tested, pass/fail, evidence, and an honest gap list.
6. Tell the owner to merge. Do not merge, and do not deploy, without their say-so.
