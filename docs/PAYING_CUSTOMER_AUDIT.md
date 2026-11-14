# If someone wants to pay today: will they get what we say, and is it worth it?
Audit of 2026-11-14 against the live site (`https://tradenotes.dev`, unauthenticated requests only), `origin/main`, the production environment variable **names** (never values), and the project's QA records. I did not sign in to production, create accounts, or make a payment. Scores and judgements are mine.

## Short answer
- **Do they get what the pricing page says?** Mostly yes on features. The pricing page is honest: it lists what exists and marks the rest "in development". The page does not promise reminder emails, broker sync, replay backtesting or a group call.
- **Is every base covered?** No. The money path (checkout, webhook, automatic plan switch, refund) is built and tested in pieces, but **no real payment has gone through it**. Until one does, a paying customer could pay and not see their plan switch on. The pricing FAQ even still says plans are switched on by hand.
- **Is the app offering value?** Yes for a retail trader who wants a cheap, honest, beginner-friendly journal with real analytics. It is weaker than the big journals on automation (no broker auto-sync) and Premium's extras are thin.

## The pay journey, step by step
| Step | State | Evidence / gap |
|---|---|---|
| Find site, pricing, demo | Verified | `/`, `/pricing`, `/demo`, `/partners`, `/signup` return 200 publicly |
| Sign up free, log first trade | Built, not proven live | Local browser e2e passes; no real signup yet; production has Resend key and sender set, delivery to a real inbox unconfirmed |
| Import broker file | Built, not proven | 13 formats; every fixture is synthetic; no real export tested (biggest gap, docs/READINESS_REVIEW.md) |
| Start 14-day trial at Handypay | Built, not proven | Checkout creation code + tests; production has API key and webhook secret; unsigned webhook call returns 401 `bad signature` (endpoint alive, rejecting correctly); no real purchase |
| Plan switches on automatically | Built, not proven | Webhook + lifecycle rules unit-tested; first real delivery not seen (KNOWN_ISSUES 26: payload field names assumed Stripe-style); **pricing FAQ still says "by hand" (KNOWN_ISSUES 32)** |
| Founding price (first 10) | Built, not proven | Seat reservation tested (15 simultaneous claims → 10 seats); real discounted checkout not run; billing e2e has 1 known failure on this price |
| Cancel, refund, failed payment | Built, not proven | State rules unit-tested; not run through Handypay |
| Screenshots | Built, not proven | Production has Supabase URL + service key; end-to-end upload on production untested; pricing still lists screenshots (check the label before promoting) |
| Partner link + 30% | Built | `/partners` live; payouts manual |
| Support | Confirm | `support@tradenotes.dev` is published; confirm it receives mail |
| Reminder emails | Not available | No `CRON_SECRET` in production |
| Group call / coaching | Not available | Not written |

## Is the app offering value?
**Strengths:** the metrics are honest (small-sample warnings, excluded-trade disclosure), plain-English explanations on every number, a free demo, calendar, reviews, playbook and rule adherence, mistake cost, 10+ broker formats on paper, multiple accounts, share links that hide money by default, fast pages (measured locally). Price ($12 / $24) is well below the competitor prices in `BUSINESS_PLAN.md` (approximate and unverified: re-check before quoting any).
**Weaknesses a buyer will notice:**
1. **No broker auto-sync.** Most serious journals have it; here every trade is typed or imported.
2. **Import unverified on real files.** A failed first import is the likeliest reason a trial user leaves.
3. **No MAE/MFE, no replay backtesting** (the "backtest log" is manual and labelled hypothetical).
4. **Premium is thin:** unlimited trades, 10 accounts, strategy comparison and a manual backtest log. Premium's strongest additional value would be the weekly group review, which is not yet written or scheduled.
5. Onboarding questions are collected and not used (design report).
6. No custom date ranges on analytics; futures and time-zone details are listed in KNOWN_ISSUES.
**Verdict (my judgement):** worth paying $12 for a retail trader who wants to *understand* their trades; worth $24 only to someone who values strategy comparison and many accounts. It is not yet a replacement for a broker-synced journal.

## Fix before you push hard (in order)
1. **Do one real purchase and refund** (use `docs/HANDYPAY_SETUP.md` Step 5): confirm the plan switches on, a payment row appears, and the webhook deliveries are 200. Then update the pricing FAQ to match what happened.
2. Confirm the support inbox receives mail; send a test.
3. **Check imports with 2–3 real broker exports** of yours.
4. Do one real screenshot upload on production, then keep or remove the pricing line.
5. Set `CRON_SECRET` only when you decide to turn reminder emails on; keep them off the site until then.
6. Write the Premium weekly review terms before mentioning it to anyone.
7. Keep the founding counter honest: it is real, but run its checkout once before pointing people at it.

## How this was checked (so you can repeat it)
`curl` on the public pages and the webhook endpoint (unsigned POST); `git show origin/main:...` for docs, plans and code; Vercel environment variable **names** (values never decoded); `docs/QA_RESULTS_2026-11-13_phase3.md`, `docs/KNOWN_ISSUES.md`, `docs/design/FRONTEND_COMPLETION_REPORT.md`. Not checked: any signed-in production behaviour, real payments, real email delivery.
