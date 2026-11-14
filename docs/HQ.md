# HQ — 100 paying members by 31 Dec 2026
Written 2026-11-14 against `origin/main` (ad0d9b3) and the live site `https://tradenotes.dev`. This is the operating framework; other docs are reference.
**Correction note:** an earlier draft of this file was written against a stale branch and wrongly said the founding offer, CSV import, calendar, annual plans and affiliates were not built. They are built (see section 1). This version replaces it.

## 0. Target, honestly
| | Count | Price | MRR at list price |
|---|---|---|---|
| Standard (`starter`) | 50 | $12/mo or $120/yr | $600 |
| Premium (`pro`) | 50 | $24/mo or $240/yr | $1,200 |
| **Total** | **100** | | **$1,800** |
**Today:** 0 real signups and 0 paying users in the production database (3 test accounts excluded; deletion still pending your approval). ~100 total video views.
**Trial timing matters:** paid plans start with a **14-day free trial**, so someone who starts a trial after **17 Dec** won't have paid by 31 Dec. The founding price has no trial and is charged at signup. Track *trialing* and *paid* separately and decide which one counts as a "subscriber".
**Reality:** 100 needs roughly 1,000 signups and ~550 people who log a trade. Content alone can't do it in 47 days; it takes partners, founder-led sales and a community event. Treat 100 as a stretch and 30–50 as a strong result.

## 1. What is actually built (verified from `main` docs/code and the live pricing page, 2026-11-14)
- **Product:** manual trade entry, filters, dashboard, deeper analytics, **broker import** (MT4/5, cTrader, TradingView, Tradovate, NinjaTrader, Thinkorswim, IBKR, Webull, Binance, Bybit; fixtures are synthetic, not checked against real exports), **calendar**, **daily/weekly/monthly reviews**, **playbook**, multiple accounts (Free 1 / Standard 2 / Premium 10), **strategy comparison + manual backtest log (Premium)**, share links, public `/demo`, quick-log, screenshots (code built; per the build log the storage bucket exists and production has the Supabase URL + service key set, but an end-to-end upload on production is untested, and pricing still marks screenshots "in development").
- **Commerce:** monthly and **annual** plans (2 months free), **14-day trial**, signed Handypay webhook, **founding offer** (first 10 paying members, 50% off 12 months, auto-applied at checkout; live shows "10 of 10 seats left"), **partner program** (`/partners`, `?ref=code`, 30% of cash for 12 months, payable 30 days after payment, $25 minimum payout, CLI `scripts/affiliates.mjs`).
- **Not available (never advertise):** reminder emails (production has no `CRON_SECRET`), real broker auto-sync, replay/historical-data backtesting, AI summaries, screenshots until an end-to-end upload is verified, coaching, the group call (until section 6 is done).
- **Not proven:** a real Handypay payment/refund end to end; the discounted founding checkout in a real or test-mode purchase (docs say not yet verified; the billing e2e has one known founding-price failure); Sentry events; lawyer review of legal pages and the partner terms; Jamaica data-controller registration; Production Branch = `main` and branch protection.
**Offer rule:** advertise only what is built, written down and live. That covers the founding offer, annual plans, the trial and the partner program, **but verify the founding checkout with one real or test-mode purchase before you push it hard**, because it is the part flagged "not yet verified".

## 2. Tiers and the value to each person
| | Free | Standard $12 | Premium $24 |
|---|---|---|---|
| For | Curious beginner | Active trader who wants history, import and reviews | Wants to test ideas and compare strategies, multi-account |
| Gets | 50 trades, 1 account, dashboard, analytics, demo | 2,000 trades, broker import, calendar, reviews, playbook, 2 accounts, screenshots (when storage is on) | Unlimited trades, 10 accounts, strategy comparison, manual backtest log |
| Human value | Community, Journal Challenge | Reply < 24 h | Weekly Journal Review call (section 6), reply < 4 h, roadmap vote |
Premium already has real built value; the call is a bonus, not the only reason to buy.

## 3. Reverse funnel (assumptions to replace with real rates)
| Channel | Signups | Activated (logged a trade) | Paid conv. | Paid |
|---|---|---|---|---|
| Partners / communities (10 active) | 450 | 225 | 20% | 45 |
| Founder DMs + demos | 120 | 72 | 30% | 22 |
| Journal Challenge (1–30 Dec) | 200 | 110 | 15% | 16 |
| Organic content | 250 | 112 | 10% | 11 |
| Ads ($50–150) + referrals + annual upsell | 60 | 24 | 10% | ~6 |
| **Total** | **~1,080** | **~540** | | **~100** |
Weakest assumptions: 20–30% paid conversion and 10 partners at ~45 signups each. If either is half as good, expect about 50.

## 4. Work to do (in order)
1. **Verify money end to end:** one real (or test-mode) founding-price purchase, one normal purchase, one refund; confirm the plan switches automatically and the partner commission row appears. *Owner: founder buys; Claude reads the DB.*
2. **Owner list from `main` readiness** (plus `CRON_SECRET` in Vercel and GitHub Actions secrets for scheduled emails): Production Branch = `main`, branch protection, Sentry event check, lawyer review (Terms, Privacy, Subscription, Partners), Jamaica data-controller registration, screenshots bucket (`docs/OWNER_SETUP_STORAGE.md`).
3. **Verify imports with 2–3 real broker exports** (biggest credibility gap in the score).
4. Decide on reminder emails (build or remove the stub); keep them off the site until tested.
5. Small debts from `main`'s QA docs (accessibility pass, real-phone install test, timing on real Supabase).

## 5. Content, outreach, partners (see `DM_AND_VIDEO_PLAYBOOK.md`)
- **Content (~20%)**: 1–2 tablet-made shorts a day; link in bio `https://tradenotes.dev/?src=tt-organic` (`yt-organic`, `ig-organic`). Show the free `/demo` and real features; "SAMPLE DATA" on demos; no profit claims.
- **DMs (~25%)**: 20–25 a day on TikTok, tiered by intent; scripts in the playbook.
- **Partners (~40%)**: 40 outreach, aim for 10 active. **Decided 2026-11-14: keep the built program, 30% of cash for 12 months** (Standard $3.60/mo, Premium $7.20/mo; payable 30 days after payment; $25 minimum payout). The flat-10%-after-2-months idea is dropped; no code change needed.
- **Community (~15%)**: free Discord/WhatsApp group, 30-day Journal Challenge (consistency leaderboard, not P&L), Friday "you asked, we shipped" posts, replies < 2 h on launch days.

## 6. Premium weekly group call — premise (draft; publish on the pricing page only once these exist)
**Weekly Journal Review: bring your journal, leave with one rule for next week.** Process and psychology, not trade calls.
60 min: 5 product updates · 25 live review of 1–2 volunteer journals (opt-in; data shown only with permission) · 15 Q&A on process (risk per trade, tagging, expectancy, small samples) · 10 "one rule this week" commitments · 5 feedback.
Rules: educational only, not financial advice; no trade calls or personal recommendations; recordings only with consent; member data stays private.
Before selling it: fixed weekly time, a room/link, a one-page terms note, a cancellation/refund line, a 4-week plan.

## 7. Webinar → coaching funnel (yes, with conditions)
A free monthly public webinar can feed a coaching offer if: (1) coaching is written down first (scope, price, sessions, cancellation) and not mentioned until then; (2) it stays **process coaching** (journaling, risk rules, review routines, psychology), never trade calls or managing money: personalised trading advice can be regulated depending on where you and the client are, so get it checked in the same lawyer review; (3) no income or results claims, and check TikTok's rules before promoting trading coaching; (4) offer it only to people who have logged ≥30 trades or attended ≥3 reviews, capped at 5–10 spots.
Funnel: short video → free signup → free webinar (`?src=webinar`) → Premium review call → coaching (later). Confirm the free limits of your meeting/live tool before announcing a date.

## 8. Timeline and checkpoints
| Window | Focus | Checkpoint |
|---|---|---|
| 14–20 Nov | Money verified end to end, owner list, tablet video setup, 40 partner messages, DMs start | One successful purchase + refund; first tagged signups |
| 21 Nov–4 Dec | Real-export import check, Journal Challenge launches 1 Dec | **30 Nov: ≥60 signups, ≥10 trials or paid.** Under 25 signups = reassess before spending more |
| 5–20 Dec | Scale partners, challenge weeks 1–3, weekly Premium call starts | **15 Dec: ≥300 signups, ≥40 trials or paid** |
| 17 Dec | Last day to start a 14-day trial that converts by 31 Dec | Push founding price (no trial) and annual prepay for anyone ready |
| 21–31 Dec | Challenge graduation, personal follow-up to every activated free user | **31 Dec: 100 paid (50/50)** |

## 9. Open decisions
1. ~~Partner commission~~ decided: keep the built 30% for 12 months.
2. Count trials or only paid as "subscribers".
3. Premium call time and terms (section 6).
4. Verify the founding checkout (one test purchase) before promoting it.
5. Instagram stays parked until its issue is fixed; TikTok + YouTube only.

## 10. Daily scoreboard (Supabase SQL editor; test accounts excluded)
```sql
select coalesce(p.signup_source,'(none)') as source,
       count(*) as signups,
       count(*) filter (where exists (select 1 from tradenotes.trades t where t.user_id = p.id)) as activated,
       count(*) filter (where s.plan = 'starter' and s.status = 'trialing') as standard_trial,
       count(*) filter (where s.plan = 'starter' and s.status = 'active')   as standard_paid,
       count(*) filter (where s.plan = 'pro' and s.status = 'trialing')     as premium_trial,
       count(*) filter (where s.plan = 'pro' and s.status = 'active')       as premium_paid
from tradenotes.profiles p
join public.tn_user u on u.id = p.id
left join tradenotes.subscriptions s on s.user_id = p.id
where u.email not like '%@e2e.test' and u.email not like '%@resend.dev'
group by 1 order by 2 desc;
```
Also log daily: videos, views, DMs sent/replies, partner messages/active partners, calls held, response times, bugs.

## 11. Email and the path to 8.0
- **Email marketing / lifecycle plan:** `EMAIL_LIFECYCLE_PLAN.md`. Email turns free signups into activated and paying members; it doesn't create signups. Production has Resend configured but no `CRON_SECRET`, so scheduled emails are off. Build order: consent + tables, lifecycle cron, sequence templates, `/challenge` capture page.
- **6.5 → 8.0 (industry-specific score):** `ROADMAP_TO_8.md`. Every scorecard row must hit its target (+1.62 weighted); order: real broker exports, screenshots end to end, reminders/goals/journal, then the smaller rows. Items that also help revenue first.
- **Discord community (journal, discipline, guided execution):** `DISCORD_COMMUNITY_PLAN.md`. Own server + own bot (slash commands over HTTP on the current Vercel project), 30-day Challenge from 1 Dec; process coaching only.
- **HQ platform (hq.tradenotes.dev, planned):** `HQ_PLATFORM_PLAN.md`; visual roadmap `docs/hq/roadmap.html`. v1 is read-only (goal tracker, funnel by source, payments panel, stuck users).
- **Can a customer pay today and get what we say?** `PAYING_CUSTOMER_AUDIT.md`: features mostly yes; the money path has never run for real, so do one purchase + refund first.
- Add to the daily scoreboard once built: first-trade-within-3-days rate, email clicks per template, unsubscribe rate.

## 12. Who does what
**Claude:** builds and verifies product/billing items, drafts scripts, DMs and partner pitches, runs the scoreboard, keeps this doc current, and checks `main` before claiming anything is or isn't built. **Founder:** records and posts, sends DMs and partner messages, holds the calls, approves every public claim, does the owner list (purchases, legal, registrations).
