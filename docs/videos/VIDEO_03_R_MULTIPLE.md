# Video 3: R-multiple and prop firm challenges

**Promotes:** https://tradenotes.dev/learn/r-multiple-prop-firm-challenge
**Format:** 9:16 Short (YouTube Shorts + TikTok), 30–45 seconds, "Andrew Builds" look, local voice, visuals drawn in code (vibloid generator).
**Status:** brief written 2026-11-15. A Fable session is producing the three versions from `docs/prompts/ARTICLE_VIDEO_PROMPT.md`. Its scripts may differ in wording; this file is the reference and the place to record results.
**Goal:** send cold viewers to the calculator (not the homepage), where `/free` and signup are one click away.

## The one idea
A prop firm's limits mean very little in percent and a lot in R. At 1% risk per trade, a 5% daily loss limit is only **five losses**. Measure the challenge in R before paying for it.

All numbers below are arithmetic from the article, shown as hypothetical examples. They are not results and not advice.

## Three hooks to test (same body, different first 2 seconds)
| Version | Opening line (spoken + on screen) | Link tag |
|---|---|---|
| **A: maths shock** | "A 5% daily loss limit. At 1% risk, that's five losses." | `tt-v3a` |
| **B: question** | "Are you doing this one calculation before you pay for a challenge?" | `tt-v3b` |
| **C: reframe** | "Risk $200, make $500. That's not a $300 win. It's +2.5R." | `tt-v3c` |

Post one at a time, 2–3 days apart, at the same time of day. Compare views past 3 seconds, link clicks and sign-ups per tag.

## Script (version A; B and C swap only the opening line)
| # | Time | Spoken | On screen |
|---|---|---|---|
| Hook | 0–4s | "A five percent daily loss limit. At one percent risk, that's just five losses." | Big kinetic text: **5% DAILY LIMIT = 5 LOSSES** |
| 1 | 4–12s | "Try measuring your trades in R. One R is what you planned to lose on the trade. Risk two hundred, make five hundred, and that's plus two point five R." | Typing: `1R = planned risk`, then `$500 ÷ $200 = +2.5R`. Label: *hypothetical example* |
| 2 | 12–24s | "Say a challenge has a ten percent target, ten percent max loss and a five percent daily limit. At one percent risk, that's ten R to win, ten losses to fail." | Three-row table (2%, 1%, 0.5% risk): target in R, losses to fail, losses per day. Highlight the 1% row |
| 3 | 24–33s | "Drop to half a percent and it's twenty R to win, but twenty losses to fail. Rules differ between firms, so check yours. Trading involves risk of loss." | Table highlights the 0.5% row. Small text: *check your firm's rules* |
| CTA | 33–42s | "I built TradeNotes, so I'm biased, but there's a free calculator for this. Link in my pinned comment. Not financial advice." | Calculator screenshot (real page), URL text `tradenotes.dev`, "Not financial advice" |

**Do not say or show:** that anyone made money, win rates, "pass your challenge", "this works", pass rates, backtesting, or any feature TradeNotes doesn't have today. No fake testimonials or user counts.

## Post copy
**Pinned comment (put the link here; descriptions aren't clickable on TikTok):**
> Free R-multiple + prop firm challenge calculator: https://tradenotes.dev/learn/r-multiple-prop-firm-challenge?src=tt-v3a
> (Hypothetical example numbers. Not financial advice.)

**YouTube title:** Prop firm challenge math in 40 seconds (R-multiple)
**YouTube description:**
> A 5% daily loss limit sounds big. Measured in R, it can be just five losing trades. Here's how to work out your challenge in R before you pay for one.
> Free calculator: https://tradenotes.dev/learn/r-multiple-prop-firm-challenge?src=tt-v3a
> I built TradeNotes, so I'm biased. It's a trading journal with a free plan.
> Educational content only, not financial advice. Examples are hypothetical. Trading involves substantial risk of loss. This video uses an AI-generated voice.

**TikTok caption:** Your prop firm's loss limit, measured in R. Free calculator in the pinned comment. Hypothetical numbers, not advice. #propfirm #forex #futures #tradingjournal #rmultiple #daytrading

**Tags (YouTube):** prop firm, prop firm challenge, r multiple, risk management trading, trading journal, daily drawdown, forex, futures

(For versions B and C use `tt-v3b` and `tt-v3c` in every link.)

## Approval checklist (tick before posting)
- [ ] Watch the full video with sound. Voice clear, text readable at phone size, nothing cut off at the edges
- [ ] "Hypothetical example" visible on screen
- [ ] "I built TradeNotes, so I'm biased" is spoken
- [ ] "Not financial advice" and one risk-of-loss sentence are in the video
- [ ] Every number matches the article (re-check against the live page)
- [ ] The link has the right `?src=tt-v3a/b/c` tag and opens the article
- [ ] Pinned comment posted within 1 minute of posting

## Results (fill in after 7 days per version)
| Version | Posted | Views | Avg % watched | Link clicks / visits (Vercel, `src` tag) | Emails (`tradenotes.leads`) | Sign-ups | Notes |
|---|---|---|---|---|---|---|---|
| A | | | | | | | |
| B | | | | | | | |
| C | | | | | | | |

Decision rule: keep the hook with the most link visits per 1,000 views. If all three get fewer than about 1 visit per 100 views, the problem is the call to action, not the hook: change what viewers are asked to do.
