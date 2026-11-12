# Subscription experience

## Principles
1. The user always knows **which plan they are on, what it includes, what it costs, when they are charged, and what happens if they cancel.**
2. The interface describes; the server decides. Entitlements are enforced in server code (`effectivePlan`, `canAddTrade`, inside the save transaction). Nothing in the frontend grants or removes access.
3. No dark patterns: no pre-selected upgrades, no countdowns, no guilt copy, no hidden cancel, no retention questionnaire. Cancelling is described as plainly as subscribing.
4. Data is never held hostage. Lapsing or downgrading blocks adding, never reading.
5. Say what is true today, including that activation is manual.

## The experience as built (available now)
| Moment | Where | What the user sees |
|---|---|---|
| Discovering plans | `/pricing`, landing "Plans" | Three cards, price per month, what each adds, "in development" lists, the sentence that paid plans mainly raise the trade limit today, comparison table, five billing questions |
| Choosing a paid plan while signed out | `/pricing` → "Choose Standard" | Goes to `/app/billing?plan=starter`; signed-out visitors are sent to log in first, and the card says "You'll create a free account first" |
| Seeing my plan | Settings (first section); Plan & billing | Plan name, price, limit, status badge, paid-through date when known |
| Seeing my usage | Plan & billing | "47 of 50 trades" with a meter (amber from 80 %, red at 100 %) |
| Approaching the limit | Log a trade | Neutral notice when 5 or fewer (or 10 %) remain, with a link to plans |
| At the limit | Log a trade | The form is replaced by an amber panel: what happened, that nothing is lost, "See plans" and "Back to journal" |
| Limit hit between page load and save | Log a trade | Same amber panel above the form (server returned `code: "limit"`); nothing was saved |
| Subscribing | Plan & billing | Button opens Handypay in a new tab; three numbered steps explain: pay with the same email → we activate by hand (hours, up to one business day) → charged monthly |
| Waiting for activation | Plan & billing | Step 2 says the page will still show the old plan until activation and that this is expected |
| Active paid plan | Plan & billing, Settings | "Active" badge, price, "Paid through {date}. Renews automatically each month unless cancelled." |
| Cancelling / downgrading | Plan & billing → "Cancelling, downgrading and failed payments" | How (Handypay receipt link or support), what happens next (access until period end, then Free), no fee |
| Lapsed (cancelled, unpaid, or past period end) | Plan & billing | Amber panel naming the old plan and status, stating the account is on Free, data is intact, how to restore |
| Billing history | Plan & billing | One sentence: receipts are kept by Handypay and emailed; not shown here yet |

## What is not yet possible (requires Opus — see handoff H-3)
| Wanted | Why it can't be built in the frontend today |
|---|---|
| Automatic activation after payment | No webhook; checkout links carry no user id |
| "Payment received — activating" state | The app is never told a payment happened |
| Success / failure page after checkout | Handypay links have no return URL configured |
| Cancel or switch plan inside the app | No provider API integration |
| Renewal date for every subscriber | `current_period_end` is filled by hand |
| Billing history / receipts | Not stored |
| Founding-member discount | No coupon mechanism |
| Annual billing | No annual checkout link |

The target designs for each of these are in `BILLING_INTERFACE_SPECIFICATION.md` and `UPGRADE_AND_PAYWALL_FLOWS.md`, written so they can be switched on when the data exists.

## Wording standards
| Situation | Say | Don't say |
|---|---|---|
| Limit reached | "You've used all 50 trades on the Free plan." | "Upgrade now to unlock!" |
| Unbuilt feature | "In development — not available yet." | "Coming soon" |
| Manual activation | "Activation is done by hand right now, usually within a few hours and within one business day." | "Instant access" |
| Cancel | "No further charges. You keep your paid plan until the end of the period you've paid for." | "Are you sure you want to lose…" |
| Price | "$12 / month", always with the period | "$12" alone |
