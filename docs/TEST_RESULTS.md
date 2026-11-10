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
