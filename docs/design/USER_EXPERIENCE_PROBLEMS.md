# User experience problems

Ranked by harm to the user. **Status** says what happened in this round.

## Blocks the core job
| # | Problem | Evidence | Status |
|---|---|---|---|
| 1 | **Notes can be written but never read.** Pre-trade notes, post-trade notes, lessons, emotions, followed-plan and discipline score were saved and then invisible | No route displayed them | **Fixed** — trade detail page `/app/journal/[id]` |
| 2 | **Futures trades cannot be saved.** The form sends `futures`; the database only accepts `future`. The user sees "Could not save the trade" with no way forward | Reproduced locally; `trade-schema.ts` `ASSET_CLASSES` vs `trades.asset_class` check | **Not fixed — backend. Handoff H-1** |
| 3 | **A wrong trade cannot be corrected**, only deleted and re-typed | No edit action | **Not fixed — needs a server action. Handoff H-2.** The detail page says so plainly |
| 4 | **Delete was one click, permanent, and tiny** | Journal row | **Fixed** — two-step confirm |
| 5 | **Journal unusable on a phone**: P&L column off-screen | 390 px capture | **Fixed** — card list below 1024 px |

## Makes the product feel unfinished
| # | Problem | Status |
|---|---|---|
| 6 | Two navigation bars stacked in the app; public "Pricing / Learn" shown to signed-in users; no indication of the current page | **Fixed** — separate marketing/auth/app layouts; sidebar + mobile tab bar with active state |
| 7 | No settings page: no way to turn explanations back on/off, see the account, or log out on mobile without scrolling a wrapped nav | **Fixed** — `/app/settings` (read-only where no backend exists) |
| 8 | Hitting the plan limit showed a red error after filling the whole form | **Fixed** — usage warning before the limit; a calm upgrade panel instead of the form at the limit; the server still enforces |
| 9 | Billing page didn't show price, usage, renewal, or what cancelling does | **Fixed** to the extent the data exists; see `BILLING_INTERFACE_SPECIFICATION.md` |
| 10 | Tag selections wiped when the server rejected the form | **Fixed** |
| 11 | Emotions and mistakes were collected but never analysed | **Fixed** — analytics by mistake tag and by emotion; "costliest mistake" on the dashboard |
| 12 | No date range anywhere | **Fixed** — All time / This year / 90 days / 30 days on dashboard and analytics |
| 13 | Equity curve had no scale and no way to read a point | **Fixed** — axis values, hover/touch read-out |
| 14 | Landing page showed no product | **Fixed** — real dashboard components over clearly-labelled example data |
| 15 | Hero and page title implied backtesting exists | **Fixed** — removed from hero and title; listed under "in development" |

## Still open (need backend or a founder decision)
| # | Problem | Owner |
|---|---|---|
| 16 | Times are entered in local time but stored and reported as UTC; weekday stats are UTC | Opus — H-5 |
| 17 | Support email and business name are unset, so every "contact support" sentence has no address. A paying customer with a problem has nowhere to write | Founder — H-16 (**must be done before charging**) |
| 18 | After paying, nothing in the app changes until the owner runs SQL; the user cannot tell whether payment worked | Opus — H-3 |
| 19 | Cancelling requires leaving the app (Handypay email or support) | Opus — H-3 |
| 20 | Account name, currency and starting balance cannot be changed after onboarding; starting balance is collected but not used by any statistic | Opus — H-6; design decision pending on showing balance-based equity |
| 21 | No password change while signed in; no data export; no account deletion | Opus — H-6 |
| 22 | Journal can't be filtered by date, strategy, outcome or mistake | Opus — H-8 |
| 23 | Only one trading account, though plans advertise more (as "in development") | Opus — H-12 |
| 24 | Paid plans differ from Free only by trade limit | Founder + Opus — see tier recommendation |
