# Test Results (2026-11-08, local)
| Suite | Command | Result |
|---|---|---|
| Unit: metrics, CSV, trade validation, entitlements | `npm test` | **38 passed** |
| DB: migrations apply on Postgres 16 + 15 two-user isolation checks | `npm run test:db` | **all PASS** |
| Lint | `npm run lint` | clean |
| Production build (with and without Supabase env) | `npx next build` | passes |
| HTTP smoke (local `next start`) | curl | public pages 200; `/app`, `/app/journal` → 307 to `/login` |

## Bug found by testing
RLS checked only `user_id`, so a user could create a trade pointing at another user's account/strategy. Fixed with ownership triggers; regression tests added.

## NOT tested (no Supabase project / browser run yet)
Real signup/login/logout/password-reset against Supabase Auth; server actions end-to-end (createTrade, deleteTrade, onboarding); mobile/tablet layout visually; anything on a deployed URL. The DB-side shape of the trade insert was checked in SQL only.
The local RLS harness uses a shim of Supabase's `auth` schema — re-run `scripts/rls-test.sql` against the real project after migrating.
