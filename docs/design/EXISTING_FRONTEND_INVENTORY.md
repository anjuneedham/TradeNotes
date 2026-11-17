# Existing frontend inventory (before redesign)

Snapshot of commit `1458f71`, taken by reading every file under `src/` and running the app locally against Postgres 16 (30/30 browser e2e checks passed before any change).

## Stack
| Layer | What is used |
|---|---|
| Framework | Next.js 15.5 App Router, React 19, TypeScript. Server components + server actions; no client data fetching, no API routes except Better Auth's |
| Styling | Tailwind CSS v4, 8 colour variables in `globals.css`, system font stack. No component library, no icon set, no chart library |
| Auth | Better Auth (email + password). Email confirmation and password reset only when `RESEND_API_KEY` is set |
| Data | `pg` directly; every user query runs inside `withUser()` (role `app_user` + row-level security) |
| Payments | Two static Handypay hosted-checkout links. Plan activation is manual SQL by the owner |
| Tests | Vitest unit tests (50), Playwright e2e script (30 checks), DB isolation tests |

## Routes that existed
| Route | Purpose | State |
|---|---|---|
| `/` | Landing: headline, 4 feature cards, 1 text block | Working. No product imagery |
| `/pricing` | 3 plan cards (Free / Starter / Pro), founding-member note | Working. Honest about unbuilt features |
| `/learn` | Glossary of 9 metric explanations | Working |
| `/legal/terms`, `/privacy`, `/disclaimer` | Legal drafts rendered from `lib/legal.ts` | Working; show a warning because business name and support email are unfilled |
| `/login`, `/signup`, `/forgot-password`, `/reset-password` | Auth forms | Working; reset shows "not available" without email provider |
| `/app/onboarding` | 5 questions + first account + explanations toggle | Working |
| `/app` | Dashboard: 8 KPIs, equity curve, 5 breakdown tables, empty state | Working |
| `/app/journal` | Trade table: search by instrument, direction filter, pagination, delete | Working |
| `/app/journal/new` | Trade entry form (about 30 fields) | Working, except futures (see handoff H-1) |
| `/app/billing` | Current plan, two checkout links, manual-activation note | Working |

## Components that existed
| File | Contents |
|---|---|
| `components/ui.tsx` | `inputCls`, `btnCls`, `btnGhostCls` class strings; `Field`, `Card`, `Notice` |
| `components/TradeForm.tsx` | The whole trade form (client component, `useActionState`) |
| `components/EquityCurve.tsx` | Static SVG line, no axis values, no interaction |
| `components/LegalShell.tsx` | Wrapper + warnings for legal pages |
| `app/layout.tsx` | One global header (logo, Pricing, Learn) and footer for every page, including the signed-in app |
| `app/app/layout.tsx` | A second horizontal nav bar under the global header |

## Features with data behind them
| Feature | Exists in UI? | Notes |
|---|---|---|
| Manual trade entry: long/short, size, entry, 2 exits, fees, stop, target, multiplier default, quote currency + FX rate | Yes | |
| Tags: strategy, timeframe, session, emotions (9), mistakes (10), followed plan, discipline 1–5 | Entry only | |
| Notes: pre-trade, post-trade, lesson | **Entry only — could never be read back** | No detail page |
| Metrics: net P&L, win rate, profit factor, expectancy, avg win/loss, avg R, max drawdown, streaks | Yes | `lib/metrics.ts`, well tested |
| Breakdowns: strategy, instrument, session, direction, weekday | Yes | |
| Plan limit on trade count (50 / 2,000 / unlimited) | Yes, enforced in the save transaction | |
| Onboarding answers (experience, market, style, timeframe, goal) | Stored | Only `experience_level`, `primary_market`, `show_explanations` are used afterwards |

## Things that exist in code or schema but have no interface
| Item | Where | Status |
|---|---|---|
| CSV import parser, column guessing, duplicate detection | `lib/csv-import.ts` (tested) | No page, no insert action |
| Multiple accounts | `accounts` table; `PLANS.accounts` 1/2/10 | No way to add a second account |
| Screenshots, reviews, imports tables | `db/paste/04_*.sql` | No UI, no storage |
| Annual prices | `PLANS.annual` | No checkout link |
| Founding-member discount | `FOUNDING_OFFER` | Text only; no coupon mechanism |
| Admin flag | `profiles.is_admin` | No admin UI |

## Things that do not exist at all
Trade editing, calendar view, weekly reviews, backtesting, broker sync, data export, account deletion, password change while signed in, profile editing after onboarding, billing history, automatic subscription activation, cancellation inside the app, notifications, error monitoring.

## Subscription-related interface that existed
`/pricing` cards; `/app/billing` (plan name, status line, two links, one paragraph); one sentence returned by `createTrade` when the limit is hit ("Upgrade to log more.") shown as a red error with no link.
