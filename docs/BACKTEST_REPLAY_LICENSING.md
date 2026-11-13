# Chart replay for backtesting: cost and licensing recommendation (memo, 2026-11-13)
**Decision for the owner. Nothing was built and no vendor was contacted. No prices are quoted here because I did not verify any; get current quotes before deciding.**

## What exists today
The manual backtest log (Premium): you type in hypothetical trades from your own chart work, get the same metrics, and everything is labelled HYPOTHETICAL and kept apart from real results. TradeNotes supplies **no market data**. That is why it costs nothing to run beyond the screenshots quota.

## What "replay" would need
A bar-by-bar replay needs historical price data (per instrument, per timeframe), a chart component, and the right to show that data to paying users. The data is the cost and the legal risk, not the code.

## Options
| Option | Cost shape | Licensing risk | Verdict |
|---|---|---|---|
| A. Scrape or copy free chart sites / exchange pages | Free in money | **High**: terms of service almost always forbid redistribution; account or domain action is possible | Do not do this |
| B. Free public datasets or free API tiers | Free to low | Usually personal or research use only, rate-limited, limited history; redistribution to paying customers often not allowed | Only if the licence text explicitly allows display in a commercial product |
| C. A paid market-data vendor with a redistribution / display licence | Recurring fee that grows with instruments, history and users; exchange fees can apply for futures and stocks | Low if the licence says "display to end users in a commercial application" | The only clean route, **needs the owner's written approval of the monthly cost** |
| D. Let users upload their own data (CSV of bars) and replay that | No data cost; storage and compute are small | Low: the user supplies data they already have the right to use | Cheapest honest option, but support burden is high (formats, time zones, gaps) |
| E. Link out to a charting site that already offers replay (e.g. the chart tool the user already has) | Free | None | Zero build; a link in the backtest page |

## Recommendation
1. **Do not build replay now.** The Premium differentiators that exist today (comparison, backtest log) already carry the tier, and replay adds a recurring data cost that the current pricing does not cover.
2. If backtesting demand shows up in support or sales conversations, **start with D (user-supplied bars) or E (a documented link-out)**, which need no vendor.
3. Revisit C only when (a) paid Premium users number enough to cover a data fee, and (b) you have a written quote and the licence text approved. Then price replay as an add-on, not inside the $24 plan.
4. Keep the website honest: replay is **not** listed on the pricing page or the landing page any more (removed in this build; it was shown as "in development").
