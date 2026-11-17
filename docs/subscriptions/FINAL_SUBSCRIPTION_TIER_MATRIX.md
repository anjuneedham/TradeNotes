# Final subscription tier matrix
Starting point: Fable's recommendation (`docs/design/SUBSCRIPTION_TIER_RECOMMENDATION.md`). I **accept its structure** and its central honesty point: *today a paying customer mainly buys a higher trade limit.* I changed nothing in the allocation; I verified each line against the code and the backend.

Legend — **Now** = built and tested · **Build** = requires implementation (not advertised as available) · **Roadmap** = future, not promised.

| Feature | Free $0 | Standard $12/mo | Premium $24/mo | Status | Backend support | Usage limit | Infra cost |
|---|---|---|---|---|---|---|---|
| Trades stored | 50 | 2,000 | Unlimited | **Now** | Enforced server-side in insert txn | yes | ~3 KB/trade |
| Manual journaling, notes, tags, emotions, mistakes, discipline | ✓ | ✓ | ✓ | **Now** | ✓ | — | negligible |
| Edit / delete trades | ✓ | ✓ | ✓ | **Now** | ✓ | — | — |
| Dashboard, analytics, equity curve, 7 breakdowns, explanations | ✓ | ✓ | ✓ | **Now** | ✓ (computed per request) | — | CPU per view |
| CSV export, account deletion | ✓ | ✓ | ✓ | **Now** | ✓ | — | — |
| Email (verification, reset, billing notices) | ✓ | ✓ | ✓ | **Now** (needs Resend live) | ✓ | — | ~$0.0004/email above free tier |
| Payment history, self-serve cancel/resume, card update portal | — | ✓ | ✓ | **Now** (needs HandyPay key) | ✓ | — | — |
| CSV import | — | ✓ | ✓ | **Now** | Server re-parses; plan gate + limit in insert txn; dup-safe; rollback | counts toward limit; 5 MB | negligible |
| Trading accounts | 1 | 2 | 10 | **Build** (schema ready) | needs switcher + filters | yes | negligible |
| Trade screenshots | — | ✓ | ✓ | **Build** | needs object storage | 4/trade, 5 MB/file | storage $0.02–0.03/GB-mo |
| Calendar + weekly review | — | ✓ | ✓ | **Build** (table exists) | needs UI + timezone | — | negligible |
| Strategy comparison | — | — | ✓ | **Build** | uses existing engine | — | negligible |
| Backtesting / replay | — | — | ✓ | **Roadmap** | needs licensed market data | — | **$50–200+/mo** |
| AI weekly summary | — | — | ✓ | **Roadmap** | LLM API | per user/week | ~$0.01–0.05/user/week |

## Rules (implemented)
- Downgrade/expiry never deletes or hides data; only *adding* trades is blocked above the limit (tested).
- Failed renewal: plan continues until period end + 3 days, then Free (tested).
- Cancel: effective at period end; resumable until then (tested).
- Never gated on any tier: viewing, analysing, exporting, deleting your own data; explanations; risk warnings.

## Founder decisions required
1. **Founding-member offer** (50% off 12 months, first 10 payers) is advertised on the pricing page but has **no mechanism**. Options: (a) remove the line until HandyPay coupons are confirmed; (b) honour it manually by refunding 50% each month. Recommendation: **(a)** — a promise you have to remember to keep by hand is a refund dispute waiting to happen.
2. Whether to keep selling Premium before any Premium-only feature exists (Fable recommends yes, with Standard marked "Most traders" and honest copy). I agree.

## What to advertise at launch
Only the **Now** rows. The pricing page already labels everything else "in development — not available yet".
