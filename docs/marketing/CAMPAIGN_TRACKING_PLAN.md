# Campaign tracking plan
## What already exists in the product
`?src=<tag>` on any URL → first-party cookie (30 days) → stored on `profiles.signup_source` at first sign-in (tested in e2e). No third-party tracking is installed.

## Funnel and where each number comes from
| Metric | Source |
|---|---|
| Reach, impressions, video views (3 s / ThruPlay), link clicks, CPC, CTR | Meta Ads Manager |
| Landing-page views | Meta (needs pixel) **or** Vercel Web Analytics (cookieless) |
| Registrations | SQL below |
| Activated users (≥5 trades within 7 days) | SQL below |
| Paid conversions | SQL below |
| Cost per acquisition | spend ÷ registrations; spend ÷ activated; spend ÷ paid |

```sql
-- Sign-ups, activation and paid by ad tag (run in Supabase SQL editor)
select p.signup_source as src, count(*) as signups,
  count(*) filter (where (select count(*) from tradenotes.trades t where t.user_id = p.id) >= 5) as activated,
  count(*) filter (where s.plan <> 'free' and s.status in ('active','trialing','past_due')) as paid
from tradenotes.profiles p left join tradenotes.subscriptions s on s.user_id = p.id
where p.signup_source like 'ig-ad%' group by 1 order by 2 desc;
```

## Decision before launch: Meta pixel or not
- **Without pixel (recommended for this test):** Traffic objective; landing-page views from Vercel Analytics; sign-ups from SQL. No cookie-banner/privacy change.
- **With pixel:** better optimisation later, but adds third-party tracking → update Privacy Policy, consider consent for EU/UK visitors. Not worth it for $50.

## Daily log (fill once a day)
| Day | Spend | Reach | Impr. | 3s views | Clicks | CTR | LP views | Sign-ups | Activated | Paid | Cost/sign-up |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | | | | | | | | | | | |
| 2 | | | | | | | | | | | |
| 3 | | | | | | | | | | | |
| 4 | | | | | | | | | | | |
| 5 | | | | | | | | | | | |
