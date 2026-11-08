# Product Spec

**Positioning:** Know your trades. Understand your patterns. Improve your process.
**Primary ICP:** beginner–intermediate retail traders who don't yet journal or measure. **Secondary:** experienced traders wanting one analytics workspace.
**Non-promise:** we never claim TradeNotes makes anyone profitable.

## Pillars & priority
| Pillar | P0 (launch) | P1 | P2+ |
|---|---|---|---|
| Journal | Manual entry, long/short, partial exits, fees, multiplier, stop/target/risk, strategy/session/timeframe tags, pre/post notes, emotions, mistakes, followed-plan, discipline 1–5, lessons, list + filters, calendar | Screenshots, daily/weekly reviews, search | Broker presets, fill-level import |
| CSV import | Generic mapping, validation report, in-file + cross-import dedupe (fingerprint), rollback per import | Broker presets (MT4/5, TradingView, IBKR, Tradovate, NinjaTrader) | Auto-sync |
| Analytics | Summary metrics (below), equity curve, by strategy/session/weekday/symbol/side | Mistake cost, timeframe, R distribution | Custom reports |
| Backtesting | **Pro, P1-day-3:** bar replay on licensed data, no future bars, sim orders w/ SL/TP, sizing, session notes, report, CSV export | Session comparison, saved strategies | Multi-chart, drawing tools, tick |
| Trade replay | — | Replay imported trade on candles with entry/exit markers | Annotations |
| Education | Glossary (/learn), inline "?" tooltips, small-sample warnings, guided onboarding | Contextual nudges | Courses |
| Commerce | Signup/login, Stripe Checkout, Customer Portal, webhook entitlements, plan limits server-side | Founding coupon automation | Teams/coach |

## Metrics (implemented in `src/lib/metrics.ts`, tested in `metrics.test.ts`)
Universal rules: money in account currency; fees always subtracted; a trade counts only when **exited qty == entry qty** (open/partial → excluded, listed); foreign-currency trades with no fx rate → excluded, listed; breakeven (net = 0) is neither win nor loss; ordered by `closed_at`.

| Metric | Formula | Missing data | Edge cases |
|---|---|---|---|
| Net P&L (trade) | Σ dir·(exitᵢ−entry)·qtyᵢ·multiplier·fx − fees·fx | no fx → excluded | over-exit → invalid |
| Win rate | wins ÷ closed trades | — | 0 trades → null ("—") |
| Avg win / loss | Σ net of winners ÷ #winners (loss is negative) | — | none → null |
| Profit factor | Σ winners ÷ \|Σ losers\| | — | no losers → null, never ∞ |
| Expectancy | net P&L ÷ closed trades | — | 0 trades → null |
| Avg R | mean(net ÷ initial_risk) over trades with risk>0 | excluded; coverage `withR/total` shown | — |
| Max drawdown | max(peak − cumulative), peak starts at 0 | — | first trade loss counts |
| Streaks | longest consecutive wins / losses; breakeven resets both | — | — |
| Small sample | flag when closed trades < 30 | — | shown on every stat |

UI must display exclusions ("3 open trades not included") and R coverage — never misrepresent incomplete data.
