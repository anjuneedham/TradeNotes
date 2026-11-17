# Subscription tier recommendation

## Founder's requirement
| Tier | Name | Price |
|---|---|---:|
| T1 | Premium | US$24 / month |
| T2 | Standard | US$12 / month |
| T3 | Free | US$0 |

Implemented: display names are now **Free / Standard / Premium**. The stored plan ids (`free`, `starter`, `pro`) are unchanged, so nothing in the database, the checkout links or the entitlement code moved.

## Evidence
**What is actually built** (see `EXISTING_FRONTEND_INVENTORY.md`): manual journaling, notes and tags, eight metrics, equity curve, seven breakdowns, explanations. That is the whole product today.

**What each of those costs to deliver:** a few kilobytes of Postgres rows per user and a page render. From `docs/UNIT_ECONOMICS.md`, fixed costs are about $45–75 a month at launch regardless of user count. None of the built features has a meaningful per-user cost.

**What is enforced today:** one thing — the number of trades (`PLANS.tradeLimit`: 50 / 2,000 / unlimited), checked inside the save transaction. `csvImport`, `backtesting` and `accounts` exist as flags in `PLANS` but nothing reads them because those features are not built.

**What would cost real money** (from `docs/FEATURE_ROADMAP.md`, `docs/ARCHITECTURE.md`): licensed market data for backtesting (likely hundreds of dollars a month), AI summaries (~$0.01–0.05 per user per week), screenshot storage (small, grows with use).

Questions I could not answer from the repository and have put to Opus in the handoff (H-19): Handypay's fee percentage; whether Handypay supports coupons, annual prices, plan switching and a customer portal; storage choice and cost for screenshots.

## Recommendation
### Free — $0 — "start journaling and see your numbers"
- 50 trades in total (keep).
- **Every** journaling and analytics feature that exists.
- Purpose: adoption. Fifty trades is enough to form the habit and to hit the "under 30 trades" warning turning off — the moment the product proves itself.
- Never restricted on any tier: viewing your own trades, the explanations and risk warnings, exporting or deleting your data.

### Standard — $12 — "the full journal for an active trader"
| | Status |
|---|---|
| 2,000 trades | Available now |
| CSV import | Requires implementation (parser done; needs page + insert) |
| Trade screenshots | Requires implementation (needs storage) |
| Calendar view and weekly reviews | Requires implementation |
| 2 trading accounts | Requires implementation (schema ready; needs UI + account switcher) |
| More journal filters (date, strategy, outcome, mistake) | Requires implementation — recommend **Free**, it is basic usability |

### Premium — $24 — "no limits, and the costly features"
| | Status |
|---|---|
| Unlimited trades | Available now |
| 10 trading accounts | Requires implementation |
| Strategy comparison (two strategies side by side) | Requires implementation — no data cost, uses the existing engine |
| Backtesting with historical replay | Roadmap — blocked on a data licence |
| AI weekly review summary | Roadmap |
| Trade replay on candles | Roadmap |

## The honest problem, and what to do about it
**Today a paying customer buys a bigger number and nothing else.** Standard vs Free is a real difference (50 vs 2,000). **Premium vs Standard is not**: almost nobody logging by hand reaches 2,000 trades, so $24 currently buys nothing $12 doesn't.

Recommendations, in order:
1. **Keep saying so.** Pricing and billing state "today the paid plans mainly raise your trade limit". Do not remove that sentence until it stops being true.
2. **Do not steer people to Premium yet.** The pricing page marks Standard as "Most traders" and gives Premium a secondary button. Premium remains available for people who want to back the product early.
3. **Build the cheap differentiators first**, because they need no licence and no third party:
   - CSV import → makes Standard worth $12 on its own (and makes the 2,000 limit reachable).
   - Multiple accounts → the first real Standard/Premium split (2 vs 10).
   - Strategy comparison → first Premium-only analytic.
4. **Only then** spend on market data for backtesting, once Premium subscribers exist to cover it (3–10 at $24 per the business plan).
5. **Consider** making the Free limit "50 trades" visible as progress in the app (done: usage meter in Plan & billing, a notice in the trade form when 5 or fewer remain). Do not add nag banners elsewhere.

## Limits and rules to confirm with Opus
| Rule | Proposed | Why |
|---|---|---|
| Downgrade with more trades than the lower limit | All trades stay readable and analysable; adding is blocked until under the limit | Already how the code behaves; never hold data hostage |
| Deleting trades to get back under the limit | Allowed | Simple and fair |
| Imported trades | Count toward the same limit | One number to understand |
| Screenshots | Cap per trade (e.g. 4) and per file (e.g. 5 MB) | Bounds storage cost |
| Accounts on downgrade | Extra accounts become read-only, not deleted | Same principle |

## Things not recommended
- A free trial of paid tiers: there is nothing extra to try yet.
- Annual billing in the interface: `PLANS.annual` exists (25 % off) but there is no annual checkout link; the "annual billing coming soon" line was removed from the price cards until there is.
- Gating explanations, exports or statistics behind payment: it would contradict the product's positioning.
- Countdown timers, "only N left" pressure, pre-ticked upgrades, or making cancellation harder than subscribing.

The founding-member offer (first 10 payers, 50 % off for 12 months) is kept on the pricing page as written; it has no automated mechanism (H-17).
