# Opus ⇄ Fable handoff

Owner split: **Opus** — backend, database, auth security, API, payments, webhooks, entitlement enforcement, infrastructure, e2e, legal. **Fable** — design, frontend architecture, presentation.

This file lists (A) what I changed that touches your territory, so nothing is silent, and (B) every dependency the frontend has on you, with a contract for each.

---
## A. Changes made in this round that you should review

| # | Change | File | Why | Risk |
|---|---|---|---|---|
| A1 | `FormState` gained optional `code?: "limit"`; `createTrade` sets it on the plan-limit refusal | `src/app/app/journal/actions.ts` (2 lines) | Lets the form show an upgrade panel instead of a generic error | Additive; no other behaviour changed |
| A2 | Plan **display names** `Starter`→`Standard`, `Pro`→`Premium` | `src/lib/plans.ts` | Founder's tier names | Ids `starter`/`pro` unchanged; DB, checkout links and `effectivePlan` unaffected. Older docs (`BUSINESS_PLAN`, `DEPLOYMENT`, `FEATURE_ROADMAP`) still say Starter/Pro |
| A3 | New read queries, all inside `getContext().db` (RLS): dashboard query moved to `lib/trades-data.ts` with three extra columns (`opened_at`, `mistakes`, `emotions`); trade detail (`select t.* … where id = $1`, exits, newer/older ids); `count(*)` of trades on billing and new-trade pages | `lib/trades-data.ts`, `journal/[id]/page.tsx`, `billing/page.tsx`, `journal/new/page.tsx` | New screens | Read-only. Please confirm `t.*` is acceptable on the detail page or name the columns you want exposed |
| A4 | Journal list query: joined `strategies` for the name; added `status` filter (`open` = exited quantity < position size, matching the metrics engine) | `journal/page.tsx` | Filter + column | Correlated subquery per row on a 25-row page; fine now, index later if needed |
| A5 | New server action `savePreferences`: `update tradenotes.profiles set show_explanations = $1 where id = $2`; sets/deletes cookie `tn_theme` (`light`/`dark`, httpOnly, lax, 1 year) | `src/app/app/settings/actions.ts` | Preferences | Same pattern as onboarding. No CSRF handling beyond Next's server-action origin check — same as existing actions |
| A6 | Privacy policy: added `tn_theme` to the cookie list | `(marketing)/legal/privacy/page.tsx` | Keep the policy true | Wording needs your/counsel's review |
| A7 | e2e: one line added (delete is now two clicks) | `scripts/e2e.js` | Intentional UI change | 30/30 pass |
| A8 | Pages moved into route groups `(marketing)`; root layout no longer renders header/footer | `src/app/**` | Separate chrome per area | URLs unchanged; marketing/legal still static |
| A9 | Root `metadata.title` no longer says "Backtesting"; hero no longer says "test changes before you risk money" | layout, landing | Not built | — |
| A10 | Two font files added (IBM Plex, OFL licence included) | `src/app/fonts/` | Typography without a third-party request | +92 kB in repo; no new npm dependency |

Nothing was changed in: `db/`, `lib/metrics.ts`, `lib/trade-schema.ts`, `lib/entitlements.ts`, `lib/db.ts`, `lib/auth.ts`, `lib/app-context.ts`, `middleware.ts`, `(auth)/actions.ts`, `next.config.ts`, `package.json`.

---
## B. Dependencies

Priority: **P0** blocks users today · **P1** needed before charging money · **P2** next · **P3** later.

### H-1 · P0 · Futures trades cannot be saved (existing bug)
- **Observed:** choosing Market = Futures and saving returns "Could not save the trade. Nothing was saved". Reproduced locally.
- **Cause:** `ASSET_CLASSES` in `lib/trade-schema.ts` contains `"futures"`; the table check is `asset_class in ('stock','option','future','forex','crypto','other')`.
- **Needed:** make the two agree (either side). If the stored value becomes `future`, tell me and I will map the label only.
- **Acceptance:** e2e logs a futures trade (label "Contracts") and sees it in the journal.

### H-2 · P1 · Edit a saved trade
- **Frontend:** "Edit" on trade detail → `/app/journal/[id]/edit` using `TradeForm` pre-filled.
- **Backend:** `updateTrade(prev, formData)` with the same `tradeFormSchema`; one transaction: verify ownership (RLS), upsert strategy, update trade, replace exits, recompute `initial_risk`; no plan-limit check.
- **Data to pre-fill:** all `trades` columns the form has + exits in order + strategy name. Datetimes in the form's `datetime-local` format.
- **Validation / errors:** identical `FormState` shape (`errors`, `message`, `values`).
- **Success:** redirect `/app/journal/{id}?saved=1`.
- **Acceptance:** editing an exit price changes journal P&L and dashboard totals; another user's id returns not-found.

### H-3 · P1 · Subscription automation
The billing screen is designed for these states but can only show what the table holds. See `BILLING_INTERFACE_SPECIFICATION.md` states 8–12 and `UPGRADE_AND_PAYWALL_FLOWS.md` A–D.
- **Needed fields on the subscription read** (names are suggestions):
  ```ts
  { plan: "free"|"starter"|"pro"; status: "active"|"trialing"|"past_due"|"canceled"|"unpaid"|"pending";
    current_period_end: string|null; cancel_at_period_end: boolean; grace_until: string|null;
    discount: { percent: number; ends_at: string } | null; manage_url: string|null }
  ```
- **Webhook:** signature verified, idempotent, writes with the owner connection. Checkout must carry the user id or a verified email.
- **Return URLs:** `/app/billing?checkout=success` and `?checkout=cancelled`.
- **Actions I will call:** `cancelSubscription()`, `resumeSubscription()`, `changePlan(plan)` — each returns `{ ok: true } | { ok: false; message: string }` and revalidates `/app`.
- **Billing history:** `[{ id, paid_at, description, amount, currency, status: "paid"|"failed"|"refunded", receipt_url }]`, newest first, paginated.
- **Decisions needed from you/founder:** grace period length; proration on upgrade; whether Handypay supports coupons, annual prices, switching, a customer portal.
- **Interim, already done in UI:** active subscribers get no checkout button on the other paid plan (prevents a duplicate subscription).
- **Acceptance:** pay in test mode → plan changes without manual SQL within a minute; cancel → badge shows end date; period passes → Free with data intact.

### H-4 · P1 · Limit behaviour on downgrade — please confirm
The UI promises: nothing is deleted; all trades stay readable and analysable; only adding is blocked while over the limit. That is what the code does today. If you ever change it, the sentences listed under "Copy that must stay accurate" in the billing spec must change with it.

### H-5 · P2 · User timezone
- **Today:** `datetime-local` values are parsed as UTC; tables say "UTC"; weekday stats are UTC. The form now tells the user ("Stored and reported in UTC").
- **Needed:** `profiles.timezone` (IANA); convert on write in the action; give me the zone in `getContext().profile`. I will format all times and the weekday breakdown in it and remove the UTC labels.
- **Acceptance:** a trade entered at 09:00 in Kingston shows 09:00 and counts on the local weekday.

### H-6 · P2 · Account self-service
| Capability | Contract | UI waiting |
|---|---|---|
| Edit trading account | `updateAccount({ name, currency?, starting_balance })`. Decide whether currency can change once trades exist (recommend: no) | Settings → Account (read-only today) |
| Change password signed in | `changePassword({ current, next })` → field errors; revoke other sessions | Settings → Security |
| Export my data | `GET /app/export` → CSV or ZIP of trades + exits | Settings → Your data |
| Delete my account | `deleteAccount({ password })` → cascade, sign out | Settings → Your data, two-step confirm |
Until then Settings tells users to email support.

### H-7 · P3 · Share context between layout and page
Wrap `getContext` in React `cache()` (or expose a cached `getPlanSummary()`), so `app/layout.tsx` can show a plan badge and usage in the sidebar without doubling queries.

### H-8 · P2 · Journal filters and sorting
Parameters I would send: `from`, `to` (dates), `strategy` (id), `outcome` (`win|loss|breakeven|open`), `mistake` (tag), `sort` (`opened_at|pnl|r`, `asc|desc`). `outcome` and P&L sorting need net P&L in SQL or a stored result column — your call.

### H-9 · P3 · Aggregation beyond 10,000 trades
Dashboard and Analytics load all trades and compute in Node (unchanged). A truncation notice exists. Move to SQL aggregation or cached summaries when a real account approaches the cap.

### H-10 · P1 · Legal review of interface claims
New user-facing promises live in: pricing FAQ, Plan & billing (activation time, cancellation, data on Free), Settings → Your data (deletion within `LEGAL.deletionDays`). Please check them against the Terms.

### H-11 · P2 · e2e coverage for new screens
Not covered yet: `/app/analytics`, trade detail, Settings preferences, journal status filter, limit notices, light theme, tablet. I can write these (plan 2.4) if you prefer to own only the harness.

### H-12 · P2 · Features the plans mention as "in development"
| Feature | What I need |
|---|---|
| CSV import | Upload action (5 MB cap), `previewImport` result to the client, confirm action inserting with `on conflict do nothing`, import history + rollback; gate on `PLANS.csvImport`; imported trades count toward the limit |
| Multiple accounts | `createAccount`, `renameAccount`, archive; current-account selection (cookie or profile column); every stats query filtered by account; gate on `PLANS.accounts` |
| Screenshots | Private storage, signed URLs, upload/delete actions, per-trade and per-file limits |
| Calendar / weekly review | Daily net P&L by local date (needs H-5); CRUD on `reviews` |

### H-13 · P1 · Email must be on before payment
Without `RESEND_API_KEY`: anyone can register any address, and password reset is unavailable. Payments are matched by email. The UI already explains both states; nothing more is needed from me.

### H-16 · P0 before launch · Support address and business name
`LEGAL.supportEmail` and `LEGAL.businessName` are placeholders. Every "email support" sentence in Billing, Settings and auth currently falls back to "contact support" with no address. **A paying customer cannot reach anyone.** Founder to fill `src/lib/legal.ts`.

### H-17 · P2 · Founding-member offer
Shown on pricing ("Ask for it after signing up"); no mechanism. Either implement (coupon/discount fields in H-3) or tell me to remove the line.

### H-18 · P3 · Annual billing
`PLANS.annual` exists; no annual checkout. Hidden from the UI until there is a link.

### H-19 · Questions for the tier decision
1. Handypay fee percentage and payout costs.
2. Does Handypay support: webhooks, metadata on checkout, coupons, annual prices, plan switching, customer portal?
3. Storage provider and cost for screenshots.
4. Is a 50-trade Free limit acceptable to the founder once CSV import exists (an import could exceed it in one file)?

### H-20 · P3 · Smaller items
- `/app/billing` is reachable before onboarding (`requireOnboarded: false`, as before) but the app navigation now shows around it; harmless, links bounce to onboarding.
- No `error.tsx` / `not-found.tsx` in `/app`: a thrown query shows the framework error page. I will add styled ones (plan 2.2); tell me if you want errors reported somewhere.
- Starting balance is collected but used by no statistic. Decide: use it (equity curve from balance, % return) or stop asking.
- Onboarding answers `trading_style`, `preferred_timeframe`, `main_goal` are stored and unused. I could default the trade form's timeframe from `preferred_timeframe` if you expose it in `Profile`.

---
## C. Contract summary: loading, error and empty states the frontend implements
| Screen | Loading | Error | Empty |
|---|---|---|---|
| Dashboard / Analytics | Server-rendered (no skeleton yet) | Red notice "We couldn't load your trades just now…" | Guided empty state / "No closed trades in this period" |
| Journal | Server-rendered | Framework error page (H-20) | "No trades yet" or "No trades match those filters" + clear |
| Trade detail | Server-rendered | Not-found for bad or foreign ids | Per-section "Nothing written" / "None tagged" |
| Trade form | Button "Saving…", disabled | Summary + per-field; values kept; limit panel | — |
| Billing | Server-rendered | Framework error page | Free state |
| Settings | Server-rendered | Framework error page | — |
