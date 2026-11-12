# Readiness review — 2026-11-12 update (after merging billing, CSV import, redesign; founding offer; analytics)
**Overall ~7.0 / 10 (was 6.5). Free/early-access launch: ready once legal fields + a public domain are set. Charging money: not yet.**
Done since 11-10: HandyPay checkout + signed webhooks + lifecycle (unit-tested, fake provider e2e), CSV import (paid feature now real), trade edit, data export/delete, frontend redesign, founding offer built and concurrency-tested (see FOUNDING_OFFER.md), Vercel Web Analytics code added.
**Blocking before the first payment:** (1) legal fields (`businessName`, `supportEmail`) still TODO; (2) no production deployment exists: every Vercel deployment is a branch preview behind SSO protection, and `main` has not been deployed; (3) one real HandyPay test-mode payment incl. discounted founding checkout (webhook field names unverified against real events); (4) public domain + Resend verification (last, per founder); (5) Vercel Web Analytics must be switched on in the dashboard (code is in, data is 0 until then); (6) error monitoring; CI gate; month-12 repricing of founding members is manual.

**Added 2026-11-12 (later):** annual billing (2 months free: $120/$240, founding = 50% of the annual), partner programme (docs/AFFILIATE_PROGRAM.md; 30% x 12 months, 30-day hold, CLI payouts), CI workflow + monitoring instructions (docs/MONITORING_AND_CI.md). Database now 20 tables, 43 verification checks, 101 tests. **Security:** a live HandyPay key was pasted into chat on 2026-11-12; rotate it and store only in Vercel (Sensitive).

---
# Readiness review — 2026-11-10 (commit 9783a7d, live on Vercel)

## Verdict
| Question | Answer |
|---|---|
| Technically live and working? | **Yes** — live smoke test 13/13, DB verified on every build, security headers live |
| Ready for a **free / early-access** launch (signups, feedback, content-led)? | **Yes, conditionally** — needs the public domain attached and the legal placeholders filled |
| Ready to **charge money**? | **No, not yet** — see gates below |

## Scores (out of 10)
| Lens | Score | One-line reason |
|---|---|---|
| Senior developer | **7 / 10** | Strong correctness + isolation + deploy safety for an MVP; missing monitoring, CI gate, verified email, automated payments |
| Product designer | **5.5 / 10** | Clean, honest, mobile-safe, beginner-friendly; but thin — text-only landing, long trade form, paid plans barely differ |
| Overall | **6.5 / 10** | A trustworthy foundation, not yet a product people should pay for |

## Evidence — engineering strengths
- Metrics engine is pure and tested (46 unit tests); live trade EURUSD 1 lot 1.0850→1.0910, $7 fees = **$593.00 / 1.98R**, matching a hand calculation.
- Tenant isolation in depth: row-level security + restricted `app_user` role + ownership triggers + locked-down login tables. **38 checks run on every production build** (incl. rolled-back two-user test); mutation-tested (RLS off / public grant / missing column all fail the build).
- Idempotent schema applied on deploy; build fails closed; previous version keeps serving on failure.
- Browser e2e 30/30 (two users, mobile widths). No secrets in repo; Sensitive env vars.
- Honest data handling: open/partial/FX-less trades excluded and disclosed; small-sample warnings; no ∞ profit factor.
## Evidence — engineering gaps
1. No error monitoring/alerting or uptime check (only Vercel logs).
2. No CI gate: unit/e2e tests are run by hand, not blocking deploys; `main` unprotected.
3. Supabase TLS is encrypted but not certificate-verified (set `DATABASE_SSL_CA`).
4. Email verification + password reset OFF until domain + Resend; payment matching is by email.
5. Payments manual: no webhook, no plan-change audit trail, renewals extended by hand.
6. No CSP header; no backup-restore drill; dashboard loads up to 10k trades per request; times stored UTC.
7. No trade edit, no delete confirmation, CSV import code exists but has no UI.

## Evidence — design strengths / gaps
+ Consistent dark system, clear hierarchy, empty states with guidance, labelled example, "Learn more" on every metric, no horizontal scroll at 390px.
− Landing page is text only (no product screenshots/demo) → weak trust and conversion.
− Trade form is long (5 cards) — intimidating for beginners; no "quick log" mode.
− Today the paid plans mainly raise the trade cap (50 → 2,000 → unlimited); breakdowns are free. Thin reason to pay.
− No calendar/weekly review/CSV import/backtesting yet (now honestly labelled "in development").

## Fixed today (found during this review)
Pricing, landing, billing and Terms advertised CSV import, screenshots, calendar/reviews, backtesting, strategy comparison and multi-account as available. They are now listed as "in development — not available yet". Baseline security headers added.

## Gates before taking the FIRST payment
1. Public domain attached (`tradenotes.dev`) + Resend email → verification and password reset.
2. Legal placeholders filled (support email, business name); founder has accepted responsibility.
3. One real Handypay payment + manual activation tested end to end (nobody has paid yet).
4. Error monitoring (e.g. Sentry free tier).
5. Decide what paid users actually get — ship CSV import (code + tests already exist) first.
## Next 5 engineering tasks
CSV import UI → trade edit/delete-confirm → email (Resend) → Sentry + CI gate → calendar/weekly review.
## Branch note
`main` was created on 2026-11-10 from the tested branch. Vercel's production branch and GitHub's default branch must be switched to `main` in their dashboards (the connector cannot change them).
