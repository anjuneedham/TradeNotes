# Test Results (2026-11-09, local: Node 22, Postgres 16, production build)
| Suite | Command | Result |
|---|---|---|
| Unit: metrics, CSV, trade validation, entitlements, DB config, attribution tags | `npm test` | **46 passed** |
| DB: migration applies + 40 isolation checks incl. simulated Supabase `anon`/`authenticated` roles | `npm run test:db` | **all PASS** (mutation check: with the lockdown removed the suite reports 12 FAILs, so the tests do detect the hole) |
| Browser e2e (real app + real Postgres, Chromium, 2 users) | `node scripts/e2e.js` | **30/30 passed** (adds ?src= attribution checks) |
| Lint / typecheck / production build | `npm run lint`, `tsc`, `next build` | clean, 0 warnings |

**E2E covers:** signed-out gate; signup; onboarding gate; empty-state with labelled example; trade validation (wrong-side stop rejected and not saved); forex trade EURUSD 1 lot 1.0850→1.0910, fee $7 ⇒ **net $593.00, 1.98R** (hand-calculated); open trade shown as Open and disclosed as excluded; dashboard net $293.00 / win 50% / PF 1.98 / avg R 0.49 / small-sample warning / by-strategy; mobile (390px) no horizontal scroll on dashboard and trade form; user B sees none of user A's data; delete; logout gate; wrong-password generic error; login restores data.
**Test-harness lessons:** early failures were my test asserting before server actions finished (fixed by waiting on outcomes), and one run hit a stale server (`EADDRINUSE`) — re-run on a verified-fresh server.

## NOT tested
Anything against Neon or a deployed URL; email confirmation / password-reset flow (no mail provider); tablet layout; real payments; session expiry; concurrent-load behaviour; the CSV import UI (not built).

## Update 2026-11-10 (email + legal prep)
| Suite | Result |
|---|---|
| Unit | **50 passed** (adds legal-config tests) |
| Email flows with a fake Resend server (`scripts/e2e-email.js`) | **15/15**: signup→check email; unconfirmed login refused + fresh link; link lands on onboarding; forgot-password; reset link→form→new password; old password dead; unknown email = same message, **no email sent**; bad token handled |
| Main browser e2e | 30/30 |
| Lint / tsc | exit code 0 / 0 (lint now excludes `scripts/**`) |
Bugs found by the email tests and fixed: confirmation link sent on an unconfirmed login landed on the home page (now onboarding/app); password reset did not revoke existing sessions (now it does).
Not tested: real Resend delivery/deliverability, DNS records, spam placement.

## Update 2026-11-14 — HQ (`hq/`)
| Suite | Command | Result |
|---|---|---|
| Unit (outreach rules, content gate, captions, nurture schedule, plans/MRR, session + TOTP, social) | `cd hq && npm test` | **39 passed** (includes a drift test: HQ prices/founding offer/effectivePlan must equal the customer app's) |
| DB (customer schema + `hq` schema applied twice; RLS, API-role lockout, duplicate-DM / one-follow-up / send-once indexes, cascade erase) | `cd hq && npm run test:db` | **21/21** |
| Browser e2e (real app + Postgres + fake Resend, Chromium) | `cd hq && bash scripts/run-e2e.sh` | **98/98** |
| Lint / tsc / production build | `npx eslint` / `npx tsc --noEmit` / `npm run build` | exit 0 / exit 0 / ok |
| Customer app regression | root `npm test` / lint / tsc / `next build` | 50 passed / 0 / 0 / ok |
Bugs found by these tests and fixed: money-amount check never matched (`\b` before `$`); first DB test run reported "OK" with 0 checks (results rolled back — now fails if < 20 checks report); downgrading a founding member to Free was refused (founding box still ticked) — Free now clears the flag.
**Not tested:** anything on Supabase PG17 or a deployed URL; real Resend delivery; Handypay; real TikTok/Instagram data entry at volume; tablet layout.
