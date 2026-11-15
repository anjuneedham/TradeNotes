# AI Coach — owner setup (prepaid credits)

Paid plans include an AI Coach that runs on Claude Sonnet 5.5 through your Anthropic account. Users never see your key.

| Plan | Monthly AI allowance (your cost ceiling per user) | Roughly |
|---|---|---|
| Standard ($12) | US$2 | ~130 questions |
| Premium ($24) | US$4 (double) | ~260 questions |

The allowance resets on the 1st of each month (UTC). Every question's exact cost is computed from the tokens Anthropic reports and stored in `tradenotes.ai_messages.cost_micros`. When a user reaches their allowance the coach stops for them until the 1st. Worst case: you spend $2 or $4 of AI per paying user per month, against $12 or $24 of revenue.

## 1. Anthropic account (one time, about 5 minutes)
1. Go to https://console.anthropic.com and sign in.
2. **Billing**: buy prepaid credits (for example $20). Leave **auto-reload off** if you want to top up by hand.
3. **Limits**: set a **monthly spend limit** (for example $25). This is a hard cap on top of the per-user allowances.
4. **API keys → Create key**, named `tradenotes-prod`. Copy it once (it starts with `sk-ant-`). Never paste it in chat, GitHub or the app.

## 2. Add it to Vercel
Vercel → project **tradenotes** → Settings → Environment Variables → add:

| Name | Value | Environment | Sensitive |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | the `sk-ant-…` key | Production | ON |

Optional: `AI_COACH_MODEL` (default `claude-sonnet-5-5`). The allowance is metered in dollars, so a cheaper model (`claude-haiku-5-5`) gives users more questions and a pricier one fewer. The total stays capped either way.

Then **Deployments → latest → Redeploy**. Until the key exists, the coach page says "being switched on" and nothing else is affected.

## 3. Watching spend
- Anthropic Console → **Usage** shows what you have actually been billed.
- Spend per user this month (Supabase SQL editor):
  ```sql
  select u.email, round(sum(m.cost_micros) / 1e6, 4) as usd, count(*) filter (where m.role = 'user') as questions
  from tradenotes.ai_messages m join public.tn_user u on u.id = m.user_id
  where m.created_at >= date_trunc('month', now()) group by 1 order by 2 desc;
  ```
- If credits run out, users see "The coach couldn't answer just now" and nothing is counted against their allowance. Top up and it works again straight away.

## Behaviour and safety
- Read-only tools over the user's own trades only (row-level security). The coach cannot change data.
- Instructed not to give buy/sell calls, price targets or predictions; on a safety refusal the API falls back automatically.
- The usage log is append-only for users, so they cannot reset their allowance.
- The privacy policy should name Anthropic as the AI processor (see below).
