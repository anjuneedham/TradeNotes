# HQ — 100 paying members by 31 Dec 2026
Written 2026-11-14 (47 days out). This is the operating framework. Everything else in `docs/` is reference; this is what we run.

## 0. The target, stated honestly
| | Count | Price | MRR at full price |
|---|---|---|---|
| Standard (= `starter`) | 50 | $12/mo | $600 |
| Premium (= `pro`) | 50 | $24/mo | $1,200 |
| **Total** | **100** | | **$1,800** (≈$1,080 if all on a 40% launch discount) |

**Starting point (2026-11-14):** 0 real signups, 0 paying, ~100 total video views. (The 3 accounts in the DB were automated tests.)
**Reality check:** content alone cannot do this. 100 payers needs roughly 1,000 signups and ~550 people who actually log a trade. The only way to reach that in 47 days is **partners/communities + founder-led selling + a community event**, with content as the proof layer. Treat 100 as a stretch goal and use the checkpoints in section 8 to know by 1 Dec whether it is real. Hitting 30–50 is still a good outcome and sets up January.

## 1. Reverse-engineered funnel (assumptions, not predictions — replace with real rates as data arrives)
Paid = Standard + Premium. "Activated" = signed up AND logged ≥1 trade.

| Channel | Signups | Activated | Paid conv. of activated | Paid |
|---|---|---|---|---|
| Partners / affiliates / communities (10 active partners) | 450 | 225 (50%) | 20% | 45 |
| Founder DMs + demo calls | 120 | 72 (60%) | 30% | 22 |
| 30-day Journal Challenge (community + referrals) | 200 | 110 (55%) | 15% | 16 |
| Organic content (TikTok / Shorts / Reels) | 250 | 112 (45%) | 10% | 11 |
| Paid ads ($50–150) | 60 | 24 (40%) | 10% | 3 |
| Referral + annual-prepay upsell | — | — | — | 3 |
| **Total** | **~1,080** | **~540** | | **~100** |

The weakest assumptions are the 20–30% paid conversion on warm channels and 10 partners delivering ~45 signups each. If either is half as good, we land near 50. That is why partners start on day 1.

## 2. What each tier must deliver (value per person)
Rule: **never sell a feature that does not exist** (see `CONTENT_ENGINE.md`). Backtesting is "coming", never the reason to buy.

| | Free | Standard $12 | Premium $24 |
|---|---|---|---|
| Who | Curious beginner | Serious logger who wants less friction | Wants accountability and faster improvement |
| Core | 50 trades, 1 account, dashboard + explanations | 2,000 trades, **CSV import**, 2 accounts, trade edit, calendar, mistake-cost report | Unlimited trades, 10 accounts, weekly auto-review, everything in Standard |
| Human value | Community access, Journal Challenge | Reply < 24 h, community | **Weekly 60-min group review with the founder**, reply < 4 h, vote on roadmap, early access to backtesting beta when it exists |
| Why upgrade | Hits the 50-trade cap or wants import | Stops hand-typing trades; sees what mistakes cost | Wants someone who trades to look at their journal weekly |
Capacity check: one weekly group call serves 50 Premium; 15 min/month personal check-ins would be ~12 h/month, so keep those optional.

## 3. Product work, in dependency order
1. **Gates before first payment** (from `READINESS_REVIEW.md`): domain `tradenotes.dev`, Resend email (verification + reset), legal placeholders filled, Vercel Pro, Sentry, one real Handypay payment + manual activation tested. *Owner: founder for purchases/legal; Claude wires code.*
2. **CSV import UI** (IMP-1) — the first real reason to pay for Standard. Code + tests already exist.
3. **Trade edit + delete confirmation**, **calendar view**, **mistake-cost report** — Standard value and the content hook.
4. **Weekly review** (auto-generated summary) — Premium anchor and retention.
5. **Admin scoreboard page** (ADM-1) — the SQL in section 9 as a page, so HQ is one click.
6. **Billing automation** (BILL-1): 100 manual activations plus renewals is a daily chore. Get Handypay webhook docs; until then reconcile every day (10 min).
7. Backtesting stays after 31 Dec unless a data licence appears.

## 4. Content (proof layer, ~20% of effort)
- Cadence from `CONTENT_ENGINE.md` (3 TikToks + 2 Shorts/day from one weekly record session). Tag every bio link: `?src=tt-organic`, `yt-organic`, `ig-organic`.
- Priority formats now: F2 "log a trade with me" (shows the product), F3 "mistake of the week", F4 build log. Add one format: **"Journal Challenge day N"** from 1 Dec.
- Every video ends on the same CTA: free journal, link in bio. No profit claims; "SAMPLE DATA" label on demos.
- Judge by signups per video, not views. Double down on the top 2 formats after 10 posts each.

## 5. Partners, affiliates, communities (~40% of effort)
- **Targets:** 40 outreach → 10 active. Small trading YouTubers/TikTokers (1–20k), forex/prop-firm Discords and WhatsApp groups, trading mentors with paying students, Caribbean/Jamaica trading communities.
- **Offer:** (a) free Premium for the partner, (b) unique link `?src=aff-<name>`, (c) 30% recurring commission or $10 per paying member, (d) a free "group Journal Challenge" for their members. Paid by hand until tracking is automated.
- **Ask:** one video or one community post plus the Challenge invite. Give them ready-made assets (screenshots, 3 captions, a 30-s demo).
- **Rules:** disclose the affiliate relationship; no income claims; no fake reviews.
- **Weekly target:** 10 partner messages/day in week 1, then 5/day follow-ups.

## 6. Founder sales (~25%)
- 20–30 personalised DMs/day (TikTok, YouTube comments, Instagram when it is back) using `SALES_PLAYBOOK.md`. Comment first, then DM. One follow-up on day 3, then stop.
- Every signup gets a personal message within 2 hours, and a 10-min onboarding call offered to everyone in the first 100.
- **Close:** once someone has logged trades, offer the December cohort price.
- **Offer (needs founder decision):** "December cohort: first 100 members get 40% off for 12 months, locked in." The cap must be real. The existing founding offer (10 seats, 50% off) can stay as the top tier.
- Annual prepay (25% off) gets cash early. Needs Handypay annual links.

## 7. Community, feedback, responsiveness (~15%)
- **Community:** one free Discord or WhatsApp group. Pinned: rules, "not financial advice", how to log a trade. Premium gets a private channel plus the weekly call.
- **30-day Journal Challenge (1–30 Dec):** log every trading day; daily prompt; leaderboard of **consistency, not P&L**; day-30 graduation post with the upgrade offer. This is acquisition, activation, content and community in one mechanic.
- **Responsiveness SLA:** signup welcome < 2 h (launch hours), questions < 24 h Free/Standard, < 4 h Premium. Bugs acknowledged same day.
- **Feedback loop:** the two questions in `SALES_PLAYBOOK.md` at day 3 and day 10; a "You asked, we shipped" post every Friday; tag every request in the sheet; the top 3 requests get built first. No testimonial without written permission.

## 8. Timeline and checkpoints
| Window | Focus | Checkpoint (real, tagged users only) |
|---|---|---|
| 14–20 Nov | Gates, CSV import, landing screenshots, partner outreach starts, tagged links live | Domain + email + one real test payment done; 40 partner messages sent |
| 21 Nov–4 Dec | Founding beta, first 30 users onboarded personally, calendar + weekly review, Challenge launches 1 Dec | **30 Nov: ≥60 signups, ≥10 paid.** Under 25 signups = plan is off track; reassess partners and offer before spending more |
| 5–20 Dec | Scale partners, Challenge weeks 1–3, weekly Premium call starts | **15 Dec: ≥300 signups, ≥40 paid** |
| 21–31 Dec | Challenge graduation, last-week cohort pricing, personal follow-up to every activated free user | **31 Dec: 100 paid (50/50)** |

## 9. Daily scoreboard (run in the Supabase SQL editor; test accounts excluded)
```sql
-- signups, activation and paid by source and plan
select coalesce(p.signup_source,'(none)') as source,
       count(*) as signups,
       count(*) filter (where exists (select 1 from tradenotes.trades t where t.user_id = p.id)) as activated,
       count(*) filter (where s.plan = 'starter' and s.status = 'active') as standard,
       count(*) filter (where s.plan = 'pro' and s.status = 'active') as premium
from tradenotes.profiles p
join public.tn_user u on u.id = p.id
left join tradenotes.subscriptions s on s.user_id = p.id
where u.email not like '%@e2e.test' and u.email not like '%@resend.dev'
group by 1 order by 2 desc;
```
Also log by hand each day: videos posted, views, DMs sent/replies, partner messages/active partners, calls held, support response times, bugs, payments (confirm in Handypay before activating; match payer email to signup email).

## 10. Who does what
- **Claude:** ships the product work in section 3, drafts scripts/DMs/partner pitches/assets, runs the scoreboard, writes the Friday changelog, keeps this doc current.
- **Founder:** records content, sends DMs and partner messages, holds onboarding/Premium calls, approves every public claim, buys domain/Vercel Pro/legal review, activates payments until BILL-1.

## 11. Open decisions
1. December cohort price and cap (suggested: 40% off for 12 months, first 100).
2. Premium includes the weekly group call (suggested yes, it is the only Premium value we can deliver now).
3. Affiliate payout: 30% recurring vs $10 flat.
4. Handypay: annual links, discount coupon and webhook docs.
5. Instagram: parked until the account issue is fixed; TikTok + YouTube only for now.
