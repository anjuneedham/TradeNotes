# Resend (email) setup — enables email confirmation + password reset
Code is ready and tested against a fake Resend server (`scripts/e2e-email.js`, 15 checks). It switches on when `RESEND_API_KEY` is set.

## What changes when you switch it on
- New signups must **confirm their email** before logging in (confirmation link lands on onboarding).
- "Forgot password" works; a reset **signs the account out everywhere**.
- Trying to log in unconfirmed sends a fresh confirmation link.
- Accounts created while email was off (e.g. test users) can still not log in until confirmed — they are disposable.

## Steps (≈15 min, domain must exist first)
1. resend.com → create account → **Domains → Add domain** `tradenotes.dev` (region: US East).
2. Resend shows DNS records (SPF/DKIM, usually 2–3 TXT/CNAME/MX). Add them where the domain's DNS lives (if bought in Vercel: Vercel → Domains → `tradenotes.dev` → **DNS Records**). Click **Verify** in Resend. **Wait until it says Verified.**
3. Resend → **API Keys → Create** with *Sending access* limited to this domain. Copy it once.
4. Vercel → tradenotes → Settings → Environment Variables (Production + Preview):
   - `RESEND_API_KEY` = the key (tick **Sensitive**)
   - `EMAIL_FROM` = `TradeNotes <noreply@tradenotes.dev>` (must be on the verified domain)
   - optional `EMAIL_REPLY_TO` = your support email (defaults to the support email in `src/lib/legal.ts`)
5. Redeploy, then **immediately test with your own email**: sign up → confirmation arrives → link lands on onboarding → log out → "Forgot password" → reset works.

## IMPORTANT failure mode (tested)
If Resend rejects the send (domain not yet verified, wrong `EMAIL_FROM`, bad key), signup still shows "Check your email" but **nothing is sent**; the only trace is the Vercel log line `Email provider error 403`. So: set the key only AFTER the domain shows Verified, test straight away, and if no email arrives look in Vercel → Logs for `Email provider error`. The check-email page now tells users to check spam, try logging in for a fresh link, and shows the support email once filled in.
## Limits
Resend free tier ≈100 emails/day (verify current limits). Each signup = 1 email; each unconfirmed login attempt or reset = 1 more.
