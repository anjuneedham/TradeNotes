# Billing interface specification

Screen: `/app/billing` ("Plan & billing"), reached from Settings. Summary also shown as the first section of `/app/settings`.

## Layout (top to bottom)
1. **Status panel** — only when lapsed (amber) — or, when built, checkout result / payment problem.
2. **Current plan card** — name, status badge, price per month, renewal line, usage meter.
3. **Change plan** — three cards (Free, Standard, Premium).
4. **How subscribing works** — three numbered steps.
5. **Cancelling, downgrading and failed payments** — four short answers.
6. **Compare all plans** — collapsible table; open when arriving with `?plan=`.

## Data the screen reads today
| Value | Source |
|---|---|
| Effective plan | `getContext().plan` (`effectivePlan(sub)`) |
| Raw subscription | `getContext().sub` → `plan`, `status`, `current_period_end` |
| Trades used | `select count(*) from tradenotes.trades` (under RLS) |
| Limits, prices, names | `PLANS` |
| Checkout links | `CHECKOUT_URLS` |
| Support address | `LEGAL.supportEmail` (currently unset → generic "contact support") |

## States
| # | State | Condition | Status | Presentation |
|---|---|---|---|---|
| 1 | Free | no row or `plan = free` | Now | "Free", "$0 / month", "No charge. No card on file.", meter n / 50 |
| 2 | Free, near limit | used ≥ 80 % | Now | Meter amber |
| 3 | Free, at limit | used ≥ limit | Now | Meter red + "You've reached this plan's limit. Existing trades stay available; new trades need a higher plan." |
| 4 | Arrived to buy | `?plan=starter|pro` | Now | That card outlined, primary button, comparison open |
| 5 | Paid, active | `status = active`, period not ended | Now | "Active" badge; "Paid through {date}. Renews automatically each month unless cancelled." (date shown only when present) |
| 6 | Paid, trialing | `status = trialing` | Now (no trial is offered) | "Trial" badge |
| 7 | Lapsed | paid row but effective plan is Free | Now | Amber panel with plan name and status |
| 8 | Paid, awaiting activation | payment made, not yet applied | **Build** | Needs a pending marker — see H-3 |
| 9 | Checkout success / cancelled | return parameters | **Build** | See flows A |
| 10 | Past due in grace | `status = past_due` + grace end | **Build** | See flows B. Today `past_due` falls straight to state 7 |
| 11 | Cancelled, still in period | `cancel_at_period_end = true` | **Build** | "Cancelled. Standard stays active until {date}." + Resume. Today this cannot be distinguished from state 5 |
| 12 | Founding discount applied | discount fields | **Build** | Price line: "$6 / month until {date}, then $12" |

## Plan card rules
| Card | Current plan | Other plan |
|---|---|---|
| Free | "This is your current plan." | "To move to Free, cancel your subscription (see below)…" (no button — there is nothing to buy) |
| Standard / Premium | "Your plan" badge, "This is your current plan." | "Subscribe to {name} ↗" opening Handypay in a new tab, with screen-reader text saying so |

Until switching is implemented (H-3), an active paid subscriber does **not** get a checkout button on the other paid plan, because the static link would start a second subscription. The card says: "To switch to Premium, email support so we can move your existing subscription. Subscribing again here would start a second one."

## Billing history (requires implementation)
When payments are stored: a table under the plan card — Date · Description · Amount · Status (Paid / Failed / Refunded) · Receipt link. Newest first, ten rows, "Show older". Phones: one card per payment. Empty: "No payments yet." Until then the screen says receipts are emailed by Handypay.

## Copy that must stay accurate
These sentences make promises. If the behaviour changes, change the sentence in the same commit:
- "usually within a few hours and within one business day" (activation time)
- "You keep your paid plan until the end of the period you've paid for"
- "Nothing is deleted. You can view and analyse every trade you've logged"
- "There is no cancellation fee and no questions to answer first"
- Refunds: the page defers to the Terms (`LEGAL.refundDays`, currently 14 days from first payment).

## Accessibility
Usage meter has `role="meter"` with numeric values and a text equivalent beside it. Status is always text plus badge, never colour alone. External checkout links announce "opens Handypay checkout in a new tab".
