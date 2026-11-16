# AI Coach: owner setup (API credits)

The coach runs on Claude Sonnet 5.5 through your Anthropic account. Users never see your key.

## What each plan gets (and what it can cost you)
| Plan | Shown to users as | Hard cap on your cost per user per month |
|---|---|---|
| Free | not included (paid feature) | US$0 |
| Standard ($12) | about 130 questions a month | US$2 |
| Premium ($24) | about 260 questions a month (double) | US$4 |

The cap is in dollars and is what is enforced; "questions" is that cap divided by 1.5 cents, the average cost of a question (`AI_QUESTION_COST_CENTS` in `src/lib/plans.ts`). Short questions cost less (we measured under 1 cent), questions that need several lookups cost more, so the count is approximate and the page says "about". After your first real week, look at the average (query below) and change the constant if it is off. The allowance resets on the 1st (UTC). Worst case you spend $2 or $4 of AI per paying user against $12 or $24 of revenue, and at most 5 cents per free user.

## Can I use my Claude credits for this? (answer from Anthropic's help centre, checked 2026-11-15)
A Claude subscription and the API are billed separately. Chat and Claude Code usage on your plan can NOT be spent on the API. But some plans include monthly **API credits** that you link to a Console organization:
| Your Claude plan | Included API credits |
|---|---|
| Max | US$100 / month |
| Ultra | US$200 / month |
| Team | US$20 per Standard seat, US$100 per Premium seat (pooled, max $500) |
| Pro, Free, Enterprise | none (buy credits instead, step B) |

**A. Claim included credits (Max, Ultra or Team only; the plan must be at least 7 days old)**
1. Open https://claude.ai/settings/billing in a browser (Team owners: claude.ai/admin-settings/billing). If you subscribed through the mobile app, still do this in a browser.
2. In **API credits**, choose **Link organization**.
3. Pick the Console organization that will own the TradeNotes key, or create a new one. Sign in to the Console with the same email as claude.ai. You need Owner, Admin or Billing role there.
4. Accept the Supplemental Credit Terms and link. The credits appear under **Promotional credits** at https://platform.claude.com/settings/billing.
5. It is one-way: one plan per Console org, and changing it later means contacting support.

Rules that matter for TradeNotes: the credits work for any API key in the linked org (this app's key included), they are spent before purchased credits, **they expire at the end of each billing cycle and do not roll over**, and they do not cover Claude Code or the Claude apps. When they run out, requests stop until the next grant unless you have purchased credits or auto-reload.

**B. Buy credits (everyone, including Pro)**: https://platform.claude.com/settings/billing → buy prepaid credits (for example $20). Keep auto-reload off if you want to top up by hand.

## Create the key and switch the coach on
1. In the Console: **Settings → Limits**: set a monthly spend limit (for example $25), a hard cap on top of the per-user caps. Optionally create a **workspace** just for TradeNotes and set a spend limit on it.
2. **API keys → Create key**, named `tradenotes-prod`, in that workspace. Copy it once (`sk-ant-...`). Never paste it in chat, GitHub or the app.
3. Vercel → project **tradenotes** → Settings → Environment Variables → `ANTHROPIC_API_KEY` = the key, **Production**, **Sensitive ON**. Then Deployments → latest → **Redeploy**.
4. Until the key exists the coach page says it is being switched on; nothing else is affected.
Optional: `AI_COACH_MODEL` (default `claude-sonnet-5-5`). A cheaper model gives users more questions per dollar; the dollar caps stay the same.

## Watching spend
- Console → **Usage** shows what Anthropic actually billed.
- Per user this month, and the average cost of a question (Supabase SQL editor):
  ```sql
  select u.email, round(sum(m.cost_micros) / 1e6, 4) as usd, count(*) filter (where m.role = 'user') as questions,
         round(sum(m.cost_micros) / nullif(count(*) filter (where m.role = 'user'), 0) / 1e4, 2) as cents_per_question
  from tradenotes.ai_messages m join public.tn_user u on u.id = m.user_id
  where m.created_at >= date_trunc('month', now()) group by 1 order by 2 desc;
  ```
- If credits run out, users see "The coach couldn't answer just now" and nothing is counted against them. Top up and it works again straight away.

## Behaviour and safety
Read-only tools over the signed-in user's own trades (row-level security); told not to give buy/sell calls, price targets or predictions; the usage log is append-only for users so nobody can reset their allowance; Anthropic is named in the privacy policy as the AI provider.
