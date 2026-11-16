# Session log

One entry per working session, newest first. Each entry records what was asked, what was found (with evidence), what changed, test data left behind, and what is still open. Longer build notes stay in `docs/BUILD_LOG.md`.

---

## 2026-11-16 (later still): Merge funnel pages; src capture coverage

**Asked:** merge the funnel pages and memo to main; add `?src` capture at signup.

### Found
- `?src=` capture already existed: `src/middleware.ts` sets the `tn_src` cookie (first tag wins, 30 days) and `src/lib/app-context.ts` saves it to `tradenotes.profiles.signup_source` at first sign-in. The funnel agent's report that signup does not read `src` was wrong.
- Real gap: the middleware matcher did not cover the new routes, so a first-touch tag on a direct landing (e.g. `/prop-firm-traders?src=tt-dm`) was dropped and the on-site CTA tag (`?src=prop-firm-traders`) became the source.

### Changed
- `src/middleware.ts` matcher now includes `/prop-firm-traders`, `/features`, `/import`, `/compare`, `/how-it-works`, `/changelog` (and their subpaths).

### Test data left behind
None.

### Still open
- Check `signup_source` on the next real signup (`select signup_source from tradenotes.profiles`).
- Competitor prices on `/compare` are dated 2026-11-16; re-check before quoting.

---

## 2026-11-16 — Marketing funnel pages

- **Asked:** build funnel pages (prop-firm landing, feature, import, compare, how-it-works/FAQ, changelog, learn guides) with attributable CTAs and cross-links; add docs/PAGE_BRIEF_TEMPLATE.md.
- **Found:** homepage dead-ended (analytics: 62 of 73 views on `/`). Signup page does not read `?src` (auth code, not touched), so attribution relies on page-view analytics of `/signup?src=…` URLs.
- **Changed:** `src/lib/marketing.ts` (data), `src/components/Funnel.tsx` (CTA, next steps, page frame), routes `/prop-firm-traders`, `/features`(+7), `/import`(+11), `/compare`(+5), `/how-it-works`, `/changelog`, `/learn/[slug]`(3 guides); footer hub links, nav links, homepage next-steps, learn hub categories, sitemap via `FUNNEL_PATHS`.
- **Evidence:** competitor prices fetched 2026-11-16 from TradeZella, Edgewonk, TradesViz pricing pages. TraderSync (403) and Tradervue (404) could not be read, so no facts are stated for them. tsc, eslint, vitest (349 passed), build OK.
- **Test data left:** none.
- **Open:** record `src` at signup (needs auth code change, owner decision); re-check competitor prices periodically.

## 2026-11-16 (later): Paid-features rework memo (Fable agent)

**Asked:** why the industry score is 6.7; have Fable rework the paid features; can news, full replays and broker connections be built or run on free infrastructure.

### Found
- The 6.7 is the weighted scorecard in `docs/READINESS_REVIEW.md`; every row is below target (capture 6, review 6.5, visual evidence 3-4, accounts 7).
- Research is in `docs/decisions/PAID_FEATURES_REWORK.md` (written by a Fable subagent; web research only, nothing prototyped, no vendor contacted). Several claims are marked unverified in its section H (Finnhub, FMP, Forex Factory and Tradovate pages could not be opened; MetaApi, Twelve Data, Massive, Trading Economics prices conflict between sources).

### Changed
- Added `docs/decisions/PAID_FEATURES_REWORK.md` and this entry. No application code changed.

### Test data left behind
None.

### Still open
- Owner decisions listed in the memo; verify its unverified claims before spending money.
- `FEATURE_ROADMAP.md` and `UNIT_ECONOMICS.md` are stale against the memo.

---

## 2026-11-16: Free plan 30 trades, founding offer 100 seats; distribution plan; merge

**Asked:** a zero-budget plan to reach 1,000 free and 100 paying users in 45 days (prop-firm focus); daily 8-hour routine; check new signups; explain the HandyPay webhook/API; change Free to 30 trades and the founding offer to 100 seats; merge to main; updated ratings.

### Found
- Production database (Supabase, read-only SQL, 2026-11-16): 5 accounts, of which 1 is real (signed up 2026-11-15, email confirmed, 0 trades, Free); the other 4 are test accounts (`delivered@resend.dev` "Resend Test", two `@e2e.test`, one other test address). 2 trades, 0 paid subscriptions, 0 payments, 1 `billing_events` row, 0 affiliates, 0 referrals.
- HandyPay API and signed webhook are in `origin/main` (`src/app/api/webhooks/handypay/route.ts`, `src/lib/billing/webhook.ts`); partner programme, import, coach and founding-seat counter also exist. My first answers this session described an old checkout-links-only commit because the session started on a stale branch (`5a603e1`); that work was discarded and redone on `origin/main`.

### Changed
- `src/lib/plans.ts`: `PLANS.free.tradeLimit` 50 to 30; `FOUNDING_OFFER.seats` 10 to 100. Pricing page, founding counter and server-side limit read these.
- Copy: "50 trades" to "30 trades" and "first 10" to "first 100" in the lead form, the R-multiple article, the legal subscription policy, outreach/DM/affiliate scripts, HQ, business plan and design docs. Older decision/design memos that record what was decided at the time were left as written.
- Tests: `trade-schema.test.ts`, `founding.test.ts`, `founding.db.test.ts` (105 claims, 100 seats), `scripts/e2e.js`, `scripts/e2e-billing.js` (seed 30; quick-log seed 28), `scripts/legal-to-md.py`.
- Verification: unit tests 349 pass, 4 skipped (DB tests); `tsc` and `eslint` clean. **Not run:** the browser e2e scripts, `founding.db.test.ts` and `e2e-billing.js` (need the app and a test database).

### Test data left behind
None created. Existing test accounts in production were NOT deleted (offered; awaiting the owner's yes): `delete from public.tn_user where email = 'delivered@resend.dev' or email like '%@e2e.test';`.

### Still open
- Owner: existing Free users with more than 30 trades keep their data but cannot add more; check no real user is affected before announcing.
- Run `scripts/e2e.js`, `scripts/e2e-billing.js` and the founding DB test in CI or locally.
- Real first payment seen as `applied:` in `billing_events`; `ANTHROPIC_API_KEY`; Discord bot branch (`ccr-f1bf506c-8tg7lm`) not merged.
- Reply to the one real signup; resend nothing (the Nov 12 unconfirmed account was Resend's test address).

---

## 2026-11-15 (later): Paid-plan build: AI Coach, Score, insights, pricing; coach limits; merge

**Asked:** review traffic; make paid plans clearly worth paying for (inspired by, not copying, paid journals); add an AI coach to the $24 plan; remove "Plain terms"; coach allowance of US$2 (Standard) and double for Premium; frame the coach with attractive limits per tier; merge; instructions to turn Claude credits into API credits; rate the app.

### Found
- Traffic (Vercel Web Analytics): 0 visitors until 2026-11-12, then 10, 14, 17, 13 a day (about 54 visitors, 73 views); 62 of 73 views on `/`, one visitor through signup and onboarding. Runtime errors: a one-off burst on 11-12 (edge `crypto`), none since.
- Production database (Supabase, read-only queries): 5 users, 2 trades, 3 free subscriptions, 0 paid, 1 `billing_events` row (`checkout.session.expired`, `ignored:no-matching-user`), 21 tables before this change. `HANDYPAY_API_KEY`, `HANDYPAY_WEBHOOK_SECRET`, `RESEND_API_KEY` set in Vercel production; `ANTHROPIC_API_KEY` not set.
- Legal config already filled (business name, support email, address, refund 14 days, `counselReviewed: true`); `npm run check:legal` passes.
- Claude plan credits can't be spent on the API, but Max ($100), Ultra ($200) and Team seats include monthly API credits that are linked to a Console org (help.claude.com article 17154008). Details in `docs/AI_COACH_SETUP.md`.
- My first attempt this session (on the old branch) was built on a main 90 commits behind and was discarded; everything was redone on `origin/main`.

### Changed
- AI Coach (`src/lib/coach.ts`, `src/app/app/coach/*`, `src/components/CoachChat.tsx`): Sonnet 5.5 agent with 4 read-only tools over the user's own results (RLS); cost metered per question in micro-dollars from the tokens the API reports; monthly dollar caps in `PLANS.*.aiBudgetCents`: Free 5 cents (3 questions, a taste), Standard 200 (about 130), Premium 400 (about 260); UI shows "about N of M questions left" and a tier-aware upgrade link; refusal fallback on.
- DB `db/paste/18_ai_coach.sql` (`tradenotes.ai_messages`, RLS, append-only for clients); `migrate.mjs` expects 27 tables; `verify-db.mjs` adds coach isolation and append-only checks (81 pass locally).
- TradeNotes Score and ten automatic insights (`src/lib/insights.ts`, `src/components/PerformancePanel.tsx`), on the dashboard and the public demo; Free sees 1 insight and a blurred score preview, Standard the score and 3 insights, Premium all.
- Pricing: "Plain terms" removed; cards list what each tier adds; FAQ no longer says activation is manual and explains the coach questions; comparison rows for coach, score, insights. Nav: AI Coach added (Calendar moved to More on phones). Privacy policy names Anthropic. Motion utilities in `globals.css`.
- Tests: 349 pass (insights, score, coach tools, cost metering, question counts). Production build passes. Browser run against a fake Claude API: Free, Standard, exhausted allowance, mobile, no page errors.

### Test data left behind
Local only: Postgres databases `tn_paste`, `tn_main` in this sandbox (several throwaway users). **Nothing written to production** (production access was read-only SQL).

### Still open
- Owner: add `ANTHROPIC_API_KEY` (see `docs/AI_COACH_SETUP.md`); link Max/Ultra credits or buy credits; make one real payment and confirm `billing_events` shows `applied:`.
- After 20 real coach questions, check `cents_per_question` and adjust `AI_QUESTION_COST_CENTS`.
- DMARC record for `tradenotes.dev`; real broker exports for the importers; coach and Score not checked on a real phone.

---

## 2026-11-15: Paywall, distribution bottleneck, email check, homepage screenshot

**Asked:** build a Superwall paywall; find the distribution bottleneck; confirm email works; add a product screenshot; document every session from now on. Founder reports the first 2 videos got little response.

### Found
- **Superwall can't gate TradeNotes yet.** The Superwall project has iOS and Android apps (`com.tradenotes.app`) and a `pro` entitlement. Both are marked not integrated. There are no products or paywalls, and Stripe isn't connected. TradeNotes is a website that takes payments through Handypay; Superwall needs a native app or Stripe web checkout. No paywall was built.
- **No real users yet** (checked 2026-11-15 ~07:00 UTC). The production database had 3 accounts, all tests: two `@e2e.test` and one Resend test address. No signups came from the first 2 videos, and there are no payments.
- **tradenotes.dev is live.** `/`, `/pricing`, `/signup` and `/demo` return 200. `www.tradenotes.dev` did not respond.
- **Email works.**
  - `RESEND_API_KEY` and `EMAIL_FROM` are set in Vercel production, and signup now requires email confirmation.
  - The founder received the HTML "Confirm your email" message. The link led to onboarding, then to Log a trade (screenshots shared in chat).
  - My own test, sent to a Gmail `+alias`, didn't show up through the Gmail connector. That was a mistake in how I checked, not a fault in the site.
  - Still worth adding: a DMARC record (`_dmarc.tradenotes.dev` has none), which helps keep mail out of spam.
- My session branch started 90 commits behind `main`. The work was redone on top of `origin/main`.
- Signup attribution already exists: `?src=` on any page is stored in `profiles.signup_source`.

### Changed
- Homepage (`src/app/(marketing)/page.tsx`): added a real screenshot of the full `/demo` dashboard (`public/screenshots/demo-dashboard.webp`, taken from production) below the hero. It's labelled as sample data and links to `/demo`. No horizontal scroll at 1280px or 390px. Lint and typecheck pass.
- Added this log, and a rule in `CLAUDE.md` to update it every session.

### Changed (later the same day): SEO + email list
- **Article 1** `/learn/r-multiple-prop-firm-challenge`: R-multiple explained for prop firm challenges, with two calculators (one trade's R; challenge target and limits in R), worked forex and futures examples, FAQ + Article JSON-LD. Angle chosen from a web search showing prop-firm journaling as the current topic in this niche (Semrush had no API units).
- **Email list**: new table `tradenotes.leads` (`db/paste/17_leads.sql`; owner-only, RLS on, no grants, like the affiliate tables; checks added to `verify-db.mjs`, now 26 tables, 78 checks pass locally). `LeadForm` with consent checkbox and honeypot; `/free/unsubscribe?t=` page. Privacy policy updated.
- **Free products**: `/free` (journal template CSV) and `/free/review-checklist`.
- `?src=` attribution now also runs on `/learn/*`, `/free*` and `/demo*` (it didn't before, so tagged links to the demo were not tracked).
- Plans: `docs/CONTENT_CALENDAR.md` (3/week queue), `docs/DIGITAL_PRODUCTS_PLAN.md`, `docs/OUTREACH_TEMPLATES.md` + `docs/OUTREACH_TRACKER.csv`.
- Verified locally: pages 200 at 1280/390 with no horizontal scroll, calculator output, lead saved with source tag, CSV download, unsubscribe page; typecheck, lint, 330 unit tests pass.
- Not built yet: sending emails to the list (plan says start at ~25 emails).

### Test data left in production
- Account `anjuneedham+tntest1794725746@gmail.com` (unverified, no trades). Safe to delete.

### Open / next
1. Merge this branch into `main` to deploy the screenshot.
2. ~~Add `www.tradenotes.dev`~~ **Done.** Added to the Vercel project as a permanent 308 redirect to `tradenotes.dev`; the path is kept. Verified: `https://www.tradenotes.dev/pricing` returns 308 to `https://tradenotes.dev/pricing`.
2b. **SEO (checked 2026-11-15):** robots.txt, sitemap (10 URLs), canonicals and titles are fine, and nothing is set to noindex. **Google Search Console is not verified**: there's no `google-site-verification` TXT record, so the sitemap was never submitted. **Update:** the founder's verification TXT record was added to Vercel DNS (`rec_a0ef48b80bc87106400d7636`) and confirmed visible publicly. **Done by owner (2026-11-15):** domain verified in Search Console, sitemap submitted and processed successfully (10 pages discovered), indexing requested for `/`. An early "Couldn't fetch" status cleared on its own. Still to do: request indexing for `/demo` and `/learn`, then check `site:tradenotes.dev` in a few days. The domain is about 5 days old, with no backlinks and one /learn page. Semrush keyword data was unavailable (account out of API units).
3. Add a DMARC TXT record: `_dmarc` → `v=DMARC1; p=none;`.
4. Distribution: tag every video link with `?src=tt-vN`, test new opening hooks (about 5 posts per hook), and send 25 direct messages a day. Re-check `signup_source` counts next session.
5. Superwall stays parked until there's a native app or Stripe is connected.
