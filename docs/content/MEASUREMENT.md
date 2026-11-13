# Measurement
Builds on `CONTENT_STRATEGY.md` ("double down on pillars with the best saves + sign-ups, not views") and `docs/marketing/CAMPAIGN_TRACKING_PLAN.md`. A single Google Sheet is enough; no new tool.

## 1. What to log
**Per video (daily, 10 min, 48 h after posting so numbers settle)** — one row per video per platform:
`date · day · video ID · pillar · type (edu/psych/demo) · platform · views · 3-second hold or "viewed vs swiped away" · average watch % · saves · shares · comments · profile visits · link clicks (if shown)`
Field names differ per platform; log what each app's analytics shows and leave the rest blank rather than estimating. **[VERIFY]** which of these each platform exposes for a new account.

**Per week (Friday, 20 min):**
| Metric | Source |
|---|---|
| Views, saves, profile visits by platform | Each platform's analytics |
| Followers gained (context only, not a goal) | Each platform |
| **Sign-ups by `?src=`** (`tt-organic`, `ig-organic`, `yt-organic`) | SQL in `CHANNEL_SETUP.md` §6 |
| **Activated** (≥ 5 trades logged) by `src` | Same query |
| **Free-to-paid** by `src` | Same query (`paid` column) |
| Refund requests and why | Support inbox |
| Comment themes (questions asked, objections) | Manual tally |

## 2. Reading the numbers honestly
- `?src=` counts are a **floor**: people who watch, then search the site, are untagged; the first tag wins; the tag is saved at first sign-in.
- Tiny samples mislead: with a few signups a week, one person is 20–50% of the result. Don't compare percentages until each cell has dozens of observations.
- Views are not the goal. Rank videos by **saves, shares, profile visits and sign-ups**.
- Free-to-paid will take weeks to show and may be zero in the first month. That is a normal outcome, not a verdict.

## 3. Hypotheses (not promises)
Set before you post so you can be wrong. None of these are forecasts; they are tests. Revise after two weeks of data.
| # | Hypothesis | How to check | Rough bar to call it "worth continuing" |
|---|---|---|---|
| H1 | Videos that open with a specific number or counter-intuitive claim (Days 1, 10, 12) hold more viewers past 3 s than generic hooks | 3-second hold by video | Top third of your own videos, not an outside benchmark |
| H2 | Education and psychology posts earn more saves and shares than demos; demos earn more profile visits/clicks | Saves and profile visits by type | Compare your own types after 14 posts |
| H3 | Bio-link clicks turn into free sign-ups at a rate that makes the channel worth maintaining | Sign-ups by `src` ÷ link clicks | Any consistent weekly sign-ups at 2–4 weeks |
| H4 | A sign-up that logs 5 trades is worth more than a sign-up that doesn't | Activated ÷ sign-ups by `src` | Track; no bar yet |
| H5 | Some free users upgrade after hitting a limit | Paid by `src` | Treat any paid user in the first 60 days as a bonus, not a target |
Targets are **your own week-over-week trend** (e.g. "saves per video up from last week"), not absolute numbers: I have no verified benchmarks for new accounts and I have not invented any.

## 4. Decision rules (when to stop or change a format)
Decide at fixed checkpoints so you don't tinker daily.
| Checkpoint | Do this |
|---|---|
| After 5 videos | Check nothing is broken (audio, captions, sample-data label, links work). Don't change format yet. |
| After 14 videos (end of this calendar) | Rank by saves + shares + sign-ups. Keep the top 2 pillars/types; make the next 14 about 70% of those. |
| A format (e.g. demos) is the weakest on saves **and** profile visits across 4 posts | Shorten it, change the hook, or move the demo to a 10–15 s clip inside an education video. |
| A hook style repeatedly under-holds (bottom third of your own videos for 5 posts) | Rewrite hooks to lead with a number or a claim; retest 3 posts. |
| Weak platform (very low views after 14 posts on one platform while others perform) | Keep posting the same file with minimal effort; don't spend extra time tailoring it. |
| 28 days with **zero sign-ups from any `src`** despite steady views | Pause new production. Check the funnel before the content: do the bio links work, do they land on the right page, are they visible, is the CTA in the video clear? Fix the funnel; test CTAs; try a pinned comment with the link where clickable. |
| Many comments asking the same question | Make the answer a video. |
| Any refund, complaint or accusation of overpromising tied to a video | Stop posting that format; review its wording against the rules in `CONTENT_STRATEGY.md`. |
| One real thing happened and nothing else | Post one (rule from the channel repo: no invented activity to hit a number). |
| Founder time over budget for 2 weeks | Drop to 5 videos a week, not lower quality. |

## 5. Weekly review template (10 min, in the sheet)
1. Top 2 videos by saves; bottom 2 by 3-second hold. Why, in one sentence each.
2. Sign-ups, activated, paid by `src` (floor numbers).
3. Top 3 comment questions; is there a video answering them?
4. One thing to change next week (only one).
5. Compliance check: any claim, label or caption error found after posting? Fix and log it.
