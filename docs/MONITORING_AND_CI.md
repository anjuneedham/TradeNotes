# Error monitoring and CI gate — setup instructions
## 1. CI gate (already in the repo: `.github/workflows/ci.yml`)
Runs on every pull request and push to `main`: lint, type-check, unit tests, production build; plus a Postgres 16 job that applies the schema twice, runs the 43 database security/isolation checks and the DB integration tests (founding seats, affiliate flow).
**Make it block bad merges (about 3 minutes, GitHub UI):**
1. GitHub repo -> Settings -> Branches -> Add branch protection rule for `main`.
2. Tick **Require a pull request before merging** and **Require status checks to pass**; add both checks: `lint, types, unit tests, build` and `schema applies twice, security checks, DB integration tests`.
3. Optional: tick **Do not allow bypassing** if you want it to apply to you too (recommended once you have customers).
4. Vercel -> Project -> Settings -> Git: keep Production Branch = `main`. Vercel's build also runs migrate + verify against the real database, so a bad schema fails the deploy and the previous version keeps serving.
Note: the Vercel build needs `DATABASE_URL` in the Production environment; the CI job uses its own throwaway database.

## 2. Error monitoring with Sentry (free tier, ~20 minutes)
1. sentry.io -> create account -> Create Project -> platform **Next.js** -> copy the DSN.
2. **Code is already wired** (`src/instrumentation.ts`, `src/instrumentation-client.ts`, `src/app/global-error.tsx`, `src/lib/monitor.ts`). It is inert until a DSN exists, strips request bodies/cookies/headers/user before sending, and has no session replay. Payment-webhook, checkout and email-provider failures are reported with an `area` tag.
3. (The Vercel Sentry integration sets `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`; the server falls back to `NEXT_PUBLIC_SENTRY_DSN`, so no plain `SENTRY_DSN` is needed.) Add in Vercel -> Settings -> Environment Variables (Production + Preview): `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN` = the DSN; `SENTRY_AUTH_TOKEN` (Sensitive) for source-map upload; `SENTRY_ORG`, `SENTRY_PROJECT`.
4. Settings to choose: sample rate 100% errors, performance tracing 0-10%, session replay OFF (it can capture trade notes; do not enable without updating the privacy policy), `sendDefaultPii: false`.
5. Sentry -> Alerts: email on **any new issue** and on **error rate spike**. Add the Resend/support address.
6. Test: trigger a deliberate error on a preview deploy, confirm it appears with a readable stack, then delete the test route.
7. Add Sentry (error data, US servers) to the Privacy Policy provider list when enabled.
**What to alert on:** failed payment webhooks (the log line `billing webhook failed`), `Email provider error`, `checkout failed`, database connection errors.

## 3. Uptime check (free, 5 minutes)
UptimeRobot or Better Stack: HTTP check on `https://<domain>/pricing` every 5 minutes, alert to your email/phone. Add a second check on `/login`.

## 4. Vercel Web Analytics
Vercel -> Project -> Analytics -> Enable. The `<Analytics />` component is already in the app (cookieless).

## 5. Payments safety net
HandyPay dashboard -> Webhooks: confirm deliveries show 2xx; failed deliveries are retried by HandyPay but you should look weekly until trust is established. Webhook endpoint: `https://<domain>/api/webhooks/handypay`.
