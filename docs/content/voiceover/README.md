# Week 1 voiceover scripts (videos 001 to 015)
Voice-ready narration for the seven-day plan in `docs/content/SEVEN_DAY_PUBLISHING_PLAN.md`. Source packages: `docs/content/videos/VIDEO_0NN.md`. Rules: `docs/CONTENT_ENGINE.md` section 0 and `VIDEO_PRODUCTION_GUIDELINES.md`.

**Status honesty:** these are text scripts only. No audio has been recorded, synthesized or rendered, and the founder has not approved any of them. The models cannot produce audio. Record the voice yourself or use a TTS tool, then re-time the captions to the real track.

## The experiment
Same brief, same inputs, same file format for every video. Written by: Opus for 001 to 014 (two Opus agents ran in parallel, one on 001 to 007 and one on 008 to 014) and **Fable 5.2 for 015 only**. Each file names its writer on line 2.

| | Opus (14 scripts) | Fable (1 script) |
|---|---|---|
| Narration length | 74 to 105 words (mean about 89) | 77 words |
| Fits its length at 2.5 words/s | all 14 | yes |
| Em dashes, profit claims | none | none |
| Package problems caught | wrong on-screen numbers (001, 003, 005); features that do not exist (003, 007, 010, 011); profit framing removed (008, 009, 014) | on-screen statistic with no source; a note hidden on small screens (checked against the app code); free-plan limit |
| Items left for the founder to verify | 2 to 3 per script, typically first-person claims and guessed timings | 5 |

## What this does and does not show
- **One Fable script is one sample.** Fable and Opus wrote different videos, so any difference in tone or quality here may come from the topic, not the model. Do not pick a winner from this table.
- Both followed the structure and compliance rules, and both checked claims against the app's code instead of trusting the package. That is the same behaviour from both.
- Run time and cost are not comparable: the Fable agent did one script, each Opus agent did seven and shared its reading of the rules across them.
- **A fair next step:** have Fable write one of the Opus videos too (005 or 014 are good, the two have clear hooks and numbers) and read the two versions of the same video side by side, ideally without the names.

## Fixes the scripts found in the packages (apply before editing the videos)
- **001:** the package chips (+1R, +0.3R, -1R) average to +0.1R, which contradicts the video. Use the video's own example, chips +0.3R and -1R, average -0.09R (seven wins at +0.3R, three losses at -1R, over ten trades).
- **003:** the package says "stop 20 pips". Entry 1.0850 and stop 1.0820 is 30 pips (matches the $300 risk). The journal cannot filter by mistake tag, so point to the "By mistake tag" table in Analytics. Leave fees blank on the sample trade so the app shows exactly -1.00R.
- **005:** show the risk amounts on screen ("$100 win, $200 risk = +0.5R", "$40 win, $20 risk = +2R"). The title says 30 seconds but the video runs about 40.
- **007:** there is no filter by "followed your plan". The narration only says the app asks the question. Opening card should read "LOSS".
- **008:** "Size changes risk more than anything" overstates; use "Size changes your risk." Verify 20 pips on 1 lot EURUSD is about $200.
- **010:** record the Analytics page ("By session"); session is a dropdown on the trade form. Avg R is hidden on narrow phones, so record wider.
- **011:** the app has no "this week" range (All time, This year, 90 days, 30 days). The full mistake table is on Analytics, the dashboard shows only the costliest mistake.
- **013:** build a sample trade showing exactly $993 then $593 (1 lot EURUSD long, entry 1.0850, exit 1.0950 changed to 1.0910, $7 fees). Test the edit flow on the build you record.
- **014:** change the on-screen text "Free money: trades you skip" to "The fix: trades you skip".
- **015:** change "Most journals die in week 1" (unsourced) to "Most start. Few keep going." Time "under a minute" in the real form. Record the trade form at a wider width. Captions must not imply unlimited trades on Free.
- **010, 013 CTAs ("free journal", "try it free")** need a working sign-up on the site when you post.

## Before posting anything
Founder approves every script (claims check). Items marked "founder to verify" inside each file are first-person claims, guessed timings and unsourced generalisations; they are yours to confirm or cut.
