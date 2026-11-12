# Upgrade and paywall flows

There is exactly **one** paywall in the product today: the trade limit. Every other feature is available on every plan. This document lists every place a plan is mentioned inside the app, the exact rule, and the flows that need backend work.

## Rules for any upgrade prompt
- Appears only where the user has just met a real limit, or on the plan pages. Never as a banner on Dashboard, Journal or Analytics.
- States the fact first, then the reassurance, then the option.
- Always offers a way to continue without upgrading.
- Uses the amber `warn` notice, not red: reaching a limit is not an error.
- Never blocks reading, exporting or deleting.

## Flow 1 — approaching the limit (available now)
Trigger: `limit − used ≤ max(5, 10 % of limit)` on `/app/journal/new`.
> **3 of 50 trades left on the Free plan.** See plans

Neutral notice above the form. The form works normally.

## Flow 2 — at the limit, before typing (available now)
Trigger: `!canAddTrade(plan, used)` when `/app/journal/new` renders. The form is not shown, so nobody fills thirty fields to be refused.
> **You've used all 50 trades on the Free plan**
> Everything you've logged stays available, and your statistics keep working. To log more trades, move to a plan with a higher limit.
> [See plans] [Back to journal]

## Flow 3 — limit reached at save (available now)
Trigger: the `createTrade` transaction finds the count at the limit (for example two tabs). The action returns `{ code: "limit", message, values }`.
> **You've reached your plan's trade limit**
> Your Free plan allows 50 trades. Upgrade to log more. Nothing was saved. Your existing trades and statistics are not affected.
> [See plans]

The typed values remain in the form.

## Flow 4 — choosing a plan (available now)
```
Pricing "Choose Standard" ─→ /app/billing?plan=starter   (login first if signed out)
Any "See plans" link     ─→ /app/billing
        │
        ▼
Plan & billing: the chosen card is outlined and its button is primary; the comparison table is open
        │  "Subscribe to Standard ↗"  (new tab, Handypay)
        ▼
Handypay hosted checkout  ──(no return path today)──▶  user comes back by themselves
        │
        ▼
Plan & billing still shows the old plan; step 2 explains why
        │  owner confirms payment and sets the plan (manual SQL)
        ▼
Next page load: plan name, "Active" badge, new limit
```

## Flow 5 — downgrade / cancel (available now, off-site)
Plan & billing explains: use the Handypay receipt link or email support → no further charges → paid access until the period ends → Free. The Free card on a paid account reads: "To move to Free, cancel your subscription (see below). You keep paid access until the period you paid for ends."

## Flow 6 — lapsed subscription (available now)
Trigger: a subscription row for a paid plan whose `effectivePlan()` is `free` (status not active/trialing, or `current_period_end` in the past).
> **Your Standard subscription is no longer active (past due).**
> Your account is on the Free plan. All your trades and statistics are still here; you can't add new trades while you hold more than 50. Subscribe again below to restore your limit.

## Flows that require implementation
### A. Checkout return (needs H-3)
| Return | Screen |
|---|---|
| `/app/billing?checkout=success` | Green notice: "Payment received. Your Standard plan is being activated — this page updates on its own." Poll or refresh until the plan changes; after 60 s fall back to "This is taking longer than usual; you have been charged once. We'll email you when it's active." |
| `/app/billing?checkout=cancelled` | Neutral notice: "Checkout was closed. You have not been charged." |
| Payment failed at provider | Stay on provider's page; on return show: "The payment didn't go through. You have not been charged. Try again or use another card." |

### B. Renewal failure (needs H-3)
| State | Where | Message |
|---|---|---|
| `past_due` inside grace period | Plan & billing (amber) + one line at the top of Settings | "Your last payment didn't go through. We'll try again on {date}. Update your payment method to keep Standard." Paid features keep working during the grace period |
| Grace over | Flow 6 | — |

### C. Cancel inside the app (needs H-3)
1. "Cancel subscription" (secondary button, bottom of the plan card).
2. One confirmation screen: "Cancel Standard? You keep Standard until {date}. After that your account moves to Free. Your {n} trades stay; you won't be able to add new ones while you have more than 50." [Cancel subscription] [Keep Standard]
3. Result: "Cancelled. Standard stays active until {date}." with a [Resume subscription] button until that date.
No survey before the confirmation. An optional one-question "what was missing?" may appear **after** cancellation is complete.

### D. Switch plan (needs H-3)
| Change | Behaviour to implement | Copy |
|---|---|---|
| Standard → Premium | Immediate; charge the prorated difference or start a new period (provider-dependent) | "Premium starts now. Today you'll be charged {amount}; then $24 on {date} each month." |
| Premium → Standard | At the end of the current period | "You keep Premium until {date}, then Standard at $12 / month." |

### E. Future feature gates (when CSV import, screenshots, accounts exist)
Pattern for a feature the plan doesn't include: the entry point stays visible with a small "Standard" badge; opening it shows the page with an amber panel in place of the tool — what it does, which plan includes it, price, [See plans]. No blurred previews, no fake data behind glass. The server action must refuse independently.
