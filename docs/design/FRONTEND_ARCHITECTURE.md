# Frontend architecture

Framework unchanged: **Next.js 15 App Router, React 19, Tailwind v4, server components + server actions.** No new npm dependencies were added. Two font files (IBM Plex, SIL Open Font License) are committed under `src/app/fonts/` and loaded with `next/font/local`, so there is no request to a font service.

## Layout tree
```
src/app/layout.tsx              fonts + tokens only (no chrome)
├─ (marketing)/layout.tsx       public header + footer        → /, /pricing, /learn, /legal/*
├─ (auth)/layout.tsx            logo + centred card + footer  → /login, /signup, /forgot-password, /reset-password
└─ app/layout.tsx               reads theme cookie, renders <AppNav>
   ├─ page.tsx                  Dashboard
   ├─ analytics/page.tsx        Analytics (new)
   ├─ journal/page.tsx          Journal list
   ├─ journal/new/page.tsx      Log a trade
   ├─ journal/[id]/page.tsx     Trade detail, read-only (new)
   ├─ settings/page.tsx         Settings (new) + actions.ts (preferences)
   ├─ billing/page.tsx          Plan & billing
   └─ onboarding/page.tsx       Onboarding (nav hidden)
```
Route groups `(marketing)` and `(auth)` do not change any URL. Marketing and legal pages are still statically prerendered.

## Component boundaries
| File | Kind | Responsibility |
|---|---|---|
| `components/ui.tsx` | server | Primitives: `Field`, `Card`, `Notice`, `Badge`, `PageHeader`, `EmptyState`, `Eyebrow`, `Segmented`, `Meter`; class constants `inputCls`, `btnCls`, `btnGhostCls`, `btnDangerCls`, `linkCls` |
| `components/stats.tsx` | server | `Stat` (one figure), `Breakdown` (group table with bars) |
| `components/EquityCurve.tsx` | client | The only chart. Hover/touch read-out |
| `components/AppNav.tsx` | client | Sidebar (≥768 px), top bar + bottom tab bar (<768 px), active state via `usePathname` |
| `components/TradeForm.tsx` | client | Trade entry; owns direction, market, tag selections and the live risk read-out |
| `components/ConfirmDelete.tsx` | client | Two-step destructive button used inside a server-action form |
| `components/PlanComparison.tsx` | server | Tier comparison table (pricing + billing) |
| `components/Logo.tsx`, `SiteFooter.tsx`, `LegalShell.tsx` | server | Chrome |

Client components are limited to the four places that need state. Everything else renders on the server.

## Data on the presentation side
| File | What it is |
|---|---|
| `lib/trades-data.ts` | Read model for Dashboard and Analytics: `loadTrades()` (the original dashboard query moved here, plus `opened_at`, `mistakes`, `emotions`), date-range helpers, `tagSummary()`, `worstTrade()`. Pure functions over the existing metrics engine; unit-tested |
| `lib/plan-features.ts` | Display rows for pricing/billing. Limits are read from `PLANS`; nothing here grants access |
| `lib/format.ts` | `money`, `signedMoney`, `signedR`, `pct`, `num`, `dateTime`, `shortDate`, `plain` |

Untouched: `lib/metrics.ts`, `lib/trade-schema.ts`, `lib/entitlements.ts`, `lib/db.ts`, `lib/auth.ts`, `lib/app-context.ts`, `middleware.ts`, all SQL under `db/`.

## Rules for new screens
1. Start with `<PageHeader>`; one primary button (`btnCls`) per view.
2. Money, counts, prices and dates use the `fig` class (monospace, tabular).
3. Results always carry a sign (`signedMoney`); colour is never the only signal.
4. Messages use `<Notice kind>`; empty lists use `<EmptyState>`.
5. Any horizontally scrolling box must be `relative overflow-x-auto` (screen-reader-only text inside otherwise widens the page).
6. No per-page colours, radii or font sizes outside the tokens in `globals.css`.
7. Tables become cards below `lg` when they have more than four columns.
8. A screen that depends on something not built says so in plain words; it never renders a disabled control that looks available.

## State and URLs
All view state is in the URL (`?range=`, `?q=`, `?side=`, `?status=`, `?page=`, `?plan=`), so every view is linkable and survives refresh. Flash messages use `?saved=1` / `?deleted=1` (existing convention). Theme is a `tn_theme` cookie read in `app/layout.tsx`; marketing and auth pages follow the device setting.

## Performance notes
- First-load JS is 103–108 kB on every route except the trade form (138 kB, zod schema imported for constants — could be split later).
- Dashboard and Analytics still load every trade (≤10,000) per request, as before. Fine at launch; see handoff H-9.
- Pages inside `/app` run `getContext()` once each. The layout deliberately does not call it (it would double the queries); that is why the navigation shows no plan badge yet (H-7).
