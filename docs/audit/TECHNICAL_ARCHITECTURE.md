# Technical architecture
Verified from code on 2026-11-11 (historical assumptions "Neon" and "Better Auth" checked: **Better Auth is correct; the database is Supabase-hosted Postgres**, used only as Postgres — not Supabase Auth or its Data API).

## Request path
```
Browser ──► Vercel (Next.js 15.5.29, Node runtime)
            middleware: cookie present? else → /login  (optimistic only)
            page / server action / route
              └─ getContext(): Better Auth session check (DB) ──► user id
                   └─ withUser(id): BEGIN; SET LOCAL ROLE app_user; set_config('app.user_id', id)
                        └─ queries ── Postgres RLS: user_id = tradenotes.uid() on every user table
HandyPay ──► POST /api/webhooks/handypay (HMAC verified) ──► owner connection (bypasses RLS; only writer of billing tables)
App ──► HandyPay API (checkout, cancel, resume, portal) · Resend API (email)
```

## Security model — defence in depth
1. **Authentication:** Better Auth sessions (30 days, httpOnly cookie, DB rate limit 30/min on auth endpoints, email verification + reset when Resend is configured).
2. **Authorisation in the database, not the app:** request handlers run as `app_user` with the user id set per transaction. Row-level security restricts every user table. A forgotten `WHERE` returns nothing, not someone else's data.
3. **Ownership triggers:** a trade can only reference the same user's account/strategy/import; exits/screenshots only the same user's trade (RLS alone checks `user_id` only).
4. **Privilege separation:** `app_user` cannot write `subscriptions`, `payments`, `billing_events`, `audit_log`, or read login tables. Plans therefore cannot be self-granted.
5. **Build gate:** every deploy re-verifies structure, policies, triggers, grants and a two-user isolation test (42 checks) and fails closed.

## Subscription design (new)
- **Checkout:** server action → HandyPay `POST /subscription-sessions` (inline form) with `metadata {user_id, plan}`; redirect to hosted page. Redirect back never activates anything.
- **Activation:** only signed webhooks. `billing_events.id` (provider event id) is the primary key → duplicate deliveries are no-ops. Pure reducer `applyEvent` decides state; stale (older) events and events for a replaced subscription are ignored.
- **Entitlement:** `effectivePlan()` computed server-side on every request from the DB row; the trade-limit check runs inside the insert transaction.
- **Fallback:** if `HANDYPAY_API_KEY` is absent, the app shows the static checkout links and the manual-activation copy (previous behaviour). If the webhook can't identify a user, the event is stored as `ignored:no-matching-user` for manual handling.

## Decisions taken this round
| Decision | Options | Choice + why |
|---|---|---|
| Payment provider | Keep HandyPay; Stripe; Paddle/Lemon Squeezy (MoR) | **Keep HandyPay** — documented subscriptions, HMAC webhooks, cancel/resume/portal/refunds, USD, Jamaica-native; already set up. See PAYMENT_PROVIDER_EVALUATION |
| Webhook payload shape | Wait for test delivery; code to Stripe-style names | Coded to the documented envelope + Stripe-style object fields, tolerant of both `data.object` and `data`. **Must be confirmed with one real test-mode delivery** |
| Past-due access | Cut immediately; grace | 3-day grace after paid period (matches Fable's copy) |
| Account deletion | Email-only; self-service | Self-service with password + typed confirmation; cancels live subscription first |
| Next's bundled PostCSS advisory | Ignore (build-time only); upgrade Next 16; override | `overrides` to postcss 8.5.32 → `npm audit` 0 |
