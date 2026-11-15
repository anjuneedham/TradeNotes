# AI Coach — setup (prepaid credits)

The Pro plan's AI Coach calls the Claude API from the server. You pay Anthropic per use from prepaid credits; users never see your key.

## 1. Create the key (one time)
1. Go to https://console.anthropic.com → sign in.
2. **Settings → Billing**: buy credits (e.g. $20). Turn **auto-reload OFF** if you only want to top up by hand.
3. **Settings → Limits**: set a **monthly spend limit** (e.g. $25). This is your hard safety cap.
4. **Settings → API keys → Create key**. Name it `tradenotes-prod`. Copy it (starts `sk-ant-…`). You only see it once.

## 2. Add it to Vercel
Vercel → project **tradenotes** → Settings → Environment Variables:

| Name | Value | Environments | Sensitive |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-…` | Production (+ Preview if you want to test) | ✅ |
| `AI_COACH_MODEL` *(optional)* | `claude-opus-5-5` (default) | Production | — |

Then **Deployments → Redeploy** the latest production deployment. The coach page shows "Coach unavailable" until the key is present.

Never paste the key into code, GitHub, chat or the app UI.

## 3. What it costs
Default model: Claude Opus 5.5 ($4 / M input tokens, $20 / M output tokens). A typical coach question uses ~2 API rounds,
roughly 6–10k input + ~1k output tokens ≈ **$0.03–0.06 per question**.

| Usage | Approx. monthly cost |
|---|---|
| 1 Pro user, 5 questions/day | ~$5–9 |
| 10 Pro users, 5 questions/day | ~$50–90 (vs $240 revenue) |
| Worst case: 1 user maxing 25/day | ~$25–45 |

Cheaper option: set `AI_COACH_MODEL=claude-sonnet-5-5` (~half the price) or `claude-haiku-5-5` (~1/40th, weaker answers). No code change, just redeploy.

Per-user cap: `coachDailyMessages` in `src/lib/plans.ts` (25 per rolling 24h). Every question and its token usage is logged in `tradenotes.ai_messages`.

## 4. Watching spend
- Anthropic Console → **Usage** shows daily spend.
- SQL (Supabase SQL editor) for tokens per user in the last 30 days:
  ```sql
  select user_id, count(*) filter (where role='user') questions, sum(input_tokens) input, sum(output_tokens) output
  from tradenotes.ai_messages where created_at > now() - interval '30 days' group by 1 order by 4 desc;
  ```
- If credits run out the API returns an error; users see "The coach is temporarily unavailable" and nothing else breaks. Top up and it works again immediately.

## 5. Safety behaviour
- Refusal fallback is on (`fallbacks: "default"`): if the model declines, the API retries on a fallback model automatically.
- The coach only reads the signed-in user's trades (row-level security), has read-only tools, and is instructed not to give buy/sell advice.
- Privacy policy lists Anthropic as a processor for the coach.
