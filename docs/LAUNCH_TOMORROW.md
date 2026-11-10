# Launch checklist — "live tomorrow"
Written 2026-11-10. **Go/no-go rule: don't post links until the gates in section 2 pass on the LIVE URL.** Posting a broken link wastes the one-shot attention you get from each DM and video.

## 1. What is already done and tested (locally)
Auth, onboarding, trade logging (forex lots, partial exits, FX), journal, dashboard with explanations, billing page with both Handypay links, plan limits, signup-source tracking, isolation tests (40 DB checks), browser test (30 checks), unit tests (46). See `TEST_RESULTS.md`.

## 2. Gates (in order) — owner = who must act
| # | Gate | Owner | Time | Notes |
|---|---|---|---|---|
| 1 | **Database schema applied** to the Supabase project | You (or me after you approve the prompt) | 10 min | Run `db/migrations/0000_reset_old_tradenotes_schema.sql` then `0001_init.sql` in the Supabase SQL Editor, **or** approve the confirmation prompt when I run it. Confirm `select count(*) from tradenotes.trades;` is 0 first |
| 2 | Vercel env vars set (Production + Preview) | You | 10 min | `DATABASE_URL` = Supabase **pooler** string, transaction mode (port 6543), user `postgres.<ref>`; `BETTER_AUTH_SECRET`; `BETTER_AUTH_URL` + `NEXT_PUBLIC_SITE_URL` = live URL. Mark DB URL Sensitive. Direct `db.<ref>.supabase.co` connections are IPv6-only and will fail from Vercel |
| 3 | **Vercel Pro** | You | 5 min | Required before you promote/charge (Hobby = non-commercial per Vercel's docs) |
| 4 | Redeploy, open the live URL | You | 5 min | Vercel → Deployments → Redeploy. Production branch is currently `ccr-bb6aea2a-0waffk`; set it to that branch or merge to `main` |
| 5 | **Live smoke test** | Me | 20 min | Sign up → onboard → log a trade (expect $593.00 / 1.98R for the EURUSD example) → dashboard → log out/in; check the DB from the connector that no cross-user rows exist and the API roles can't read `tn_*` tables. Creates 2 test users which I delete after |
| 6 | Handypay: click both links, confirm price/plan names | You | 10 min | Pro $24, Basic $12 as given. Do a real $-small test payment if possible, then activate yourself per `DEPLOYMENT.md` |
| 7 | Legal pages | You + lawyer | — | Terms/Privacy/Disclaimer currently show a **"DRAFT — pending legal review"** banner. Decide: launch with the banner (honest) or hold. Risk is yours; I can't confirm legal adequacy |
| 8 | Domain (optional tomorrow) | You | 10 min | Can launch on the free `*.vercel.app` URL; swap later. Email (Resend) needs your own domain |

## 3. Known limits tomorrow (tell no one these are fixed)
- **Payments are manual:** you activate plans after seeing the Handypay payment; extend monthly (`DEPLOYMENT.md`).
- **No email:** no confirmation, no password reset until a domain + Resend exist. Anyone can sign up with any email; because payments are matched by email, check payer email = signup email before activating.
- **No CSV import, no trade edit page, no backtesting.** Say so; don't screenshot or script anything that implies they exist.
- Free-plan cap: 50 trades. Starter/Pro limits are enforced server-side but nobody has a paid plan until you activate them.

## 4. Day-of operations (tomorrow)
| Time | Task |
|---|---|
| Morning | Gates 1–5; record 3 shorts (F2 "log a trade", F1 "number lies", F4 build log) with **SAMPLE DATA** label |
| Midday | Post 3 TikToks + 2 Shorts; link in bio = `{SITE}/?src=tt-organic` (TikTok) and `{SITE}/?src=ig-organic` (Instagram) |
| Afternoon | Outreach: 25 TikTok + 25 Instagram (`SALES_PLAYBOOK.md`; each DM link tagged `?src=tt-dm` / `?src=ig-dm`) |
| Evening | Start the $50 Instagram ad (`PAID_TEST.md`); fill the daily report |
Daily report (copy): signups by source (query below) · trades logged · DMs sent/replies per platform · posts + views · ad spend/clicks · payments · bugs.

```sql
-- signups and activation by source (Supabase SQL editor, owner connection)
select coalesce(p.signup_source,'(none)') as source, count(*) as signups,
       count(*) filter (where exists (select 1 from tradenotes.trades t where t.user_id = p.id)) as logged_a_trade
from tradenotes.profiles p group by 1 order by 2 desc;
```
