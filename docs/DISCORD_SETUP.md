# Discord community bot: owner setup
Built 2026-11-14 (branch `ccr-f1bf506c-8tg7lm`; not live until merged and deployed). Design: `DISCORD_COMMUNITY_PLAN.md`.
**What exists:** slash commands `/checkin /plan /streak /rules /tradenotes /forgetme` served at `https://tradenotes.dev/api/discord/interactions` (every request must carry Discord's Ed25519 signature); a daily Journal Challenge prompt posted to #daily-prompt by a GitHub Actions job; one new database table, `tradenotes.discord_checkins` (owner connection only).
**Tested:** 13 unit tests + 1 real-database test + 17 end-to-end checks against a production build with a throwaway key (signature, replay, PING, each command, database rows, the cron endpoint and a mock webhook). **Not tested against the real Discord:** that happens in step 6.

## What is a secret and where it goes
| Value | Secret? | Where |
|---|---|---|
| Application ID `1571191674846052352`, Server ID `1571190560965009540`, Public Key | No (public identifiers) | Already in the repo/workflows, plus Vercel for the key |
| Bot Token | **Yes** | GitHub Actions secret `DISCORD_BOT_TOKEN` only (used once to register commands). Not needed in Vercel |
| #daily-prompt webhook URL | **Yes** | Vercel `DISCORD_DAILY_WEBHOOK` only |
| A random string you invent | **Yes** | Vercel **and** GitHub, both named `DISCORD_CRON_SECRET` |
Never paste secrets into chat or commit them. If one leaks, reset it (token: Developer Portal → Bot → Reset Token; webhook: delete and recreate it).

## Steps
1. **Vercel** → project `tradenotes` → Settings → Environment Variables (Production, Sensitive ON): `DISCORD_PUBLIC_KEY` (the 64-character key), `DISCORD_GUILD_ID` = `1571190560965009540`, `DISCORD_DAILY_WEBHOOK`, `DISCORD_CRON_SECRET` (for example from `openssl rand -base64 32`).
2. **GitHub** → repo `TradeNotes` → Settings → Secrets and variables → Actions: `DISCORD_BOT_TOKEN`, `DISCORD_CRON_SECRET` (same value as Vercel), `DISCORD_DAILY_URL` = `https://tradenotes.dev/api/cron/discord-daily`.
3. **Merge and deploy** (ask Claude to open the PR). The deploy runs migration 17 and the database verifier; a failure stops the deploy before it goes live.
4. **Interactions Endpoint URL:** Developer Portal → your application → General Information → set `https://tradenotes.dev/api/discord/interactions` → Save. Discord sends a signed PING; it saves only if the endpoint answers correctly.
5. **Invite the app** with the `applications.commands` scope only: `https://discord.com/oauth2/authorize?client_id=1571191674846052352&scope=applications.commands` (choose your server). No admin permissions.
6. **Register the commands:** GitHub → Actions → "Register Discord commands" → Run workflow. It should print "Registered 6 commands". Then in #check-in type `/` and try `/checkin`.
7. **Check the daily post safely** (posts nothing publicly): `curl -X POST -H "Authorization: Bearer YOUR_SECRET" "https://tradenotes.dev/api/cron/discord-daily?dry=1&day=1"` returns Day 1's text. To see a real post once, run it without `dry=1` and delete the message afterwards. The scheduled job starts posting on 1 Dec at 07:00 Jamaica time and does nothing outside 1-30 Dec. To re-send a missed day, call it with `?day=N`.

## Notes
- **Privacy:** the Privacy Policy now has a bullet about Discord check-ins (Discord ID and what the member types; deletable with `/forgetme`). Ask your lawyer to confirm the wording.
- **Reminder emails stay off:** the Discord job uses `DISCORD_CRON_SECRET`, not `CRON_SECRET`, so this does not switch on the unfinished weekly review reminders.
- **Moderation is on you** (solo at launch): see the rules and AutoMod list in the plan.
- **Roll back:** clear the Interactions Endpoint URL in the Developer Portal and disable the "Discord daily prompt" workflow. The table can stay.
