# Projection: if the owner-side items below are done (estimate, not measured)
Assumes: one real payment and refund works end to end, a Sentry event is seen, ImprovMX delivery confirmed, branch protection on `main`, Production Branch = `main`.
| Lens | Now | Projected |
|---|---|---|
| Overall app | 7.6 | **8.2** |
| Industry-specific | 5.3 | **5.4** (these are operations items, not features) |
| App-type-specific | 7.9 | **8.8** |
Remaining caps after that: legal pages not reviewed by a lawyer and no Data Protection registration (-0.3 overall), no backup-restore drill, no public demo or broker sync. Feature build plan to reach 8.0+ industry: `docs/NEXT_BUILD_BRIEF.md`.

# Readiness rating — 2026-11-12 (night; production = commit ac9760f)
**Verified live today:** Sentry client reports reach Sentry (HTTP 200); Resend delivers real confirmation email; HandyPay live key works and creates a $6.00/month founding checkout (nothing paid); webhook rejects unsigned/forged calls; account deletion works. **Not verified:** a real payment activating a plan via the webhook, server-side Sentry events, ImprovMX delivery log, branch protection, Production Branch = `main`.

## Previous snapshot (441047f)
**Since the last rating:** legal pages filled and live (operator accepts responsibility, no lawyer review stated), support@tradenotes.dev forwarding set up (ImprovMX, delivery not yet confirmed from a second account), Resend verified and sending. **Still open:** Sentry not linked to the project, HandyPay key/webhook not set (see HANDYPAY_SETUP.md), no live payment test, no branch protection, Production Branch not `main`.

## Previous snapshot (29e8aaa)
| Lens | Score /10 | Was | One-line reason |
|---|---|---|---|
| **Overall app** | **7.6** | 7.2 | Solid, tested, live; money path and legal still unproven |
| **Industry-specific** (retail trading journal / fintech-adjacent) | **5.3** | 5.2 | Trust basics are good; the features buyers compare on (broker sync, depth) are not there |
| **App-type-specific** (paid B2C subscription web app) | **7.9** | 7.2 | Auth, isolation, email, CI in place; billing unverified, legal blank, monitoring not yet receiving data |

## Overall app (6.8)
+ 20-table database with row-level security, 43 verification checks on every build, 101 tests, CI with runtime smoke test, security headers, email confirmation working, production on the custom domain with rollback available.
- Payments never exercised end to end with the real provider; founding/annual/affiliate paths untested against live HandyPay events.
- Legal pages show the unfilled-details warning. Sentry not receiving events yet. No backup-restore drill. Branch protection on `main` not enabled, so CI does not block merges.
- Production branch in Vercel is not `main` (manual promote needed).

## Industry-specific (5.0): what traders compare you on
Strong: no broker credentials stored; honest metrics (open/partial trades disclosed, small-sample warnings); R-multiples, partial exits, forex lots; CSV import; risk disclaimer page; 18+ only; self-service export/delete.
Missing versus Tradezella/TraderSync/Edgewonk-class tools: **broker auto-sync** (the #1 purchase driver), futures/options contract specifics, calendar and weekly review, screenshots, backtesting/replay, mobile app, community/social proof, real testimonials. Marketing is truthful about this ("in development"), which protects trust but caps conversion.
Regulatory: you are a journaling tool, not an adviser. Keep "no financial advice / no performance promises" everywhere, and keep partner rules banning income claims. Registration with the Jamaican Information Commissioner (data controller) and a lawyer review are still open.
Moves it to 6.5+: CSV templates for the 5 biggest brokers (MT4/MT5, TradingView, Tradovate, NinjaTrader, Thinkorswim), calendar view, a public demo with sample data, 3 real user testimonials.

## App-type-specific (6.5): paid B2C SaaS checklist
Done: signup/login, email confirmation and reset, plans and limits enforced server-side, cancel/resume, payment history, data export, account deletion, partner program, analytics code, CI, monitoring code.
Not done: one real live payment and refund (including webhook field names), legal fill-in, Sentry data flowing, uptime check, branch protection, support inbox/process, backup restore test, DPA registration, tax position with HandyPay (merchant of record).
Moves it to 8: the six items above, in that order.

## Path to a paid launch
1) Legal fill-in (form submitted) 2) HandyPay key rotated + webhook secret 3) Sentry variables present, redeploy 4) test payment of the cheapest plan, then refund 5) branch protection + uptime check 6) Production Branch = `main`.

---
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
