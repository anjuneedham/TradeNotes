# Deployment
## Current state
- **Vercel:** project `tradenotes` (`prj_1FasAGCy7BC4yz8Jn424A7ARcKET`) linked to GitHub `anjuneedham/TradeNotes`. **No deployment made or verified.** Its production branch is currently the feature branch because no `main` exists — switch after the first merge.
- **Database:** Neon — **project not created yet** (founder). The earlier Supabase/Agriloop plan was dropped; a `tradenotes` schema was applied to the Agriloop Supabase project on 2026-11-08 (empty, no users) and should be dropped with founder approval (`drop schema tradenotes cascade;`).
- **Domain:** `.dev` — not yet registered (HTTPS-only TLD; Vercel provides certificates).

## Go-live steps
1. **Neon:** create project `tradenotes` (region near Vercel, e.g. us-east). Copy the **pooled** connection string.
2. **Schema:** Neon → SQL Editor → paste and run `db/migrations/0001_init.sql` once. (Re-running fails on purpose; it is not idempotent.)
3. **Vercel → tradenotes → Settings → Environment Variables** (Production + Preview), see `.env.example`: `DATABASE_URL` (mark Sensitive), `BETTER_AUTH_SECRET` (`openssl rand -base64 32`), `BETTER_AUTH_URL` and `NEXT_PUBLIC_SITE_URL` (production URL). Never put these in the repo or in chat.
4. Redeploy; smoke test on the live URL: sign up → onboarding → log trade → dashboard → log out/in.
5. Domain: register the `.dev` name, add in Vercel → Domains, update the two URL variables.
6. **Email (needed before charging):** create a Resend account, verify the domain, set `RESEND_API_KEY` + `EMAIL_FROM`. This turns on email confirmation and password reset (see KNOWN_ISSUES).

## Neon notes
Free plan scales compute to zero (first request after idle takes ~1s longer) but does not pause the project or delete data. Check current limits/retention on neon.com before launch.

## Payments (Handypay) — current process
- Two hosted subscription links are in `src/lib/plans.ts` (`CHECKOUT_URLS`): Starter $12/mo, Pro $24/mo. They do not carry our user id, so payments cannot be tied to accounts automatically.
- **Entitlements are NOT activated from the browser or redirect.** The owner activates plans manually after seeing the payment in Handypay, matching payer email = signup email (run in Neon SQL Editor; owner connection bypasses RLS):
```sql
update tradenotes.subscriptions set plan='pro' /* or 'starter' */, status='active', current_period_end = now() + interval '35 days'
where user_id = (select id from public."user" where email = 'customer@example.com');
```
- Handypay renews monthly by itself; **extend active subscribers monthly** or they fall back to Free when `current_period_end` passes (fails safe). Details and options in the monthly routine (see DAILY_OPERATIONS).
- **Needed for automation:** Handypay webhook docs (events, signature scheme, payer email, subscription id) and whether a customer-portal link exists.
