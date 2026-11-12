# Feature comparison table

Source of truth for limits: `src/lib/plans.ts`. Source for the on-screen table: `src/lib/plan-features.ts` (rendered by `PlanComparison` on `/pricing` and `/app/billing`).

Legend: ✓ included · — not included · **Now** = built and tested · **Build** = requires implementation · **Roadmap** = future.

## 1. Available now
| Feature | Free $0 | Standard $12 | Premium $24 | Enforced by |
|---|:-:|:-:|:-:|---|
| Trades you can store | 50 | 2,000 | Unlimited | Server, inside the save transaction |
| Manual trade entry (long/short, partial exits, fees, forex lots, other quote currencies) | ✓ | ✓ | ✓ | — |
| Risk plan and R-multiples | ✓ | ✓ | ✓ | — |
| Notes, emotion and mistake tags | ✓ | ✓ | ✓ | — |
| Trade detail page | ✓ | ✓ | ✓ | — |
| Dashboard (8 metrics, equity curve, review list, date range) | ✓ | ✓ | ✓ | — |
| Analytics breakdowns (strategy, instrument, session, direction, weekday, mistake, emotion) | ✓ | ✓ | ✓ | — |
| Plain-English explanations and metric guide | ✓ | ✓ | ✓ | — |
| Light and dark appearance | ✓ | ✓ | ✓ | — |
| Trading accounts | 1 | 1 | 1 | No UI to add more |

## 2. Requires implementation (shown on site as "In development — not available yet")
| Feature | Free | Standard | Premium | What is missing |
|---|:-:|:-:|:-:|---|
| CSV import | — | ✓ | ✓ | Upload page, mapping UI, insert action, rollback (parser exists) |
| Trade screenshots | — | ✓ | ✓ | File storage, upload action, limits |
| Calendar view and weekly reviews | — | ✓ | ✓ | Pages; `reviews` table exists |
| Multiple trading accounts | — | Up to 2 | Up to 10 | Create/switch UI; per-account statistics |
| Strategy comparison | — | — | ✓ | Page only; engine supports it |
| Edit a saved trade | ✓ | ✓ | ✓ | Update action (not shown in the public table; it is a fix, not a feature) |
| More journal filters | ✓ | ✓ | ✓ | Query parameters |
| Data export (CSV) | ✓ | ✓ | ✓ | Export route |

## 3. Roadmap (not shown as plan features anywhere except backtesting, which is labelled in development)
| Feature | Intended tier | Blocker |
|---|---|---|
| Backtesting with historical replay | Premium | Market-data licence |
| Trade replay on candles | Premium | Market data |
| AI weekly review summary | Premium | API cost, design |
| Broker CSV presets | Standard | After generic import |
| Broker / prop-firm sync | Premium or higher | Per-broker integrations |
| Annual billing | Standard, Premium | Annual checkout link |

## Rule for the interface
Section 1 rows may be shown with a tick. Section 2 rows may only appear under the amber "In development — not available yet" heading. Section 3 rows do not appear in the product, with the single exception of backtesting, which the founder's existing copy already discloses.
