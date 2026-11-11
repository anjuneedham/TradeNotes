# Production launch checklist
Owner: F = founder, O = Opus (engineering). ☑ = done and verified this session.

## A. Beta (free sign-ups, no charging) — blockers
- [ ] F: approve merge to `main` → production build passes migrate + verify-db
- [ ] F: buy + attach `tradenotes.dev` (DOMAIN_SETUP)
- [ ] F: fill `businessName`, `supportEmail` in `src/lib/legal.ts` (O can commit once given); `npm run check:legal` passes
- [ ] F: Resend domain verified, `RESEND_API_KEY` + `EMAIL_FROM` set; one real signup + reset email received
- [ ] O: live smoke test on the domain (signup → trade → dashboard → export → delete test account)
- [ ] F: delete `@e2e.test` users in prod: `delete from public.tn_user where email like '%@e2e.test';`
- ☑ Isolation, security headers, 0 vulnerabilities, futures fix, trade edit, export, deletion

## B. Before taking the first payment — blockers
- [ ] F: HandyPay **test** key + webhook secret in Vercel; run PAYMENT_TEST_REPORT script; send O the payload sample
- [ ] F: HandyPay fee/payout schedule + merchant-of-record answer in writing
- [ ] F: decide founding-member line (recommend remove) and confirm `refundDays`
- [ ] F: lawyer review of Terms/Privacy/Subscription/Disclaimer; set `counselReviewed`
- [ ] F: Jamaica DPA data-controller registration (or counsel's written view)
- [ ] F/O: `DATABASE_SSL_CA` set (verified TLS)
- [ ] O: Sentry (free) or equivalent error alerts; uptime check
- [ ] F: one backup-restore drill in Supabase
- [ ] F: switch to `hp_live_` key

## C. Public launch / ads
- [ ] All of A and B
- [ ] Landing page screenshots/demo (Fable)
- [ ] Ad tracking events in place (CAMPAIGN_TRACKING_PLAN)
- [ ] First 15 videos produced and approved
