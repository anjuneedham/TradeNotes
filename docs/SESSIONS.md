# Session log

One entry per working session, newest first. Each entry records what was asked, what was found (with evidence), what changed, test data left behind, and what is still open. Longer build notes stay in `docs/BUILD_LOG.md`.

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
