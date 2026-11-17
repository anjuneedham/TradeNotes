# Information architecture

## Site map
```
Public
├─ /                 Landing
├─ /pricing          Plans, comparison, billing questions
├─ /learn            Metric guide
├─ /legal/terms · /legal/privacy · /legal/disclaimer
└─ /login · /signup · /forgot-password · /reset-password

Signed in (/app)
├─ Dashboard          /app                    How am I doing? What changed? What should I look at?
├─ Journal            /app/journal            Find and re-read trades
│   ├─ Log a trade    /app/journal/new        (primary action, reachable from everywhere)
│   └─ Trade          /app/journal/[id]       Everything recorded about one trade
├─ Analytics          /app/analytics          Where results come from
└─ Settings           /app/settings           Plan summary, account, preferences, security, data
    └─ Plan & billing /app/billing            Plan, usage, subscribe, cancel
(/app/onboarding      first run only; navigation hidden)
```

## Navigation
| Surface | Items |
|---|---|
| Desktop sidebar | **Log trade** (button) · Dashboard · Journal · Analytics · Settings · — · Metric guide · Log out |
| Phone bottom bar | Dashboard · Journal · **＋** (Log trade) · Analytics · Settings |
| Phone top bar | Logo · Metric guide |
| Public header | Logo · Pricing · Learn (≥640 px) · Log in · **Start free** |

Decisions:
- **Four destinations, one action.** Logging a trade is the thing users do most, so it is a button, not a destination.
- **Billing sits under Settings**, not in the main navigation. It is visited rarely and should not look like an advertisement on every screen. Settings shows the plan first, with one link in.
- **Dashboard vs Analytics.** Dashboard answers "how am I doing and what needs attention" on one screen. Analytics holds the seven comparison tables. Before, all of it was one long page.
- **Learn** stays public (it is also marketing) and is linked from every statistic.

## How each journey maps
| Journey | Path | Status |
|---|---|---|
| Understand performance | Dashboard → date range → figures, equity curve | Available now |
| See what changed | Dashboard → "Last 30 days" vs previous 30 | Available now |
| Know what to review | Dashboard → "To review" (open trades, costliest mistake, largest loss, trades without a stop) | Available now |
| Record a trade | ＋ / Log trade → five sections → Save → Journal | Available now (futures blocked by H-1) |
| Add notes | Inside the trade form (pre, post, lesson) | Available now at entry; **adding notes later requires editing — H-2** |
| Review history | Journal → search / direction / open-closed → open a trade → Newer / Older | Available now |
| Analyse results | Analytics → by strategy, instrument, session, direction, weekday, mistake, emotion | Available now |
| Backtest | — | **Not built.** Not in navigation. Mentioned only as "in development" on public pages |
| Import trades | — | **Not built** (parser exists). Not in navigation |
| Manage settings | Settings → preferences | Explanations + appearance available; account edits, password change, export, deletion **require implementation — H-6** |
| Manage subscription | Settings → Plan & billing | Subscribe available (manual activation); cancel is off-site; **automation — H-3** |

## First-run journey
`/signup` → (email confirmation if enabled) → `/app/onboarding` (two short groups, defaults pre-filled) → Dashboard empty state ("Start in 3 steps" + labelled example) → Log a trade → Journal with confirmation → Dashboard now has figures and a small-sample warning.

## Where planned features will go (so the structure doesn't need to change)
| Feature | Location when built |
|---|---|
| CSV import | Journal → "Import" secondary button → `/app/journal/import` |
| Trade edit | Trade detail → "Edit" → the same form, pre-filled |
| Calendar view | Journal → List / Calendar switch |
| Weekly review | Dashboard → "To review" entry → `/app/reviews` |
| Multiple accounts | Account switcher at the top of the sidebar; managed in Settings |
| Backtesting | Fifth destination, "Backtest", only when it exists |
