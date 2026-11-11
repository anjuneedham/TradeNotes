# Security audit (2026-11-11)
Scope: code, schema, dependencies, auth, payments, data export/deletion. Method: code review + automated tests (results below are from runs in this session, not assumptions).

## Findings
| # | Area | Finding | Severity | Status |
|---|---|---|---|---|
| S1 | Cross-account visibility (previously reported, previously "fixed") | **Independently re-tested.** Isolation is enforced by Postgres RLS + `app_user` role; app-level forgery attempts (foreign trade id on detail/edit/update, foreign account id on create) all refused | Was critical | **Verified fixed** — see MULTI_ACCOUNT_TESTS.md |
| S2 | Next.js vulnerability (previously blocked Vercel deploy) | `next@15.5.29` = latest 15.5 patch. Remaining advisory was Next's bundled **PostCSS 8.4.31** (4 advisories, build-time) | Moderate/High (build-time only) | **Fixed** via `overrides` → postcss 8.5.32. `npm audit --omit=dev`: **0 vulnerabilities** |
| S3 | Self-granted paid plans | `app_user` has SELECT only on `subscriptions`/`payments`; no access to `billing_events`; verify-db checks "self-upgrade changed 0 rows" | — | Verified |
| S4 | Payment webhook | HMAC-SHA256 over raw body, constant-time compare, 401 on missing/invalid; 503 if secret unset; 512 KB cap; idempotent by event id; transactional; stale & foreign-subscription events ignored | — | Built + tested (unit + e2e) |
| S5 | Replay of an old signed webhook | HandyPay signs no timestamp. Mitigation: event-id dedupe + stale-event ordering. A replay of a never-seen-but-old event is ignored as stale if a newer event was applied | Low | Accepted, documented in WEBHOOK_SECURITY |
| S6 | Payment ↔ account matching by email (old manual flow) | New flow uses `metadata.user_id`. Email fallback only matches **verified** emails and only when exactly one account matches | Was medium | Fixed |
| S7 | Open redirect via provider URLs | Checkout/portal URLs must be `https://` (http only when a local test hook is set) | Low | Fixed |
| S8 | CSV export formula injection | Cells starting with `= + - @` are prefixed with `'` | Low | Fixed |
| S9 | Account deletion | Requires typed DELETE + current password (Better Auth verifies); live subscription cancelled first; FK cascade verified (0 orphans) | — | Built + tested |
| S10 | Email verification off in production | Anyone can register any address until Resend is configured | Medium | **Open — founder: domain + Resend** |
| S11 | No CSP header | Baseline headers present (HSTS, XFO DENY, nosniff, referrer, permissions). Strict CSP needs nonce plumbing | Low | Open (post-launch) |
| S12 | Supabase TLS not certificate-verified without `DATABASE_SSL_CA` | Encrypted, not verified | Medium | **Open — founder: add CA PEM to Vercel env** |
| S13 | No rate limit on app actions (trade create/update, export) | Auth endpoints are rate limited | Low | Open; plan limits bound row growth on Free |
| S14 | No error monitoring | Errors only in Vercel logs; webhook failures return 500 so HandyPay retries | Medium | Open (Sentry free tier recommended) |
| S15 | Secrets | No secrets in repo (`git grep` for key patterns clean; `.env.local` ignored). Checkout links are public by design | — | Verified |
| S16 | CSRF on server actions | Next.js server actions check Origin; session cookie SameSite=Lax | — | Accepted |

## Commands run
```
npm audit --omit=dev                 → found 0 vulnerabilities
npm run test:db                      → RLS tests OK (fresh DB, simulated Supabase roles)
node scripts/verify-db.mjs           → 42 passed, 0 failed
node scripts/e2e.js                  → 53/53 passed
node scripts/e2e-billing.js          → 37/37 passed
npx vitest run                       → 91 passed
```
