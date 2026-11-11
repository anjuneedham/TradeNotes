# Feature inventory (verified 2026-11-11)
Status: **Works** = exercised by an automated test this session · **Built, untested live** = works locally, not yet seen in production · **Not built**.

| Feature | Status | Evidence | Tier |
|---|---|---|---|
| Sign up / log in / log out | Works | e2e 53/53 | All |
| Email verification, password reset | Works with Resend configured | e2e-email 15/15 (fake Resend). **Off in production until domain + Resend** | All |
| Onboarding (experience, market, account) | Works | e2e | All |
| Log trade (forex lots, partial exits, FX conversion, risk/R, notes, emotions, mistakes, discipline) | Works | e2e + 21 schema tests | All |
| Futures trades | **Works (was broken)** | e2e "futures trade saves" | All |
| Edit trade | **Works (new)** | e2e: pre-fill, notes, P&L recalculation, restore | All |
| Delete trade (two-step) | Works | e2e | All |
| Journal list, search, open/closed filter, pagination | Works | e2e | All |
| Trade detail with notes, tags, risk plan | Works | e2e | All |
| Dashboard KPIs, equity curve, breakdowns, small-sample warnings | Works | e2e numbers = hand calculation | All |
| Analytics (strategy, session, weekday, instrument, mistake/emotion tags) | Works | e2e | All |
| Learn / metric explanations | Works | page renders | All |
| Plan limits (50 / 2,000 / unlimited) enforced server-side | Works | e2e-billing: limit at 50, lifted by webhook, restored after expiry | Per plan |
| Subscription checkout (HandyPay API) | Works against fake API | e2e-billing | Paid |
| Webhook activation, renewal, failure+grace, cancel, resume, expiry, re-subscribe | Works against signed fake events | 23 unit + 37 e2e | Paid |
| Payment history | Works | e2e-billing | Paid |
| Billing emails (confirmed, failed, cancelled, ended) | Works with fake Resend | e2e-billing | Paid |
| Welcome email | Works with fake Resend | e2e-billing | All |
| CSV export of own trades | **Works (new)** | e2e: own rows only, signed-out refused | All |
| Delete account (self-service) | **Works (new)** | e2e: wrong password refused; cascade leaves 0 orphans | All |
| Preferences (explanations, theme) | Works | e2e | All |
| Legal pages incl. new Subscription policy | Render | curl | — |
| CSV import (upload, column mapping, preview, duplicate skip, roll back) | **Works (new)** | e2e-billing: preview counts, save + P&L, re-import adds 0, rollback, Free gated | Standard, Premium |
| Multiple trading accounts | Not built (schema supports) | — | Planned Standard/Premium |
| Screenshots | Not built (table exists) | — | Planned |
| Calendar / weekly review | Not built (table exists) | — | Planned |
| Backtesting / replay | Not built | — | Roadmap Premium |
| Timezone per user | Not built (UTC, labelled) | — | — |
| Change password while signed in | Not built (reset by email works) | — | — |
| Admin dashboard | Not built | — | — |
| Founding-member discount | Copy only | — | — |
