# QA test plan
| Layer | Tool / command | Covers |
|---|---|---|
| Unit | `npm test` (Vitest) | metrics, trade schema, entitlements + grace, lifecycle reducer, webhook signatures, email templates, CSV parser, DB config, legal config |
| DB security | `npm run test:db`, `scripts/test-paste.sh`, `node scripts/verify-db.mjs` (also every build) | RLS, grants, triggers, idempotent migrations, two-user isolation, billing tables |
| Browser e2e | `node scripts/e2e.js` | core journey, edit, futures, analytics, mobile, two users, forged ids, export, deletion, auth |
| Billing e2e | `node scripts/e2e-billing.js` (fake HandyPay + Resend) | 14 lifecycle steps, webhook security, duplicates, stale, entitlements, isolation |
| Email e2e | `node scripts/e2e-email.js` (fake Resend) | verification, reset |
| Responsive | `node scripts/viewport-check.js` + e2e mobile checks | 390 / 820 / 1280 px |
| Static | `npm run lint`, `npx tsc --noEmit`, `npm audit --omit=dev` | |
| Manual (founder) | PAYMENT_TEST_REPORT script; real-inbox email; real phone | real provider, real devices |

## Core journey mapping (brief §11)
1 landing · 2 register · 3 verify email · 4 log in · 5 onboarding · 6 create trade · 7 notes · 8 edit · 9 history · 10 analytics · 11 settings · 12 select plan · 13 checkout · 14 entitlements · 15 cancel · 16 billing rules → all automated (13 against the fake provider). Real-provider checkout and real inbox are manual.
## Matrix not automated
Real devices; slow-network throttling; screen readers; real HandyPay; real email clients.
