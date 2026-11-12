# Founding-member offer (built 2026-11-12)
**What:** the first 10 paying members get 50% off for 12 months (Starter $6, Pro $12), applied automatically at checkout. Config: `FOUNDING_OFFER` in `src/lib/plans.ts`.
**How it works:** starting checkout reserves a seat (`subscriptions.founding_claimed_at`, race-safe via a Postgres advisory lock) and creates the HandyPay session at the discounted amount with metadata `founding=1`. A reservation is held 2 hours, then released if unpaid. The signed payment webhook confirms the seat (`is_founding_member = true`). Tested: 15 simultaneous claims -> exactly 10 seats (`src/lib/founding.db.test.ts`, run with `FOUNDING_TEST_DATABASE_URL`).
**Seat counts shown:** pricing page (refreshes each minute) and billing page.
Founding price also applies to annual (50% of the yearly price, first year).
**Needs the HandyPay API key.** With only the static checkout links (no `HANDYPAY_API_KEY`) the discount cannot be applied, and the offer is not shown on the billing page.
## Manual step you must do (not automated)
At month 12 the HandyPay subscription is still the discounted amount. Reprice or re-subscribe each founding member then (`select user_id, founding_claimed_at + interval '12 months' from tradenotes.subscriptions where is_founding_member`). If HandyPay supports repeating coupons, switch to that instead.
**Not yet verified:** a real HandyPay test-mode checkout at the discounted amount (the webhook must echo `metadata.founding`).
