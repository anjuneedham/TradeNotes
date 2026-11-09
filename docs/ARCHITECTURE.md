# Architecture
- **Next.js 15 (App Router, TS, Tailwind 4)** — one repo, deploy on Vercel. Server Components + Server Actions for mutations; no secrets in client bundles.
- **Neon (Postgres)** — all data. **Better Auth** (in-app, email+password, DB-backed sessions, DB-backed rate limits). Tenant isolation via Postgres RLS + `app_user` role (see DATABASE.md).
- **Payments: Handypay** hosted subscription links; entitlements in `tradenotes.subscriptions`, written only by the owner/admin path (manual now, webhook later).
- **Pure domain libs** — `src/lib/metrics.ts`, `src/lib/csv-import.ts`, `src/lib/plans.ts`, `src/lib/trade-schema.ts`, `src/lib/entitlements.ts`: no I/O, unit-tested.
- **Market data** — `MarketDataProvider` interface (`getCandles(symbol, tf, from, to)`), server-side only, cached in `candles` table per licence terms.
- **Internal ops** — separate Next.js app in `/ops` (own Vercel project, own database, owner-only auth). Until built: none — do *not* ship admin into customer app beyond `is_admin` read-only views.
- **Monitoring** — Sentry (errors), Vercel Analytics. **Email** — Resend.

Route map: `/` `/pricing` `/learn` `/legal/*` (public, done) · `/signup` `/login` · `/app` dashboard · `/app/journal` `/app/journal/[id]` `/app/import` `/app/analytics` `/app/strategies` `/app/accounts` `/app/backtest` `/app/replay` `/app/settings` `/app/billing` · `/admin` (is_admin, server-checked).

## Historical data strategy (research 2026-11-08; web-search level only — NOT contract-verified)
Need: a licence that lets us **display** forex candles to paying end users in a commercial SaaS. Personal-use API access is not enough.

| Provider | What was found | Commercial display? |
|---|---|---|
| Massive (ex-Polygon.io) | Forex minute aggregates start on the Currencies Starter tier; **Currencies Business $999/mo** lists 10+ yrs history and business use. Older third-party pages cite ~$29/mo for Starter (individual use). | Unconfirmed for forex — ask sales@massive.com |
| Tiingo | Forex to 1-minute, ~3+ yrs of history. Plan table marks even the Commercial tier "Internal use only"; "Display redistribution" is a separate priced row. | Needs a separate display licence — ask Tiingo |
| OANDA | v20 API historical candles back to 2005, needs an OANDA account and accepting the API licence; paid data-service plans from ~$4,850/yr. | Unconfirmed; practice-account data generally not licensed for redistribution — ask api@oanda.com |
| Twelve Data, TraderMade | Search returned no usable pricing/licence pages. | Unknown — check their sites / sales |
| Dukascopy (free tick downloads) | Not researched this session. Licence is believed to restrict commercial redistribution — verify before any use. | Do not use for the product without written permission |

**Honest conclusion:** I found no forex source with a confirmed, cheap, display-licensed tier. Real licensed data likely costs hundreds of dollars/month, which 3–10 Pro subscribers would cover — not worth buying before there are paying users.

**Recommended path ("bring your own data", ships first):** the trader uploads historical candle CSVs they already have rights to (e.g. exported from their own broker/MT5/TradingView). TradeNotes replays them with the no-lookahead engine. We store/serve only that user's own uploads (RLS-isolated), so we are not redistributing market data. Terms state the user is responsible for the right to use their data. **Licensed provider integration** sits behind the `MarketDataProvider` interface and is added once revenue justifies it; send each vendor this question: *"May a paid SaaS display your historical forex M1–D1 candles to its logged-in subscribers for backtesting, what tier is required, what are the caching rules, and what is the price?"*
