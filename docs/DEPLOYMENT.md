# Deployment
## Current state
- **Vercel:** project `tradenotes` (`prj_1FasAGCy7BC4yz8Jn424A7ARcKET`) linked to GitHub `anjuneedham/TradeNotes`. **No deployment made or verified.** Its production branch is currently the feature branch because no `main` exists — switch after the first merge.
- **Database: Supabase — the existing Agriloop project (ref `rocawrsurnfikzreajwo`, shown as "YardScale-Digital" in the connector), founder decision 2026-11-10.** Our objects live in schema `tradenotes` plus 5 prefixed `public.tn_*` auth tables; nothing of Agriloop's is touched. **New schema NOT yet applied** (confirmation prompt timed out). An older, empty `tradenotes` schema (10 tables, 0 rows) is still there; `0000_reset_old_tradenotes_schema.sql` removes it. We use Supabase only as hosted Postgres — **not** Supabase Auth; Better Auth handles login.
- **Domain:** `.dev` — not yet registered (HTTPS-only TLD; Vercel provides certificates).

## Go-live steps
1. **Connection string:** Supabase → Project Settings → Database → Connection string → **Transaction pooler** (port 6543, user `postgres.<ref>`). Vercel cannot use the direct `db.<ref>.supabase.co` host (IPv6-only). Optional but recommended: download the SSL certificate and put its PEM in `DATABASE_SSL_CA` (enables full certificate verification; without it TLS is encrypted but not verified — see KNOWN_ISSUES).
2. **Schema:** Supabase → SQL Editor → run `db/migrations/0000_reset_old_tradenotes_schema.sql` (after confirming `tradenotes.trades` has 0 rows), then `db/migrations/0001_init.sql`. Not idempotent. No change to Exposed schemas is needed or wanted — we do **not** use the Supabase Data API.
3. **Vercel → tradenotes → Settings → Environment Variables** (Production + Preview), see `.env.example`: `DATABASE_URL` (mark Sensitive), `BETTER_AUTH_SECRET` (`openssl rand -base64 32`), `BETTER_AUTH_URL` and `NEXT_PUBLIC_SITE_URL` (production URL). Never put these in the repo or in chat.
4. Redeploy; smoke test on the live URL: sign up → onboarding → log trade → dashboard → log out/in.
5. Domain: register the `.dev` name, add in Vercel → Domains, update the two URL variables.
6. **Email (needed before charging):** create a Resend account, verify the domain, set `RESEND_API_KEY` + `EMAIL_FROM`. This turns on email confirmation and password reset (see KNOWN_ISSUES).

## Shared-project notes (Agriloop)
The Agriloop project is on your Supabase Pro org (backups per Pro plan). A bad Agriloop migration or outage affects TradeNotes and vice versa; if TradeNotes takes off, move it: `pg_dump -n tradenotes -t 'public.tn_*'` to a new project (auth tables are in the same database, so users and password hashes move with it).
Security advisor (2026-11-10, before our change): only Agriloop-owned warnings existed. Re-run it after applying the schema.

## Payments (Handypay) — current process
- Two hosted subscription links are in `src/lib/plans.ts` (`CHECKOUT_URLS`): Starter $12/mo, Pro $24/mo. They do not carry our user id, so payments cannot be tied to accounts automatically.
- **Entitlements are NOT activated from the browser or redirect.** The owner activates plans manually after seeing the payment in Handypay, matching payer email = signup email (run in Neon SQL Editor; owner connection bypasses RLS):
```sql
update tradenotes.subscriptions set plan='pro' /* or 'starter' */, status='active', current_period_end = now() + interval '35 days'
where user_id = (select id from public."user" where email = 'customer@example.com');
```
- Handypay renews monthly by itself; **extend active subscribers monthly** or they fall back to Free when `current_period_end` passes (fails safe). Details and options in the monthly routine (see DAILY_OPERATIONS).
- **Needed for automation:** Handypay webhook docs (events, signature scheme, payer email, subscription id) and whether a customer-portal link exists.
