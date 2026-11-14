# Email marketing / lifecycle plan
Written 2026-11-14 against `main`. Not legal advice: have the lawyer who reviewed the Terms/Privacy check the consent and footer wording before any promotional email goes out.

## Why email, and what it can and can't do
You are pushing people to the **free** plan. Email is how a free signup becomes an **activated** user (logged a trade) and then a **trial / paid** member. It improves conversion of people you already have; it does **not** create signups, so keep the top of the funnel (content, DMs, partners, Challenge) running.

## What exists today (verified in code and production env names)
- Transactional sending via Resend (`src/lib/email.ts`), templates for welcome, verify, reset, subscription confirmed, payment failed, cancellation, subscription ended, review reminder (`src/lib/email-templates.ts`). The welcome email is sent on the first app visit.
- Production has `RESEND_API_KEY` and `EMAIL_FROM` set. **`CRON_SECRET` is not set**, so scheduled emails (weekly review reminders) are **off**.
- Reminder infrastructure to reuse: opt-in column (`profiles.review_reminders`, off by default), signed unsubscribe link and page, daily cap 90 and monthly cap 2,500 in code (sized for Resend's free limits, which I recall as 100/day and ~3,000/month: verify), a cron endpoint, and a free GitHub Actions scheduler (`.github/workflows/review-reminders.yml`, weekly).
- **Not built:** marketing consent at signup, onboarding/upgrade sequences, email-only capture (Challenge waitlist), click tracking per email.

## Compliance defaults (build these before any promotional email)
- Transactional (account, billing, security) vs **marketing** (tips, upgrade nudges, Challenge): keep them separate in code.
- Signup form: an **unchecked** "Send me tips and product updates" box; store `marketing_opt_in` + timestamp. Onboarding "getting started" emails (D0–D5) can be framed as part of the service; upgrade and Challenge emails go only to opted-in users. A lawyer should confirm this split for your jurisdictions (Jamaica data-protection law, plus any recipient in the US/UK/EU).
- Every marketing email: unsubscribe link and a `List-Unsubscribe` header, your business name and postal address in the footer, honest subject lines, no profit claims, "Not financial advice".
- Honour unsubscribes immediately; never re-add. Keep sending volume gradual to protect the sender domain.

## Segments (all computable from the database)
S0 signed up, no trade · S1 1–4 trades · S2 ≥5 trades (activated) · S3 ≥40 trades on Free (near the 50 cap) · S4 trialing · S5 trial ends in ≤4 days · S6 paying · S7 inactive 14+ days · plus acquisition tag (`tt-dm`, `ref=` partner code, `challenge`).

## Sequences (one goal and one link per email, plain text first)
| When | Segment | Goal | Content |
|---|---|---|---|
| D0 | all | First trade | Existing welcome: log a trade in 60 s, or open `/demo` |
| D1 | S0 | Unblock | "Stuck? 60-second walkthrough" + import tip (list of supported brokers) |
| D2 | S0–S1 | Teach | What expectancy is, in plain English |
| D5 | S1–S2 | Habit | Tag your mistakes and see what they cost |
| D10 | S2 | Retention | Weekly review prompt + one question: "What almost stopped you from logging a trade?" |
| D14 | S2 (opted in) | Upgrade | What Standard/Premium add; **14-day trial, no card needed for Free**; link to pricing |
| At 40 trades | S3 (opted in) | Upgrade | "You're close to the 50-trade limit" |
| Trial day 10 | S5 | Convert | "Your trial ends in 4 days" with what they've used (no discounts) |
| Inactive 14 d | S7 | Win-back | One short message, one link |
| 1–30 Dec | Challenge list | Community | Day prompts (every 2–3 days), then graduation + upgrade on day 28–30 |
Founding offer: mention only once its checkout is verified, while seats remain, and never as a countdown that isn't real.

## Capture beyond signup
Add an email-only form for people not ready to sign up (e.g. `/challenge`: "Join the 30-day Journal Challenge", stores email, source and consent). This is the cheapest list for the Dec 1 launch and a destination for videos and partners.

## Build items (in order, Claude)
1. Migration: `profiles.marketing_opt_in`, `marketing_opt_in_at`; `email_events` (user_id, template, sent_at, clicked_at) for dedupe and measurement; `challenge_signups` (email, source, consent_at, unsubscribed_at).
2. Signup checkbox + settings toggle; footer + `List-Unsubscribe` on marketing templates.
3. `/api/cron/lifecycle`: daily job (same `CRON_SECRET` pattern, GitHub Actions schedule) that finds due recipients per segment, respects caps and opt-in, sends, logs.
4. Templates for the sequence above; unit tests for segment rules and caps (same style as `reminders.test.ts`).
5. `/challenge` capture page + broadcast script for the Challenge list.
6. Click measurement: link param `?em=<template>` recorded on first visit.
**Owner steps:** set `CRON_SECRET` in Vercel plus `CRON_SECRET` and the endpoint URL as GitHub Actions secrets; confirm the sending domain in Resend is verified (SPF/DKIM) and send a test to your own inbox from `EMAIL_FROM`.

## Capacity and cost
Free tier limits cap you near 100 emails/day. A signup now gets ~6 emails in 14 days, so ~15–20 new signups a day already uses the daily cap. When volume passes about 90/day, move to the paid tier (roughly $20/month; verify) or pace sends. The code's caps stop it before the provider does.

## Measure (weekly, in HQ)
Signups logging a first trade within 3 days (baseline unknown: record it first), activated → trial rate, trial → paid rate, unsubscribe rate (aim < 1% per send), spam complaints (aim < 0.1%), clicks per template. Treat open rates as unreliable (mail apps pre-load images).
Realistic expectation (assumption): good lifecycle emails lift activation by several points and recover some stalled signups; with ~0 signups today the first step is traffic.
