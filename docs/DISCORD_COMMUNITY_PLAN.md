# Discord community: closing the execution gap (journal, discipline, guided execution)
Written 2026-11-14. Facts about Discord's platform are from Discord's public developer docs as returned by search (one search; not every page opened) and my memory: verify exact limits when building.

## 1. Premise
Most traders **know** their rules and still break them. The gap is execution, not knowledge. This community gives people a daily loop that closes it:
**Plan → Execute → Tag → Review → One rule.** TradeNotes is the tool that makes each step measurable (tags, mistake cost, playbook adherence, reviews). The Discord is where people do the loop together, with a daily prompt, accountability and a weekly review.
**What it is:** a process and accountability community. **What it is not:** a signals room, a profit-flexing room, or financial advice. No trade calls, no personal recommendations, no P&L screenshots as proof.

## 2. Is there a Discord API? Yes, and what it lets us do for free
- Discord has an official developer platform: you create an *application* in the Developer Portal, add a *bot*, and use slash commands.
- **Slash commands can run over plain HTTP** (an "Interactions Endpoint URL"): Discord POSTs the command to our site, we verify the signature (Ed25519, headers `X-Signature-Ed25519` and `X-Signature-Timestamp`), and reply. Discord first sends a PING that the endpoint must answer. This runs on the current Vercel project: no always-on server needed.
- **Daily posts** can use a channel **webhook** (no bot needed), triggered by a free GitHub Actions schedule, the same pattern as `review-reminders.yml`.
- **What needs a persistent connection (Gateway) and so is out of v1:** welcome DMs on join, automatic role assignment on join, reacting to every message. Use Discord's built-in Onboarding, Rules Screening and AutoMod instead.
- Do not automate a normal user account in other people's servers (Discord forbids self-bots). Everything here is **our own server and our own bot**.

## 3. Server blueprint
**START HERE:** #welcome · #rules · #how-it-works · #announcements
**CHALLENGE (1–30 Dec, then ongoing):** #daily-prompt (bot/webhook) · #check-in · #process-wins · #questions
**JOURNAL CLUBS:** #mistake-of-the-week · #review-my-process (volunteers, with permission, no account balances) · #strategy-rules
**PREMIUM (private):** #weekly-review-call · #premium-lounge
**HELP:** #support · #feedback-and-ideas · #off-topic
**Roles:** Founder · Mod · Challenger · Graduate · Standard · Premium. (Premium/Standard roles assigned by hand for the first 50; automatic role-by-plan needs Discord OAuth account linking: v2.)
**Rules (short):** 1) Education and process only: no signals, no trade calls, no financial advice. 2) No profit/loss screenshots or income claims. 3) No unsolicited DMs or promotion. 4) Be kind; critique habits, not people. 5) Share only your own data and only with permission. 6) No links from new members. 7) Mods may remove anything; repeat issues mean removal. 8) Trading is risky; nothing here is a promise of results.
**AutoMod:** block "signal", "DM me", "guaranteed", "profit proof", and new-member links; slowmode on #check-in.

## 4. Daily and weekly rhythm
**Daily (5 minutes for members):** read #daily-prompt → post one line in #check-in (pre-session plan or post-session review) → `/checkin`.
**Weekly:** Monday theme post · Wednesday #mistake-of-the-week · Sunday review thread (use the TradeNotes weekly review template) · Premium: 60-minute Weekly Journal Review call (see `HQ.md` section 6; publish it only once the terms are written).
**Your time (Andrew):** about 30–45 minutes a day: post/confirm the prompt, reply in #check-in, moderate. You are the only moderator at launch, so start with the smaller channel set (#welcome, #rules, #announcements, #daily-prompt, #check-in, #questions, #support) and add the rest after the Challenge is running.

## 5. The 30-day Journal Challenge (1–30 Dec)
Free users can do every prompt with the free journal (tags, mistake cost). Standard unlocks the playbook, calendar and reviews, which is the natural upgrade path.
| Week | Theme | Prompts |
|---|---|---|
| 1 (1–7 Dec) Capture | Log everything | 1 Log your last 5 trades or import them · 2 Write a pre-session plan: setup, risk %, where you're wrong · 3 After the session: did you follow the plan? One tag · 4 Log every trade, including the boring ones · 5 Note your emotion before each entry · 6 Your week in numbers: trades, win rate, average win vs loss (mind the sample size) · 7 Weekly review: what worked, what to repeat |
| 2 (8–14 Dec) Cost | Find your costliest mistake | 8 Tag the mistake you repeat most · 9 What did it cost you last week? · 10 What happened just before it? · 11 Write the opposite behaviour in one sentence · 12 Any repeat today? Tag it · 13 Compare your sessions and weekdays · 14 Weekly review: mistakes and rule breaks |
| 3 (15–21 Dec) Rules | Turn lessons into rules | 15 Write 3 rules, one line each · 16 Turn them into a checklist (playbook) · 17 Tick it before every entry · 18 Track results when you followed the rules vs when you didn't · 19 Your best-adherence trade: what was different? · 20 Your worst: what was different? · 21 Weekly review: adherence scorecard |
| 4 (22–28 Dec) Execute | One rule, zero exceptions | 22 Pick ONE rule for the week · 23 Pre-commit: what will you do when you want to break it? · 24 Check-in · 25 Check-in: what urge showed up? · 26 Holiday: just log · 27 Check-in · 28 Weekly review: one-rule scorecard |
| Wrap (29–30 Dec) | Graduate | 29 Compare week 1 with week 4 · 30 Your next 30 days: one rule, one metric. Graduation post; Graduate role |
**Streak rule:** miss one day and keep going; the board shows check-ins, not perfection.

## 6. The coaching ladder (process only)
1. **Free community + Challenge** (top of funnel; free journal).
2. **Standard:** playbook, calendar and reviews make the loop measurable.
3. **Premium:** weekly group review call and faster replies.
4. **Paid 1:1 or small-group coaching (later):** only after it is written (scope, price, sessions, cancellation), reviewed by your lawyer, and offered only to people who have logged ≥30 trades or attended ≥3 reviews. Process coaching only: no trade calls, no managing money. Personalised trading advice can be regulated depending on where you and the client are.

## 7. Bot spec and build plan (all free to run on the current stack)
**v1 commands:** `/checkin followed:(yes|partly|no) mistake:(choice) note:(≤280 chars)` · `/streak` · `/plan` (a form for setup, risk, invalidation) · `/rules` · `/tradenotes` (link tagged `?src=discord`) · `/forgetme` (deletes the member's data).
**Daily prompt:** GitHub Actions schedule (for example 07:00 Jamaica time, `0 12 * * *` UTC) calls an endpoint that posts that day's prompt to a channel webhook.
**Code (new, small):** `src/app/api/discord/interactions/route.ts` (signature check, PING, commands), `src/app/api/cron/discord-daily/route.ts`, `src/lib/discord-prompts.ts` (the 30 prompts above), one migration for `discord_checkins` (discord_user_id, day, followed, mistake, note, created_at; row-level security, owner role only), tests for signature verification and streak maths. One small dependency (for example `discord-interactions`).
**Privacy:** the bot stores only Discord ID and what the member types in `/checkin`. It never reads trades or account data. Update the Privacy Policy and keep `/forgetme`.
**v2:** Discord OAuth account linking so Premium/Standard roles are assigned automatically; weekly leaderboard of consistency (never P&L); optional TradeNotes review reminder via the community.
**Cost:** $0 extra (Vercel, GitHub Actions and the existing database).

## 8. Owner setup (you do these; never paste tokens in chat)
1. Create a Discord server; turn on **Community**; add the channels and rules above.
2. In the Discord Developer Portal, create an application. Copy the **Application ID** and **Public Key** (not secret). Create the bot and copy the **Bot Token** (secret).
3. In Vercel (Production, Sensitive on): `DISCORD_APP_ID`, `DISCORD_PUBLIC_KEY`, `DISCORD_BOT_TOKEN`, `DISCORD_DAILY_WEBHOOK` (a channel webhook URL), `DISCORD_CRON_SECRET`. Add the matching cron secret and URL in GitHub Actions secrets.
4. After I deploy the endpoint, paste its URL in the app's **Interactions Endpoint URL** and save (Discord will PING it).
5. Invite the app to your server with the `applications.commands` scope only; no admin permissions.
Tell me when each is done (no values) and I will verify.

## 9. Launch plan
- 15–20 Nov: server, rules, channels, AutoMod, welcome text. Invite 10 trusted traders and the partners who reply.
- 21–27 Nov: build bot v1 and prompts; soft-launch with 20 people; collect feedback.
- 28–30 Nov: dry-run the daily prompt; fix issues.
- 1 Dec: Challenge starts. Invite from DMs, partner emails, video links (`?src=discord`), and the `/challenge` email capture page.
- Targets (assumptions, not forecasts): 100 members and 40 active challengers (≥3 check-ins a week) by 15 Dec; 15–20% of active challengers start a trial by 31 Dec.

## 10. Risks and how we handle them
Empty-room problem: seed with 10–20 real people and your own daily presence. Promotion and signal creep: AutoMod and removal. Regulated advice: process only, lawyer review before coaching. Moderator burnout: two volunteer mods, clear rules. Privacy: self-reported check-ins only, `/forgetme`. Time: if you can't sustain 30–45 minutes a day, shrink to a 3-day-a-week rhythm.

## 11. Decisions
Decided 2026-11-14: server and application created; Developer Mode on. **Weekly Journal Review call: Saturdays 11:00 (Jamaica time, UTC-5, no daylight saving; confirm). First call Sat 5 Dec 2026 = 16:00 UTC.** Run the first calls open to everyone in the Challenge, then make it a Premium benefit once its terms are written (see `HQ.md` section 6). **Andrew is the only moderator for now**: keep AutoMod strict, keep #check-in on slowmode, run the 3-day-a-week rhythm if time runs short, and recruit volunteer mods from Challenge graduates in January.
Still open: the server name (ideas: TradeNotes Journal Club, The Execution Room).
