# HQ platform plan (hq.tradenotes.dev)
Written 2026-11-14. HQ is the owner's internal growth and operations platform. It exists to answer one question each morning: **what do I do today to get the next paying member?** It is not a customer product.
The visual roadmap is `docs/hq/roadmap.html` (open it in a browser; it should become HQ's home page). It is also published as a private Claude artifact.

## 1. Goals it serves
| Stage | Target | What HQ must make easy |
|---|---|---|
| 100 | 50 Standard + 50 Premium by 31 Dec 2026 | Know the funnel by source every day; catch stuck or failing payments within hours; run DM, partner and email work from one place |
| 250–500 | Repeatable channels, early 2027 | Cohort retention, cost per paying member by channel, partner payout automation |
| 1,000 | A pace chosen on purpose: ~21% monthly growth reaches it in 12 months, ~47% in 6 (assumption, not a forecast) | Churn, LTV vs CAC, capacity alerts (email/db limits, support load) |
At 1,000 members you need about 30–50 new members a month just to hold the number (3–5% monthly churn, assumption). HQ should show churn from day one so that this is never a surprise.

## 2. Hosting and access (decision needed)
**Recommended:** same repo, same Vercel project, host-based routing. Add `hq.tradenotes.dev` as a domain on the existing project (DNS is already managed by Vercel), serve `/hq/*` only for that host, and require `is_admin` (the column already exists) on the server for every route and action. One codebase and one database, so v1 is days, not weeks.
**Alternative:** a separate Vercel project and repo for HQ. Cleaner isolation, more setup, a second deploy to keep healthy. Choose it only if you plan to give contractors HQ access soon.
**Rules either way:**
- Owner sign-in only (Better Auth, `is_admin`), no public pages, no indexing.
- v1 is **read-only**. Use a dedicated read-only database role limited to the aggregate views HQ needs.
- HQ never shows a member's trades, notes, screenshots or account balances. It shows counts, stages, dates, plan and source.
- No card or payment secrets are stored or displayed; Handypay stays the system of record for money.
- Do not add the domain until the `/hq` routing and the admin check exist, otherwise the public marketing site would appear at hq.tradenotes.dev.
- Update the Privacy Policy to say the owner can see account-level metadata for support and billing.

## 3. What HQ should have
**v1 (read-only, build first):**
1. Goal tracker: paying members vs 100, days left, Standard/Premium split, monthly revenue, trials in progress. Checkpoints (30 Nov: 60 signups and 10 trials or paid; 15 Dec: 300 and 40).
2. Funnel by source: signup → logged a trade → trial → paid, using `signup_source` and partner `ref` codes. Excludes test accounts.
3. Payments panel: failed payments, trials ending in 4 days, **paid but still on Free**, webhook errors, founding seats left.
4. Stuck users: signed up but no trade after 2 days, with the step they stopped at (account-level, no trade data).
5. Roadmap page (`docs/hq/roadmap.html`).
**v2 (after the first 20 members):**
6. DM log and tiers (handle, tier, replied, interested, signed up); partner pipeline (the `affiliates` table plus outreach status); content results per video (views, link clicks, signups by `?src=` tag).
7. Email stats once the lifecycle emails exist (sent, clicked, unsubscribed).
8. Experiment log: what changed, date, what moved.
**v3 (toward 1,000):** cohort retention and churn, LTV vs CAC by channel, partner payout run, support inbox view, alerts (daily email cap, database size, Sentry spikes).

## 4. What HQ should not have
Member trade data of any kind; edit/delete on customer records; automatic messages to customers without review; vanity charts that lead to no decision; anything that makes a claim about a feature that does not exist; public access; paid tools you don't need yet.

## 5. What the customer-facing app should and shouldn't have to convert
**Should:** a free demo (exists), honest pricing, the 14-day trial, a very fast first trade, import that works on real files, a clear "what you get for paying" (exists), real social proof only when real (never invented counts or testimonials), fast support replies, visible cancellation terms.
**Shouldn't:** profit claims, fake urgency (the founding seat counter is real; keep it real), features advertised before they work, hidden renewals, asking for a card on the free plan, popups, or anything that treats a free user like a lead before they've logged a trade.
See `PAYING_CUSTOMER_AUDIT.md` for what is and isn't proven today.

## 6. Data HQ needs (existing vs new)
Existing: `profiles.signup_source`, `subscriptions` (plan, status, period, founding), billing events, `affiliates` and referrals, trades (counts only), `profiles.review_reminders`.
New (small): `hq_dm_log`, `hq_content_posts`, `hq_experiments`, `email_events`, `challenge_signups` (see `EMAIL_LIFECYCLE_PLAN.md`). Each new table gets row-level security so that only the owner role can read it.

## 7. Build tickets
HQ-1 plan + hosting decision (this doc) · HQ-2 admin check + `/hq` host routing + read-only role · HQ-3 goal tracker + funnel + payments panel + stuck users · HQ-4 roadmap page · HQ-5 pipelines · HQ-6 email stats · HQ-7 cohorts/churn/LTV. Each ticket must pass `npm test`, `npm run lint`, `npx tsc --noEmit` and the database checks, and gets a QA note like the earlier phases.

## 8. Decisions for the owner
1. Same project with host routing (recommended) or a separate project.
2. Who besides you may ever sign in to HQ.
3. The pace for 1,000 (12 months at ~21% a month, or faster), and the date you want to hold yourself to.
4. Whether HQ v1 should also show a live view of daily DM and content activity (needs manual entry), or start with the automatic money and funnel numbers only.
