# Architecture
- **Next.js 15 (App Router, TS, Tailwind 4)** — one repo, deploy on Vercel. Server Components + Server Actions for mutations; no secrets in client bundles.
- **Supabase** — Postgres + Auth (email/password + magic link) + Storage (private `screenshots` bucket). RLS is the tenant-isolation boundary.
- **Stripe** — Checkout + Customer Portal; `/api/stripe/webhook` (service role) is the *only* writer of `subscriptions`.
- **Pure domain libs** — `src/lib/metrics.ts`, `src/lib/csv-import.ts`, `src/lib/plans.ts`: no I/O, unit-tested.
- **Market data** — `MarketDataProvider` interface (`getCandles(symbol, tf, from, to)`), server-side only, cached in `candles` table per licence terms.
- **Internal ops** — separate Next.js app in `/ops` (own Vercel project, own Supabase project, owner-only auth). Until built: none — do *not* ship admin into customer app beyond `is_admin` read-only views.
- **Monitoring** — Sentry (errors), Vercel Analytics. **Email** — Resend.

Route map: `/` `/pricing` `/learn` `/legal/*` (public, done) · `/signup` `/login` · `/app` dashboard · `/app/journal` `/app/journal/[id]` `/app/import` `/app/analytics` `/app/strategies` `/app/accounts` `/app/backtest` `/app/replay` `/app/settings` `/app/billing` · `/admin` (is_admin, server-checked).

## Historical data strategy
Need: licence that allows displaying candles to paying end users in a SaaS (not just internal use). Candidates to evaluate (pricing/terms must be confirmed in writing before signing):
- **Databento** — futures (CME) + equities, minute bars, pay-per-use; check display/redistribution licence.
- **Polygon.io (Massive)** — US stocks/options/forex/crypto; business plans required for commercial display.
- **Crypto exchange public APIs (e.g. Binance, Coinbase)** — free OHLCV, but terms vary on commercial redistribution; check each.
- **Dukascopy / FX** — check terms before any commercial use.
MVP path: launch backtesting on **one licensed asset class** (likely crypto or US equities minute bars), behind the provider interface, labelled with source. No synthetic data presented as real; a clearly labelled "practice / sample data" mode is acceptable only if it's generated and marked as such.
