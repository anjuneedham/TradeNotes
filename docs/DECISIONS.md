# Decisions
| Date | Decision | Why |
|---|---|---|
| 2026-11-08 | Greenfield: Next.js 15 + Supabase + Vercel | Repo empty; Supabase & Vercel already connected to founder's accounts; fastest path to auth+DB+RLS |
| 2026-11-08 | Separate Supabase project for TradeNotes (not YardScale-Digital) | Customer data isolation |
| 2026-11-08 | Prices $12/$24 (annual 25% off), founding 50% × 12 mo | Fee drag at $9; still far below competitors |
| 2026-11-08 | Metrics: open/partial and missing-fx trades excluded & disclosed; PF null with no losers; DD peak from 0 | Never misrepresent incomplete data |
| 2026-11-08 | CSV v1 = one row per round trip, generic mapping | Ships today; fill-level presets P1 |
| 2026-11-08 | Backtesting held until licensed data provider signed; no synthetic data shown as real | Directive §5 |
| 2026-11-08 | Internal ops = separate app/project, not built yet | Avoid leaking admin into customer app |
| pending | Payment processor (Stripe vs Paddle/Lemon Squeezy) | Depends on founder's entity/country — see LEGAL |
| 2026-11-08 | Founder's primary market is forex → defaults: forex asset class, lots×100,000, quote-currency FX conversion, London/NY sessions | Founder input |
| 2026-11-08 | Start on a free Supabase project (separate account), migrate to paid org later | Founder input; see DEPLOYMENT.md cautions |
| 2026-11-08 | Payment provider = Handypay (founder says fully set up). Not implemented until API docs/keys supplied; entitlements model is provider-agnostic (`subscriptions` table, service-role writes only) | Never invent integrations |
| 2026-11-08 | Domain: .dev | Founder input |
| 2026-11-08 | Reuse the existing (Agriloop) Supabase project, isolated in schema `tradenotes`; no auth trigger, lazy `ensure_user()` | Founder input; avoids collisions and keeps `pg_dump -n tradenotes` extraction simple |
