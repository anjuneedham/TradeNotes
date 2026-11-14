# HQ — 100 paying members by 31 Dec 2026
Written 2026-11-14 (47 days out). This is the operating framework. Everything else in `docs/` is reference; this is what we run.

## 0. The target, stated honestly
| | Count | Price | MRR at full price |
|---|---|---|---|
| Standard (= `starter`) | 50 | $12/mo | $600 |
| Premium (= `pro`) | 50 | $24/mo | $1,200 |
| **Total** | **100** | | **$1,800** at the listed prices. No discounts exist (see section 12) |

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
| Human value | Community access, Journal Challenge | Reply < 24 h, community | **Weekly 60-min group review with the founder**, reply < 4 h, vote on roadmap, early access to backtesting beta when it exists. **None of this is built or written yet: do not advertise it until section 13 is done** |
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
Craft and targeting details: `DM_AND_VIDEO_PLAYBOOK.md` (high-intent DM tiers, voice-over drill, tablet-only free editing workflow).
- Cadence from `CONTENT_ENGINE.md` (3 TikToks + 2 Shorts/day from one weekly record session). Tag every bio link: `?src=tt-organic`, `yt-organic`, `ig-organic`.
- Priority formats now: F2 "log a trade with me" (shows the product), F3 "mistake of the week", F4 build log. Add one format: **"Journal Challenge day N"** from 1 Dec.
- Every video ends on the same CTA: free journal, link in bio. No profit claims; "SAMPLE DATA" label on demos.
- Judge by signups per video, not views. Double down on the top 2 formats after 10 posts each.

## 5. Partners, affiliates, communities (~40% of effort)
- **Targets:** 40 outreach → 10 active. Small trading YouTubers/TikTokers (1–20k), forex/prop-firm Discords and WhatsApp groups, trading mentors with paying students, Caribbean/Jamaica trading communities.
- **Offer:** (a) unique link `?src=aff-<name>`, (b) 10% commission on each referred paying member, released after the member has paid for 2 months (draft terms in section 15), (c) a free "group Journal Challenge" for their members. A free Premium account for the partner is **not** offered until Premium exists in writing (section 13). Paid by hand until tracking is automated.
- **Ask:** one video or one community post plus the Challenge invite. Give them ready-made assets (screenshots, 3 captions, a 30-s demo).
- **Rules:** disclose the affiliate relationship; no income claims; no fake reviews.
- **Weekly target:** 10 partner messages/day in week 1, then 5/day follow-ups.

## 6. Founder sales (~25%)
- 20–30 personalised DMs/day (TikTok, YouTube comments, Instagram when it is back) using `SALES_PLAYBOOK.md`. Comment first, then DM. One follow-up on day 3, then stop.
- Every signup gets a personal message within 2 hours, and a 10-min onboarding call offered to everyone in the first 100.
- **Close:** once someone has logged trades, point them to the plans at the listed prices. **No discount, founding or cohort offer exists** (section 12).
- Annual prepay is not available (no Handypay annual links); don't mention it.

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

## 11. Open decisions (current)
1. ~~December cohort / founding offer~~ withdrawn 2026-11-14 (section 12).
2. Premium weekly group call: confirmed by founder; premise and terms in section 13 still to be agreed and published.
3. Affiliate: 10% per paying member after 2 months (section 15); confirm the open questions there.
4. Handypay: annual links, discount coupon and webhook docs (needed before any discount or annual plan).
5. Instagram: parked until the account issue is fixed; TikTok + YouTube only for now.

## 12. Offer rule (set 2026-11-14)
**Nothing is advertised, DM'd, posted or put on the site unless it is (1) built and working, and (2) written down (price, what is included, terms, how to cancel).** Today that means: Free, Standard ($12) and Premium ($24) at listed prices, Handypay checkout, manual activation. Not available: founding offer, discounts, cohort pricing, annual plans, backtesting, CSV import, calendar, weekly review, group call, coaching, affiliate payouts. The founding banner and the "test changes before you risk money" line were removed from the code on the dev branch (they go live when it is deployed).

## 13. Premium weekly group call — premise (draft, to agree before selling)
**Name:** Weekly Journal Review. **Premise:** "Bring your journal, leave with one rule for next week." It is a process and psychology session about reading your own data, not a trade-calling room.
**Format (60 min, same time weekly):** 5 min product updates ("you asked, we shipped") · 25 min live review of 1–2 volunteer journals on screen (the member opts in; data shown only with their permission) · 15 min Q&A on process (risk per trade, tagging, expectancy, small samples) · 10 min "one rule for this week" commitments in chat · 5 min feedback.
**Rules to write down:** educational only, not financial advice; no trade calls, signals or personal recommendations on what to buy or sell; recordings only with announced consent; members' data stays private; the founder may decline requests that drift into advice.
**Before selling it, you must have:** a fixed weekly time, a link/room, a one-page terms note, a cancellation/refund statement, and a plan for the first 4 weeks (even if attendance is 3 people). Once it exists, add it to the Premium row on the pricing page, not before.
**Capacity:** one session serves all Premium members; keep 1:1 sessions out of Premium.

## 14. Webinar as a funnel for coaching (can you? yes, with conditions)
**Yes, a free monthly public webinar can feed a paid coaching offer.** The conditions:
1. **Coaching has to be built and written first:** scope, price, number of sessions, what you will and won't do, cancellation. Until then the webinar only promotes the free journal and the Journal Challenge. No coaching mention.
2. **Keep it process coaching** (journaling habits, risk rules, review routines, psychology), not "I'll tell you what to trade" or managing money. Personalised trading advice can be a regulated activity depending on where you and your client are. I can't tell you the rules for your case: get it checked (the same lawyer review the Terms need) before selling coaching.
3. **No income or results claims** in the webinar, the invite or the offer. The platform rules (TikTok especially) are stricter for trading-coaching ads than for software; don't pay to promote coaching without checking them.
4. **Earn the right to offer it:** only offer coaching to people who have logged trades (e.g. ≥30) or attended ≥3 reviews, and limit it to a small number of spots you can actually serve (5–10).
**Funnel:** TikTok/Shorts → free signup → free monthly webinar "Find the mistake costing you the most" (needs signup to attend, tag `?src=webinar`) → Premium weekly review → (later, once written and reviewed) apply for coaching.
**Tools:** pick a free option and confirm its limits yourself (a free video-meeting plan, or YouTube Live) before announcing a date.

## 15. Partner commission — draft terms (not live until written and tracking works)
**What was set:** 10% per paying customer, after 2 months.
**My reading (confirm):** the partner earns 10% of each payment from the members they referred, and it is released once that member has completed 2 paid months (this filters refunds and quick cancellations). Tracked by the `?src=aff-<name>` tag saved at signup; payouts by hand until automated.
**Open questions:** recurring for as long as the member pays, or only the first N months? Payout day and method? Excluded: refunds/chargebacks. Partner must disclose the relationship.
**Honest economics:** 10% of $12 is $1.20/month; of $24 is $2.40/month. A partner who brings 10 members earns $12–24 a month. That is a weak cash incentive on its own, so expect partners to join for the audience value (free Challenge for their members, co-created content) more than the money. This lowers the 45 payers the partner channel assumes in section 1; treat that number as optimistic and rely more on your own DMs and the Challenge until partners prove otherwise.
