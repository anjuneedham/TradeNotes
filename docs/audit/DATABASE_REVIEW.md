# Database review — assessment and recommendations
See DATABASE_AUDIT.md for the inventory.

## Strengths
1. Tenant isolation is enforced by the database (RLS + restricted role + ownership triggers), not by remembering `WHERE user_id = …`.
2. The production build re-proves isolation every deploy (42 checks, rolled back).
3. Subscription state can only change through the owner connection, which is only used by the webhook, billing actions (cancel flag) and account deletion.

## Query efficiency
| Query | Cost today | When it matters | Recommendation |
|---|---|---|---|
| Dashboard/analytics load all trades (≤10,000) + correlated exits subquery | O(trades) per page view | Users past ~2,000 trades (only Premium can get there) | Move summaries to SQL or cache per user (Fable H-9). Not a launch blocker |
| Journal list status filter uses correlated subquery per row | 25-row pages | — | Fine |
| `count(*)` of trades on new-trade/billing | Index-only scan on `(user_id, opened_at)` | — | Fine |
| RLS predicate `user_id = (select uid())` | Initplan, evaluated once | — | Correct pattern |

## Risks
| Risk | Mitigation |
|---|---|
| Supabase free tier pauses inactive projects / 500 MB cap | Use Supabase **Pro ($25/mo)** for production (in cost model) |
| No tested backup restore | Do one restore drill to a scratch project before taking payments (LAUNCH checklist) |
| Times are stored UTC; weekday stats are UTC | Labelled in UI; add `profiles.timezone` post-launch |
| Webhook payload field names not yet seen from real HandyPay | Every raw payload is stored in `billing_events.payload`; reducer is tolerant; first test-mode delivery must be checked (PAYMENT_TEST_REPORT) |
