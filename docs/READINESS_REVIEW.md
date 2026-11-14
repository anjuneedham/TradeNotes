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

---
# Re-rating — 2026-11-14 (commit on dev branch; live site not re-checked today)
## What changed
- **Facts checked today:** real database has **0 real signups and 0 paying users** (3 automated test accounts, not yet deleted). Unit tests re-run: **50 pass** (was 46). Lint exit 0. Type check exit 0. DB isolation checks and browser e2e were **not** re-run today; their results above are from 2026-11-10.
- **New finding, fixed in code:** the pricing page advertised a "founding members: 50% off for 12 months" offer that is not built (no coupon, no terms) and the landing hero said users could "test changes before you risk money" (backtesting does not exist). Both removed. They stay live until the dev branch is deployed.
- **New finding, not fixed:** Premium ($24) differs from Standard only by an unlimited trade cap. Nothing else promised for Premium exists yet.
## Scores (out of 10, my judgement from the evidence above)
| Lens | 2026-11-10 | 2026-11-14 | Why |
|---|---|---|---|
| Senior developer | 7 | **7** | Re-verified tests/lint/types; same gaps (no monitoring, no CI gate, manual billing, no verified email) |
| Product designer | 5.5 | **5** | Text-only landing; paid tiers barely differ; Premium has no built value yet |
| Honest claims | not scored | **6** | Two more unbuilt claims found and removed; process rule added (HQ section 12). Docs still mention withdrawn offers as history only |
| Ready to charge | No | **3** | Gates all still open: domain+email, legal fill-in, one real payment test, monitoring, something worth paying for |
| **Overall** | 6.5 | **6.0** | Trustworthy foundation, zero traction, nothing yet that justifies a charge |
