# QA test results — final run 2026-11-11 on the final code of this round
Environment: Linux container, Node 22, PostgreSQL 16, Chromium (Playwright), `next build` + `next start`.

| Suite | Result |
|---|---|
| Unit (Vitest) | **91/91** |
| Lint | exit 0 |
| TypeScript | exit 0 |
| `npm audit --omit=dev` | 0 vulnerabilities |
| RLS fresh-DB suite | OK |
| Paste chunks fresh + re-run | 40 PASS, re-run OK |
| Build: migrate | 17/17 tables |
| Build: verify-db | **42/42** |
| e2e.js | **53/53** |
| e2e-billing.js | **37/37** |
| e2e-email.js | **15/15** |
| viewport-check.js | **21/21** (7 public pages × 390/820/1280) |
| Vercel preview builds of this branch | 3/3 READY |

## User types covered
New users (every run), existing user re-login, two simultaneous accounts, Free at limit, Standard, Premium, past-due, cancelled-pending, expired, re-subscribed, deleted account, signed-out requests, unsigned/forged webhooks, duplicate events, empty states (dashboard example), error states (validation, wrong password, failed checkout notices).

## Not run
Real HandyPay; real email delivery; live domain; real phones/tablets; screen reader; throttled network; Lighthouse.
