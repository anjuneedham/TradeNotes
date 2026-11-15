# Session log

One entry per working session, newest first. Each entry records what was asked, what was found (with evidence), what changed, and what is still open.

---

## 2026-11-15: Paywall, distribution bottleneck, email check, homepage screenshot

**Asked:** build a Superwall paywall; find the distribution bottleneck; confirm email works; add a product screenshot; start documenting every session. Founder reports the first 2 videos got little response.

### Found
- **Superwall can't gate TradeNotes yet.** The Superwall project has iOS and Android apps (`com.tradenotes.app`) and a `pro` entitlement. Both apps are marked not integrated. There are no products or paywalls, and Stripe isn't connected. TradeNotes is a Next.js website that takes payments through Handypay. Superwall needs a native app or Stripe web checkout. No paywall was built.
- **No real users yet.** The production database has 3 accounts: two smoke tests (`@e2e.test`) and one Resend test address. No accounts came from the first 2 videos, and nobody has paid.
- **tradenotes.dev is live.** `/`, `/pricing` and `/signup` return 200. `www.tradenotes.dev` did not respond.
- **Email is NOT confirmed working.**
  - Vercel production has `RESEND_API_KEY` and `EMAIL_FROM` set.
  - The live site now requires email verification: signup returns no session token.
  - A test signup to a Gmail alias, plus a reset email and a re-sent verification email, produced **no email**, including in spam.
  - DNS: the DKIM record `resend._domainkey` exists. `send.tradenotes.dev` MX and SPF point to `forge.rmta.net`, not Amazon SES, which Resend's sending setup normally uses. There is no DMARC record.
  - Most likely cause: the domain isn't verified in Resend, so sends fail silently. `src/lib/email.ts` throws `Email provider error <status>`, but nothing showed in Vercel runtime logs.
  - Impact: **new signups currently cannot log in** because they never get the confirmation link.
- Signup attribution already exists: `?src=` on any page is stored in `profiles.signup_source`. Use it on every video link.

### Changed
- Homepage: added a real dashboard screenshot (`public/screenshots/dashboard.webp`) under the hero. It was taken from a local copy of the app with 10 example trades (6 wins, 4 losses) and is labelled "example trades, not real results". Checked with no horizontal scroll at 1280px and 390px wide.
- Added this log, and a rule in `CLAUDE.md` to update it every session.

### Test data left in production
- Account `anjuneedham+tntest1794725746@gmail.com` (unverified, no trades), created for the email test. Safe to delete.

### Open / next
1. **Fix email (blocking signups).** In Resend → Domains → `tradenotes.dev`, check the status. Copy the exact MX/SPF records Resend shows into Vercel DNS, wait for **Verified**, then redeploy and re-test. Also check Resend → Logs for the rejected sends.
2. Merge this branch into `main` to deploy the screenshot.
3. Add `www.tradenotes.dev` in Vercel, redirecting to the main domain.
4. Distribution: tag each video's link with `?src=tt-v1`, `?src=tt-v2` and so on. Change the hook rather than the topic (see the chat notes).
5. Superwall stays parked until there's a native app or Stripe is connected.
