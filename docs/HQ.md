# TradeNotes HQ (hq.<your-domain>) — internal operations platform
Owner-only app in `hq/` (own Next.js app, own Vercel project, same Postgres). It turns the plan in `LAUNCH_PLAN`, `CONTENT_ENGINE`, `SALES_PLAYBOOK`, `DAILY_OPERATIONS` and `PAID_TEST` into one workflow: **get subscribers → record content → run social → do outreach → nurture → manage customers**.
Nothing in HQ posts, DMs or charges anything by itself. It tracks, enforces the playbook rules, and does the one automated thing you click: send a nurture email.

## What each module does (and which plan rule it enforces)
| Module | Use it to | Rules built in |
|---|---|---|
| **Today** (`/`) | See the goal (paying vs target + days left), founding seats, MRR, and the day's checklist: DMs 25+25, follow-ups due, replies waiting, posts 3+2, scripts to approve/record, expiring renewals, nurture due, open feedback/bugs, stuck signups | Targets editable in Settings; counts use your time zone (default America/Jamaica) |
| **Outreach** (`/outreach`) | Paste your daily 25 (`handle \| what they posted`), personalise with templates, copy → send yourself → log. Stages: found → engaged → DM sent → replied → interested → signed up → logged a trade → paying. Funnel with conversion rates | First DM once · **one** follow-up, only from day 3, never after a reply · never the same text twice · do-not-contact respected · warns on a link in a first Instagram DM · tagged links `?src=tt-dm` / `ig-dm` · enforced again by DB unique indexes · link a prospect's signup email and their stage follows real activity |
| **Customers** (`/customers`) | Real signups with plan, trades, source, days left. **Record a Handypay payment**: payer email → open account → set plan/days/founding/reference → audited. One-click "+35 days" renewal. Filters: paying, expiring ≤7d, signed up/no trade, lapsed. CSV export | Founding seats capped at 10 · founding only after trades logged (override box) · never shortens a running period · every change written to `tradenotes.audit_log` · test accounts hidden |
| **Content** (`/content`) | Idea bank (all 33 seeded) → scripted → approved → recorded → edited → posted → measured; full script skeleton; **Record session** (Sunday batch readiness: 2 per format) with **teleprompter**; **Caption tool** (≤24 chars × 2 lines); post metrics; **Performance** by format | Approval needs hook + voice-over + all 6 compliance ticks + no banned wording (guarantee, risk-free, "make you profitable"…) + ≤50 s spoken · ideas that depend on unbuilt features are flagged BLOCKED · "measured" needs a post with views · after 10 posts: double down on top 2 formats by 3-second view rate, review clearly weak ones |
| **Social & ads** (`/social`) | Tagged-link builder, account handles, follower snapshots, Instagram $50 ad log, TikTok-vs-Instagram scorecard | Day-5 rule: more signups-that-logged-a-trade wins; <3 apart → don't decide · pause warning at $15 spent with 0 clicks |
| **Nurture** (`/nurture`) | D0 welcome, D2 expectancy, D5 tag mistakes, D10 review + feedback ask, D14 upgrade (free only). Preview, **Send** or Skip per person | Only the latest due step (no bursts) · once per person (DB-enforced) · verified or owner-confirmed address only · opt-outs never listed · footer with business name + support email + "reply stop" (sending blocked until set) · founding line only for people who have logged trades · copy never claims unbuilt features |
| **Feedback** (`/feedback`) | Log feedback, objections, bugs, questions with tags; founding-member tracker (call booked, testimonial permission) | Testimonials need written permission recorded on the customer |
| **Reports** (`/reports`) | Evening report from real data (signups by source, activations, paying, MRR, DMs/replies/demos, posts/views, ad spend, blockers), saved per day, copy-paste | Matches `DAILY_OPERATIONS.md` |
| **Launch** (`/launch`) | Goal + countdown, seats, launch gates from `LAUNCH_TOMORROW` / `READINESS_REVIEW` as a checklist, your own tasks | |
| **Settings** (`/settings`) | Targets, time zone, identity for email footers, templates (DM + nurture) with reset, system status (DB, customer site, 2FA, email, TLS) | |

## Security model
- **Separate login, not the customer login.** Owner email + scrypt password hash + optional TOTP (authenticator app) from env vars; a customer account can never reach HQ. Signed httpOnly, SameSite=Strict, 12-hour cookie.
- Failed-login lockout: 5 failures / 15 min (global, so someone who knows your email could lock you out for 15 min — accepted for a single-user tool).
- Middleware gates **every** route; every page and every server action re-checks the session. `noindex`, `no-store`, frame-deny, HSTS headers.
- Data: HQ uses the **owner database connection** (it must read all customers and write plan changes). The `hq` schema has RLS on with no policies and no grants to `anon`/`authenticated`/`app_user`, so neither the Supabase Data API nor customer request code can read it. Verified by `npm run test:db` (21 checks).
- HQ reads only the columns it shows from `public.tn_user` (never password hashes or sessions).
- Erasing a customer (`delete from public.tn_user`) also erases their HQ notes and email log (FK cascade). Prospects (people who haven't signed up) are HQ-only data about third parties: keep them minimal and delete on request.

## Deploy (checklist — nothing below has been done yet)
1. **Domain:** decide the name. `tradenotes.dev` is registered by someone (checked 2026-11-14; it was available on 11-10) and is not in the Vercel account; `tradesnotes.dev` (note the extra "s") is unregistered. HQ works on any host — attach `hq.<your-domain>` in Vercel → Domains.
2. **Vercel:** new project from this repo, **Root Directory = `hq`**, production branch = `main` (after merge). Framework: Next.js. Build command is already `node scripts/migrate.mjs && next build` (creates/updates only the `hq` schema, idempotent; fails the build on error; skips if `DATABASE_URL` is unset).
3. **Env vars** (Production; mark secrets Sensitive) — see `hq/.env.example`:
   `DATABASE_URL` (same pooler string as the customer app) · `DATABASE_SSL_CA` (recommended) · `HQ_OWNER_EMAIL` · `HQ_PASSWORD_HASH` (`cd hq && node scripts/hash-password.mjs`) · `HQ_SESSION_SECRET` (`openssl rand -base64 32`) · `HQ_TOTP_SECRET` (`node scripts/hash-password.mjs --totp`, add to your authenticator) · `NEXT_PUBLIC_SITE_URL` · later `RESEND_API_KEY` + `EMAIL_FROM` (+ `EMAIL_REPLY_TO`).
4. Open `/login`, then **Settings**: set business name + support email, check "System status".
5. Optional: set an "Ignored Build Step" on the customer project so HQ-only commits don't redeploy it.
**The customer app must be deployed first** (HQ's migration refuses to run without `public.tn_user` / `tradenotes.subscriptions`). It is, on the live database.

## What HQ deliberately does not do
- No auto-DM / auto-posting / scraping (platform bans + your "manual only" rule). It prepares and tracks.
- No Handypay connection (no webhook docs yet): you confirm payments and record them (Customers → "Payment received?"). Revenue/MRR shown = what you recorded.
- No TikTok/Instagram/YouTube analytics import: you type post numbers from each platform's own analytics. (Claude can pull Instagram/ads numbers through the Supermetrics connector in a chat session, but a deployed app can't use chat connectors.)
- Video editing stays in CapCut/Descript. Claude can drive Descript from a chat session; HQ gives the script, teleprompter, caption cards and the tracking.
- Nurture emails are one click each, never automatic, until legal sign-off and a verified sending domain.

## Tests
`cd hq && npm test` (39 unit) · `npm run test:db` (21 DB checks incl. idempotent re-apply) · `bash scripts/run-e2e.sh` (98 browser checks: login/lockout/2FA, every module, 390px layout). Details in `TEST_RESULTS.md`.
