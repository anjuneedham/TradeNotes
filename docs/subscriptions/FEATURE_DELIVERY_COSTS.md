# Feature delivery costs
**Actual** = a documented price from the provider (date checked noted). **Estimate** = my assumption; replace with real invoices once live.

## Platform (fixed, monthly)
| Item | Cost | Actual / estimate | Note |
|---|---|---|---|
| Vercel Pro | $20 | Actual (vercel.com pricing, checked 2026-11-10 in UNIT_ECONOMICS) | Hobby forbids commercial use |
| Supabase Pro (dedicated project) | $25 | Estimate of current list price — verify | Free tier pauses inactive projects; 500 MB |
| Domain tradenotes.dev | ~$1.10/mo ($13/yr renewal) | Actual quote 2026-11-10 | |
| Resend | $0 to 3,000 emails/mo, then ~$20 | Estimate from public tiers — verify | |
| Sentry (optional) | $0 free tier → $26 | Estimate | |
| **Launch total** | **≈ $46/mo** | | |

## Variable, per user per month (estimates)
| Driver | Free (≤50 trades) | Standard (typical 100–300 trades) | Premium | Basis |
|---|---|---|---|---|
| DB storage | <0.2 MB | ~1 MB | ~3 MB | ~3 KB per trade incl. indexes and exits |
| DB compute | share of fixed plan | share | share | Dashboard recomputes from rows; small at <1k users |
| Email | ~1–2 | ~2–3 | ~2–3 | welcome, verify, billing notices |
| Hosting/bandwidth | Included in Pro allowances until high traffic | | | |
| **Modelled cost** | **$0.01** | **$0.02** | **$0.03** | Deliberately rounded up |

## Payment processing (per paid subscriber)
HandyPay documented rate (payment sessions, Free/Brand merchant plans): **4.9% + US$0.40**. Standard: **$0.99** of $12 (8.2%). Premium: **$1.58** of $24 (6.6%). HandyPay's site also shows a Pro merchant plan at 4.2% + $0.40; pricing pages disagree — **get the rate card in writing**. Payout/FX fees to a Jamaican bank are **not documented** — ask HandyPay.

## Future features (only if built)
| Feature | Expected cost |
|---|---|
| Screenshots | ~$0.02–0.03 per GB-month storage + egress; at 4×300 KB per trade, 1,000 trades ≈ 1.2 GB |
| Backtesting market data | $50–200+/mo fixed licence (covered by ~3–10 Premium subscribers) |
| AI weekly summary | ~$0.04–0.20 per Premium user per month |
