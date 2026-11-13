# Weekly review reminder emails (opt-in) — owner setup, about 5 minutes
**Cost: nothing new.** A GitHub Actions workflow (included minutes, a one-second job) calls a protected endpoint of the app once a week; the email goes out through the existing Resend account (free tier, capped in code below its limits). No new vendor, account or paid service.

## What it does
- Standard and Premium users can switch on **"Email me a weekly review reminder"** in Settings. Off by default.
- Monday 14:00 UTC the workflow calls `POST /api/cron/review-reminders`. The app emails each opted-in user **at most once per 6 days**, **only if last week's review is not written**, never Free or lapsed accounts.
- The email contains a link to last week's review and an unsubscribe link (one click, no login). It contains **no trading figures**.
- Caps (in code): at most 90 emails per day and 2,500 per rolling 30 days (Resend free: about 100 a day, 3,000 a month; verify the current limits on resend.com). Near the cap a warning is logged and sending stops.
- Until the two settings below exist the switch does not appear and pricing says "Reminder emails are not available yet".

## Setup
1. Generate a long random secret (for example `openssl rand -base64 32`). Never paste it into chat or commit it.
2. **Vercel** (Project -> Settings -> Environment Variables): add `CRON_SECRET` = that secret, **Sensitive ON**, Production and Preview. Redeploy production. `RESEND_API_KEY`, `BETTER_AUTH_SECRET` and `NEXT_PUBLIC_SITE_URL` must already be set (they are, for the other emails).
3. **GitHub** (repo -> Settings -> Secrets and variables -> Actions -> New repository secret): `CRON_SECRET` = the same secret, and `REMINDER_URL` = `https://tradenotes.dev/api/cron/review-reminders`.
4. Test once: Actions tab -> "Weekly review reminders" -> **Run workflow**. A green run with a JSON line such as `{"optedIn":1,"due":1,"sent":1,...}` means it works. A red run prints the HTTP status (401 = secrets differ, 503 = a Vercel env var is missing).
5. The database change (`db/paste/15_review_reminders.sql`, two columns on `profiles`) is applied automatically by the next production build.

## Good to know
- GitHub scheduled workflows run only from the default branch (`main`), can start a few minutes late, and are paused by GitHub after 60 days without repository activity (the "Run workflow" button, or any commit, re-enables it).
- Resend: emails go from the sender you already verified. Reminders count toward the same Resend limits as signup emails.
- To stop everything: delete the `CRON_SECRET` Vercel variable (the endpoint then answers 503 and the switch disappears) or disable the workflow.
