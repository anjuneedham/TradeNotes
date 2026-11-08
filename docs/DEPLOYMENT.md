# Deployment
## Current state (2026-11-08)
- **Vercel:** project `tradenotes` (`prj_1FasAGCy7BC4yz8Jn424A7ARcKET`, team `team_WHwp3XrTlAYfu0zTaPB0ktYq`) linked to GitHub `anjuneedham/TradeNotes`. **No deployment has been made and none is verified.** Production branch is currently the feature branch (`ccr-bb6aea2a-0waffk`) because no `main` exists — switch to `main` once the first PR is merged.
- **Supabase:** NOT CREATED. Founder plan: free project on a separate account now, move to a paid-org project later. I have no access to that second account, so the founder creates it (steps below).
- **Domain:** `.dev` — not yet registered. `.dev` is HSTS-preloaded (HTTPS only; Vercel provides SSL automatically).

## Founder steps to go live (≈15 min)
1. Supabase (free account) → New project `tradenotes` → Settings → API: copy **Project URL**, **anon key**.
2. SQL Editor → run, in order: `supabase/migrations/20261108000000_init.sql`, then `20261108010000_onboarding_fields.sql`. They only create the `tradenotes` schema and never touch `public`. Then Settings → API → Exposed schemas → add `tradenotes`.
3. Authentication → URL Configuration: Site URL = production URL; add `<prod-url>/auth/callback` to Redirect URLs. Authentication → Providers → Email: keep "Confirm email" ON.
4. Vercel → project `tradenotes` → Settings → Environment Variables (Production + Preview): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`. **Never** put the service-role key in `NEXT_PUBLIC_*`.
5. Redeploy. Smoke test: sign up → confirm email → onboarding → log trade → dashboard.
6. Domain: register `.dev` name, add in Vercel → Domains, update step 3 URLs.

## Free-tier cautions
Supabase free projects pause after 7 days of inactivity and have no automatic backups → upgrade before taking paying customers, or export weekly (`pg_dump`). Migrating later: run the same migrations on the new project, `pg_dump --data-only` the public tables, re-point env vars. Auth users do not move with a plain dump — plan migration before many users exist.

## Env vars
See `.env.example`. Server-only secrets are not yet used by any code.

## Payments (Handypay) — current process
- Two hosted subscription links are in `src/lib/plans.ts` (`CHECKOUT_URLS`): Starter $12/mo, Pro $24/mo. IDs inside them look Stripe-style (`acct_`, `prod_`, `price_`). They do not carry our user id, so a payment cannot be tied to an account automatically.
- **Entitlements are NOT activated from the browser or from the redirect.** Until a verified webhook exists, the owner activates plans manually after seeing the payment in the Handypay dashboard, matching the **payer email = signup email**:
```sql
update public.subscriptions set plan='pro' /* or 'starter' */, status='active',
  current_period_end = now() + interval '35 days'
where user_id = (select id from auth.users where email = 'customer@example.com');
```
  (Run in Supabase SQL editor. Re-run each month until webhooks are built; set `status='canceled'` on cancellation. `effectivePlan()` drops to free after `current_period_end`, so a forgotten renewal fails safe.)
- **Needed for automation:** Handypay webhook docs (event names, signature header/secret, subscription id/email fields) and whether it exposes a customer-portal link for cancellations.
