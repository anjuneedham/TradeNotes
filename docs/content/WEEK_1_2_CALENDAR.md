# Week 1–2 calendar (14 days, one video a day)
**Status: scripts for owner approval. Nothing is recorded, edited or posted.** Same 9:16 file goes to YouTube Shorts, TikTok and Reels; only the title/caption changes (`CONTENT_STRATEGY.md`).

## How this relates to the existing plan
- `SEVEN_DAY_PUBLISHING_PLAN.md` posts 15 videos in 7 days (2–3 a day). This calendar is **one a day for 14 days** so that two recording sessions (Day 1–7 batch, Day 8–14 batch) cover it. It reuses 13 of the existing packages in `docs/content/videos/` (adapted where noted) and adds one extended script (Day 10). If you prefer the two-a-day cadence, keep this order and add the unused packages (002, 010) as second slots.
- Existing packages say "Nothing has been rendered, voiced or exported" and I did not check the `ccr-8952a10f-8rgq8p` branch's voiced cut of 001 against these scripts. Use whichever 001 cut you have approved.
- Where I changed a package's wording it is listed under **Changes** so you can approve the change.

## Mix (target ≈ 60% education / 25% psychology / 15% product)
| Type | Days | Count | Share |
|---|---|---:|---:|
| Education (mistakes, misconceptions, risk, beginner basics, analysis, habits) | 1, 3, 5, 7, 8, 10, 12, 14 | 8 | 57% |
| Psychology & discipline (incl. reviewing losses) | 2, 6, 9, 13 | 4 | 29% |
| Product demo | 4, 11 | 2 | 14% |
No two demos are adjacent (Days 4 and 11 have 6 days between them). Days 3, 5, 7, 8, 10 and 12 are educational but include a short app clip; they are not full demos.

## Rules on every video (from `CONTENT_STRATEGY.md` / `VIDEO_PRODUCTION_GUIDELINES.md`)
- Corner text **"Not financial advice."** on every frame. App footage carries **"SAMPLE DATA · NOT REAL TRADES"** unless it is the founder's own real data (then hide names/emails and say so).
- Dollar figures in worked examples are hypothetical arithmetic: show the word **EXAMPLE** next to them.
- Only free-plan features appear: journal, R-multiples, tags, filters, dashboard/analytics (profit factor, drawdown, R distribution, weekday × hour heatmap, mistake cost), CSV export. **Do not show the Calendar, Reviews, Playbook (Standard and Premium) or broker import (Standard and Premium) as part of the free plan.** Nothing about broker sync, backtesting, AI, MAE/MFE, strategy comparison or a demo mode.
- No free-trial mention anywhere (owner has not confirmed). No prices in videos; if asked, use the comment playbook.
- Sounds: platform-licensed library only. Founder approves each script before recording.
- Strategy colour/typography: `CONTENT_ENGINE.md` §1 (navy `#0A0F1A`, amber `#F2B01E`, captions ≤ 24 chars/line, 58 px).
- CTA default: **"Free plan, no card. Link in bio."** (pricing page: "No card needed for Free.")

---
## Day 1 — Education (Trading mistakes) · reuse `VIDEO_001` (Full)
**Idea:** A high win rate can still lose money; average R is the number to check.
**Hook (0–2 s):** "You win seven out of ten trades… and you're still losing money." On screen: **WIN RATE: 70%** turning red.
**Script (~40 s):** You win seven out of ten trades… and your account is still going down. Here's why. Say your seven wins made thirty dollars each: two hundred and ten. Your three losses were a hundred each: three hundred. Win rate doesn't pay you. The size of your wins versus your losses does. That's why every trade in my journal gets an R number: how much I made compared to what I risked. Plus 1R, plus 0.3R, minus 1R. When the average R is negative, a high win rate just means you're losing slowly. Log your last ten trades and look at the average R, not the win rate.
**On-screen text:** WIN RATE: 70% · 7 wins × $30 = $210 (EXAMPLE) · 3 losses × $100 = −$300 · NET: −$90 · R = result ÷ risk · Check your average R. Not your win rate.
**Shot list:** (1) animated 70% card; (2) green bars slide in, counter to $210; (3) three red bars, counter to −$300; (4) net card; (5) screen recording of a trade detail showing R (SAMPLE DATA label); (6) three chips +1R/+0.3R/−1R then average; (7) 2 s end card.
**Caption:** 70% win rate and still losing? Here's the number that matters more. Save this for your next review. Not financial advice.
**Tags:** #tradingjournal #forextrading #tradingforbeginners #riskmanagement #notfinancialadvice
**Shorts title:** Why a 70% win rate can still lose money
**CTA:** Free journal that shows your R on every trade. Link in bio.
**Changes:** added "Say" and "EXAMPLE" so the figures are clearly hypothetical.

## Day 2 — Psychology (Trading psychology) · reuse `VIDEO_004` (Full)
**Idea:** The costliest trade is often the one right after a loss; decide the rule in advance.
**Hook:** "The most expensive trade usually isn't the loss. It's the one right after it."
**Script (~38 s):** The most expensive trade usually isn't the loss. It's the one you take right after it. You lose, you feel it, and within ten minutes you're back in: bigger size, worse setup, no plan. That's revenge trading, and a lot of traders have done it. The fix isn't willpower. It's a rule you decide before the loss happens. One example: after a full stop-out, close the chart for fifteen minutes and write down what happened first. And tag any trade taken out of frustration as "Revenge trade". If you track it, you can see what that feeling adds up to.
**On-screen text:** The trade AFTER the loss · Bigger size. Worse setup. · Revenge trading · Decide the rule BEFORE · Tag it. See the cost. · Feelings are fine. Unplanned trades aren't.
**Shot list:** (1) price line dropping to a stop, red flash; (2) second entry, bigger box; (3) rule card "15 minutes. Write first."; (4) screen recording: mistake tag "Revenge trade" and the mistake breakdown in analytics (SAMPLE DATA); (5) end card.
**Caption:** The trade after the loss is the one to watch. What's your rule? Not financial advice.
**Tags:** #tradingpsychology #revengetrading #tradingdiscipline #forextrading #notfinancialadvice
**Shorts title:** Revenge trading: the trade after the loss
**CTA:** Comment the rule you'd set. (Soft CTA; no link.)
**Changes:** "almost every trader" → "a lot of traders" (no unsupported statistic); "Mine:" personal habit → "One example:" (owner: confirm if you want it as your own habit, see claims list).

## Day 3 — Education (Risk management) · reuse `VIDEO_005` (Full)
**Idea:** What "1R" means and why it lets you compare trades.
**Hook:** "Traders keep saying 'R'. Here's what it means."
**Script (~36 s):** Traders keep saying "R". Here's what it means. R is how much you planned to lose if your stop gets hit. Say your entry is here, your stop is here, and that distance on your position size is fifty dollars. That's 1R. Make a hundred dollars: plus 2R. Lose fifty: minus 1R. Why bother? Because R lets you compare trades of different sizes. A hundred dollars on a big position might be a worse trade than forty dollars on a small one. Put a stop on every trade and R does the maths for you.
**On-screen text:** What is 1R? · Entry → Stop = your risk · $50 risk = 1R (EXAMPLE) · +2R · −1R · Compare trades fairly · Stop in → R calculated · No stop = no R.
**Shot list:** (1) entry and stop lines on a flat chart; (2) $50 bracket labelled 1R; (3) +2R / −1R chips; (4) two position-size cards compared; (5) screen recording: journal list with the R column (SAMPLE DATA); (6) end card.
**Caption:** 1R in 30 seconds. Save it for when someone says "2R". Not financial advice.
**Tags:** #rmultiple #riskmanagement #tradingforbeginners #forex #notfinancialadvice
**Shorts title:** What does 1R mean in trading?
**CTA:** Save this for when someone says "2R".

## Day 4 — Product demo · reuse `VIDEO_003` (Full)
**Idea:** Journal one losing trade properly: instrument, entry, stop, mistake tag, one lesson.
**Hook:** "Let's journal a losing trade. Properly."
**Script (~38 s):** Let's journal a losing trade. Properly. This is sample data, but it's the process I'd follow. EURUSD, long, one lot. Entry one-oh-eight-five-oh. Stop one-oh-eight-two-oh, so the risk was three hundred dollars. It hit the stop. Now the important part: did I follow my plan? No, I entered before my setup confirmed. So I tag it "Entered early" and write one line: wait for the candle to close. That's a minus 1R trade. Next week I can filter by "Entered early" and see what that habit adds up to.
**On-screen text:** SAMPLE DATA · NOT REAL TRADES · EURUSD long · Risk = $300 (sample) · Did you follow your plan? No · Tag: Entered early · Filter by the mistake.
**Shot list (screen recording, real app, free-plan account with sample data):** (1) open New trade; (2) type EURUSD, 1 lot (note the forex lot hint), entry, stop; (3) exit at stop; (4) set "Did you follow your plan?" to No and the mistake tag; (5) write the note; (6) show −1R on the saved trade; (7) filter the journal by that mistake tag; (8) end card.
**Caption:** One losing trade, journaled properly: what to write and what to tag. Sample data. Not financial advice.
**Tags:** #tradingjournal #forextrading #tradingforbeginners #journaling #notfinancialadvice
**Shorts title:** How to journal a losing trade (step by step)
**CTA:** Free to start. Link in bio.
**Changes:** "exactly how I do mine" → "the process I'd follow"; "TradeNotes counts as" → "That's a minus 1R trade". Record this live to confirm the R shows −1.0 for your sample numbers.

## Day 5 — Education (Trading misconceptions) · reuse `VIDEO_006` (Full)
**Idea:** Before switching strategies, find out whether you followed the old one.
**Hook:** "You don't need a new strategy. You need to know if you followed the last one."
**Script (~34 s):** Most beginners think they need a better strategy. So they switch every two weeks: new indicator, new video, new system. Here's the problem: you never find out if the old one worked, because you never followed it long enough, or never wrote down when you broke the rules. A strategy you follow half the time isn't a strategy. Before you switch, journal twenty trades with one setup and tag every time you broke a rule. Then you'll know whether it's the strategy… or you.
**On-screen text:** Need a better strategy? · Switch. Switch. Switch. · Followed it 50% of the time? · Test it properly · Strategy… or you? · Follow it before you replace it.
**Shot list:** (1) calendar flipping, strategy card swapped each flip; (2) "50%" split card; (3) list "20 trades · 1 setup · tag rule breaks"; (4) screen recording: analytics by strategy and the "Broke rules" mistake tag (SAMPLE DATA); (5) end card.
**Caption:** Switching strategies every two weeks? Try this first. Comment the one you switched away from. Not financial advice.
**Tags:** #tradingstrategy #tradingforbeginners #forex #tradingmistakes #notfinancialadvice
**Shorts title:** Stop switching trading strategies (do this first)
**CTA:** Comment the strategy you've switched away from.
**Changes:** dropped `#backtest` from the package (backtesting is not built).

## Day 6 — Psychology (Discipline) · reuse `VIDEO_009` (Full)
**Idea:** Moving a stop away from price changes the plan after it stopped going your way.
**Hook:** "'I'll just move my stop a little.' Here's what that does."
**Script (~36 s):** "I'll just move my stop a little." Here's what that actually does. You planned to risk fifty dollars. The trade goes against you, you move the stop, and now you're risking a hundred. Then a hundred and fifty. Your loss is three times what you planned, and your journal still says you had a stop. Moving a stop further away isn't managing a trade. It's changing the plan after it stopped going your way. If it happens, tag it. "Moved stop" is one of the mistake tags in TradeNotes, and it's worth seeing what it adds up to.
**On-screen text:** 'Just this once…' · Planned $50 → actual $150 (EXAMPLE) · 3× the plan · Not management. A new plan. · Tag it: Moved stop · Your stop is a decision. Keep it.
**Shot list:** (1) stop line sliding away from price; (2) risk meter $50 → $100 → $150; (3) "3×" card; (4) screen recording: select "Moved stop" tag, then the mistake breakdown row (SAMPLE DATA); (5) end card.
**Caption:** Your stop is a decision you made when you were calm. Ever moved one? Be honest. Not financial advice.
**Tags:** #stoploss #tradingdiscipline #tradingmistakes #forextrading #notfinancialadvice
**Shorts title:** Why moving your stop loss costs you
**CTA:** Be honest in the comments: ever moved a stop?
**Changes:** removed "'Moved stop' is the most common tag in a lot of journals" (unsupported).

## Day 7 (Sunday) — Education (Better trading habits) · reuse `VIDEO_011` (Full)
**Idea:** A five-minute weekly review, using your own numbers.
**Hook:** "Five minutes on Sunday can show you more about your trading than another video."
**Script (~36 s):** Five minutes on a Sunday can show you more about your trading than another video. Here's the review. Minute one: total result and average R for the week. Minute two: your biggest loss. Did you follow your plan? Minute three: which mistake tag showed up most. Minute four: one thing that went well. Minute five: one rule for next week. Write the rule somewhere you'll see it Monday morning. That's it. Improving starts with looking at your own data.
**On-screen text:** 5-minute weekly review · Result + average R · Biggest loss: plan followed? · Most common mistake · One thing that went well · ONE rule for next week · Save this. Do it Sunday.
**Shot list:** (1) five numbered cards, one per minute; (2) screen recording: **dashboard** with a 7- or 30-day date filter and the mistake breakdown (SAMPLE DATA). **Do not show the Reviews page**: it is Standard and Premium only; (3) sticky note "ONE rule"; (4) end card.
**Caption:** The five-minute Sunday review. Save it and do it this weekend. Not financial advice.
**Tags:** #weeklyreview #tradingjournal #tradinghabits #tradingforbeginners #notfinancialadvice
**Shorts title:** The 5-minute weekly trading review
**CTA:** Save it and do it this Sunday.
**Changes:** hook and last line softened from "more than five hours of videos" (comparative claim we cannot support).

## Day 8 — Education (Beginner trading education) · reuse `VIDEO_008` (Full)
**Idea:** One lot of EURUSD is 100,000 units, not one euro.
**Hook:** "One lot of EURUSD is not one euro."
**Script (~36 s):** If you're new to forex, "one lot" is confusing. One standard lot is a hundred thousand units of the base currency. So one lot of EURUSD is a hundred thousand euros of exposure, with leverage, not your own money. That's why a twenty-pip move on EURUSD is about two hundred dollars on one lot. A mini lot is point one: ten thousand units. A micro lot is point oh one: a thousand units. Many people start with micro lots. When you journal, write the lot size exactly, because it changes your risk more than almost anything else.
**On-screen text:** 1 lot ≠ 1 euro · Standard lot = 100,000 units · 20 pips ≈ $200 (EURUSD, EXAMPLE) · Standard · Mini · Micro · Write the exact size.
**Shot list:** (1) "1 lot" card; (2) three bars standard/mini/micro; (3) pip move card; (4) screen recording: the size field and its hint "1 lot = 100,000 units. Mini = 0.1, micro = 0.01." (SAMPLE DATA); (5) end card.
**Caption:** Forex lot sizes in 30 seconds. Save for later. Not financial advice.
**Tags:** #forexforbeginners #lotsize #forex #tradingforbeginners #notfinancialadvice
**Shorts title:** Forex lot sizes explained simply
**CTA:** Follow for 30-second forex basics.
**Changes:** "most beginners should start with micros" (advice) → "Many people start with micro lots"; "20 pips ≈ $200" qualified to EURUSD.

## Day 9 — Psychology · reuse `VIDEO_014` (Full)
**Idea:** Boredom trades; tag how you felt and look at the pattern later.
**Hook:** "Some of your worst trades happen because nothing was happening."
**Script (~34 s):** Some of your worst trades happen because nothing was happening. The market's quiet, you've been staring at it for an hour, and you take something just to feel like you're trading. That's a boredom trade. They're usually small, unplanned, and they add up. Next time you log a trade, be honest about how you felt. If the answer is bored, tag it. After a month, look at every trade tagged "Bored" together. If they're losing, you've found the trades you didn't need to take.
**On-screen text:** Nothing's happening… · So you take something · Small. Unplanned. They add up. · Tag how you felt · The trades you can skip · No setup? No trade.
**Shot list:** (1) flat price line, clock ticking; (2) a small impulsive entry; (3) screen recording: emotion tag "Bored" on the trade form (SAMPLE DATA); (4) analytics by emotion (SAMPLE DATA, **only if your sample data really shows a "Bored" row**; do not fabricate); (5) end card.
**Caption:** Be honest: how many of your trades were just boredom? Not financial advice.
**Tags:** #tradingpsychology #overtrading #tradingdiscipline #forextrading #notfinancialadvice
**Shorts title:** Boredom trades: the ones you didn't need
**CTA:** Comment "bored" if this is you.
**Changes:** "free money" → "trades you didn't need to take" (money-flavoured phrase).

## Day 10 — Education (Performance analysis) · based on `VIDEO_018` (Draft; extended script is new)
**Idea:** Profit factor in plain English, and why a small sample misleads.
**Hook:** "Profit factor 1.5. Good or bad?"
**Script (~36 s, new):** Profit factor 1.5. Good or bad? Profit factor is your total winnings divided by your total losses. Say you won four hundred and fifty dollars in total and lost three hundred. Four-fifty divided by three hundred is one point five: for every dollar lost, a dollar fifty won. Below one means you're losing overall. But with fewer than thirty trades it can swing wildly; two lucky trades can make anyone look great. TradeNotes warns you when your sample is small. So check the number, then check how many trades are behind it.
**On-screen text:** Profit factor 1.5. Good or bad? · Wins ÷ losses · $450 ÷ $300 = 1.5 (EXAMPLE) · Below 1 = losing overall · Under 30 trades? Don't trust it yet · Check the sample size.
**Shot list:** (1) title card; (2) green and red totals dividing; (3) number line at 1.0; (4) screen recording: dashboard/analytics profit factor with its small-sample warning (SAMPLE DATA; with fewer than 30 sample trades the warning should appear: confirm in the recording); (5) end card.
**Caption:** A profit factor means little without the trade count behind it. Not financial advice.
**Tags:** #profitfactor #tradinganalytics #tradingforbeginners #tradingjournal #notfinancialadvice
**Shorts title:** Profit factor in plain English
**CTA:** Check how many trades are behind your number. Save this.

## Day 11 — Product demo · reuse `VIDEO_013` (Full)
**Idea:** Fix a trade you logged wrong (edit the exit; numbers update).
**Hook:** "Typed the wrong exit price? Here's the fix."
**Script (~30 s):** Logged a trade with the wrong exit price? Happens all the time. Open the trade, edit, fix the number, save. Your P and L and R update straight away, and so do the stats that use that trade. No deleting and re-entering. This is sample data: I'm changing an exit from one-oh-nine-five-oh to one-oh-nine-one-oh, and you can see the result change. Your journal is only useful if it's accurate, so make fixing it painless.
**On-screen text:** SAMPLE DATA · NOT REAL TRADES · Wrong exit? Edit it. · P&L and R update · Accuracy matters.
**Shot list (screen recording):** (1) open the saved EURUSD trade; (2) tap edit; (3) change exit 1.0950 → 1.0910; (4) save; (5) show the result before and after (read the real numbers off your sample account; the package's 993 → 593 are placeholders); (6) end card.
**Caption:** Made a typo in your journal? Fix it in seconds. Sample data. Not financial advice.
**Tags:** #tradingjournal #forextrading #journaling #tradingapp #notfinancialadvice
**Shorts title:** Fix a wrong exit price in your trading journal
**CTA:** Free plan, no card. Link in bio.
**Changes:** removed "every stat on the dashboard"; say "the stats that use that trade".

## Day 12 — Education (Trading mistakes) · reuse `VIDEO_012` (Full)
**Idea:** "I watch the chart" is not a stop; decide the exit when calm.
**Hook:** "'I don't need a stop loss, I just watch the chart.'"
**Script (~34 s):** "I don't need a stop loss, I just watch the chart." Here's the problem. Watching the chart means the decision to exit happens while you're scared and losing, the worst possible moment to decide anything. A stop moves that decision to before the trade, when you're calm. It also means you can't calculate your risk, so you can't size properly and you can't measure R. If you won't use a hard stop yet, at least write down the price where you're wrong before you enter. That's still a plan.
**On-screen text:** 'I watch the chart' · Deciding while scared · Decide when you're calm · No stop = no risk number · Write where you're wrong · Plan the exit before the entry.
**Shot list:** (1) calm vs red-flash chart; (2) before/after decision timeline; (3) screen recording: stop field and planned-risk read-out on the trade form (SAMPLE DATA); (4) end card.
**Caption:** If you can't say where you're wrong before you enter, you don't have a plan yet. Not financial advice.
**Tags:** #stoploss #tradingmistakes #tradingforbeginners #riskmanagement #notfinancialadvice
**Shorts title:** Why "watching the chart" isn't a stop loss
**CTA:** Follow for more beginner mistakes, explained.

## Day 13 — Psychology (Reviewing losing trades) · reuse `VIDEO_007` (Full)
**Idea:** Good loss vs bad loss: sort losses by whether you followed the plan.
**Hook:** "That loss might have been a good trade."
**Script (~36 s):** That loss might have been a good trade. Seriously. If you followed your plan, risked what you meant to, and the market just went the other way, that's a good trade with a bad outcome. A bad trade is one where you broke your rules, even if it made money. When you review, sort losses into two piles: followed the plan, or didn't. Only the second pile needs fixing. The first is the cost of doing business. TradeNotes has a "Did you follow your plan?" field on every trade so you can split them.
**On-screen text:** A GOOD loss? · Process vs outcome · Sort your losses · Fix THIS pile · Yes / No on every trade · Judge the decision, not the result.
**Shot list:** (1) two piles of cards; (2) screen recording: the "Did you follow your plan?" field set to No (SAMPLE DATA); (3) end card.
**Caption:** Judge the decision, not the result. Share with a trader who beats themselves up over every loss. Not financial advice.
**Tags:** #tradingpsychology #tradingjournal #tradingdiscipline #forextrading #notfinancialadvice
**Shorts title:** Good losses vs bad losses in trading
**CTA:** Share with a trader who beats themselves up over every loss.
**Changes:** "asks on every trade … in one click" → "has a field on every trade" (the field is optional).

## Day 14 (Sunday) — Education (Journaling) · reuse `VIDEO_015` (Full)
**Idea:** Why most traders quit journaling, and how to keep it small enough to continue.
**Hook:** "Starting a journal is easy. Keeping it is the hard part."
**Script (~32 s):** Starting a journal is easy. Keeping it is the hard part. Often it's because the journal asks for too much: screenshots, twenty fields, essays. So after a bad day they skip it, then skip it again. Make it smaller. The minimum: instrument, size, entry, stop, exit, one mistake tag. Under a minute. Add notes when you have energy. A short journal you keep for three months beats a perfect one you abandon in a week. In TradeNotes only four fields are required; everything else is optional.
**On-screen text:** Most journals die early · Too much → skipped · The minimum · Small + consistent wins · 4 required fields · Keep it small. Keep it going.
**Shot list:** (1) pile of fields shrinking to six; (2) screen recording: the new-trade form with the four required fields (instrument, size, entry price, entry time) (SAMPLE DATA); (3) end card.
**Caption:** A small journal you keep beats a perfect one you quit. Not financial advice.
**Tags:** #tradingjournal #journaling #tradinghabits #tradingforbeginners #notfinancialadvice
**Shorts title:** Why traders quit journaling (and the fix)
**CTA:** Start a free journal today. Link in bio.
**Changes:** hook and opening replaced the package's "almost none keep it" (unsupported statistic). The four-fields claim is verified against `src/components/TradeForm.tsx` (instrument, size, entry price, entry time are `required`).

---
## Unused existing packages worth holding for weeks 3–4
002 (3 things to write), 010 (worst session: uses the weekday/session breakdown), and 016–030. **Avoid for now:** 039 (backtesting misconception: fine as education, not as a feature), 057 (strategy comparison: not built, do not produce), 042 (export: fine, CSV export exists), 049 (journal on mobile: check the app is usable on a phone before producing), anything that shows Calendar, Reviews, Playbook or broker import as free.
