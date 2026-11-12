# Partner (affiliate) program — built 2026-11-12
Goal: trading-group owners send their members to TradeNotes and you only pay out of cash you have already received.

## The offer (all numbers live in `AFFILIATE` in `src/lib/affiliate.ts`)
- **30% of cash collected, for the customer's first 12 months.** Not lifetime, not on free users.
- Annual plan = 30% of the annual payment, once. Commission is on the amount actually paid (so on the discounted founding price too).
- **Payable 30 days after each customer payment** (covers the 14-day refund window). A refund voids unpaid commission.
- Paid **monthly, minimum $25** (smaller balances roll over), by PayPal/bank/Wise, at the partner's cost. Payment is manual; takes ~5 minutes a month.
- Attribution: `?ref=code` link, 30-day cookie, last click wins, one referrer per user, self-referral ignored.
- Public terms page: `/partners` (rendered from the same constants). Private stats page per partner: `/partners/stats/<secret>`.

## What it costs you (assumes HandyPay fees ~5%; rate card not yet confirmed)
| Customer | Year-1 cash | Partner gets | Fees ~5% | You keep |
|---|---|---|---|---|
| Standard monthly ($12) | $144 | $43.20 | $7.20 | **$93.60 (65%)** |
| Standard annual ($120) | $120 | $36.00 | $6.00 | $78.00 |
| Premium monthly ($24) | $288 | $86.40 | $14.40 | **$187.20** |
| Founding Standard ($6 x 12) | $72 | $21.60 | $3.60 | $46.80 |
Year 2 onward: 100% minus fees. A churned customer stops costing commission because commission only follows cash received. **Worst-case exposure is 30% of revenue you have already banked**, so the programme cannot put you in cash-flow trouble. 20 partners x 5 paying members each = 100 customers, about $1,200 MRR, about $360/month in commission.
Return test: the cost per customer ($22-86 over a year, paid only if they stay) is the effective CAC. Compare with your Instagram test CAC (docs/PAID_TEST.md); keep partners whose paying customers cost less than that.

## Day-to-day (CLI, needs `DATABASE_URL` for the owner connection)
```
node scripts/affiliates.mjs add fxking "FX King" them@example.com      # prints link + private stats URL
node scripts/affiliates.mjs payout fxking "PayPal: them@example.com"   # store payout details
node scripts/affiliates.mjs list                                       # sign-ups, earned, payable, paid
node scripts/affiliates.mjs due                                        # CSV: who to pay this month
node scripts/affiliates.mjs pay fxking "PayPal txn 123" --confirm      # run AFTER sending the money
node scripts/affiliates.mjs set fxking paused                          # stop new commission
```
Refund after payout: deduct from that partner's next payout by hand (rule is in the public terms).

## Who to approach (start with 5-10, not 100)
Good: Discord/Telegram/WhatsApp/Facebook groups and YouTube/Instagram educators for forex, futures or stock day-trading with 500+ active members, who talk about journaling, risk or prop-firm challenges. A journal is a natural fit for prop-firm communities.
Skip: signal sellers, "guaranteed profit" accounts, pump groups, anyone who refuses to disclose the affiliate link. Their members are your future refund and reputation risk.
Check before saying yes: look at 10 recent posts; is the community active; do they make income claims.

## Outreach (short, no hype)
First message:
> Hi <name>, I built TradeNotes, a trading journal that shows traders where their results come from (by setup, session, mistakes), free for up to 50 trades. Several members of <group> probably keep a spreadsheet for this. Would you like a free Premium account to try it, and if your members like it, a partner link that pays you 30% of what they pay for the first year? No obligation, and I'll send a one-page summary first.
Follow-up (day 4): "Happy to set up a 15-minute demo, or just give you the link. Any feedback on the free plan is useful either way."
When they say yes: create the partner, give them a free Premium account, send the link and the disclosure rule ("say it's an affiliate link; don't promise profits"), plus 3 ready-to-post captions from docs/CONTENT_ENGINE.md.
Log each outreach (name, platform, size, date, reply) in a sheet; review after 14 days.

## Rules of thumb
- Cap the first month at 10 partners; review sign-ups-per-partner and paid conversion before widening.
- Pay on time. Partners talk to each other.
- Never offer a higher % to one partner without writing it down (`add ... <pct>` supports it); keep 30% as default.
- Lawyer review of `/partners` terms is still outstanding.
## Not built yet (deliberately)
Click tracking, partner login, automatic payouts, tiered rates. Add them only after 5+ partners are active.
