# Prompt: turn a TradeNotes article into a Short (for a new session on Fable, with the vibloid and TradeNotes repos)

Reusable. Change the three lines under "THIS RUN" for each article. Current run: article 1.

---

You are producing short-form videos (YouTube Shorts + TikTok, 9:16) that promote one TradeNotes article, using the existing spec-driven Short generator in the **vibloid** repo. TradeNotes is the founder's own trading journal web app (https://tradenotes.dev). The videos run on the founder's "Andrew Builds" channel.

## THIS RUN
- **Article:** `src/app/(marketing)/learn/r-multiple-prop-firm-challenge/page.tsx` in the TradeNotes repo (live at https://tradenotes.dev/learn/r-multiple-prop-firm-challenge)
- **Link tag for this video:** `?src=tt-v3` (increase the number for each new video; the founder has already posted tt-v1 and tt-v2)
- **Goal:** get the founder's first subscriber. A video should send viewers to the article's calculator, where `/free` and the signup are one click away. Cold viewers who hit the homepage mostly leave, so do not link the homepage.

## 0. Set up
1. Repos: `anjuneedham/vibloid` (the generator; you must be able to push a branch to it) and `anjuneedham/TradeNotes` (read the article, `docs/CONTENT_ENGINE.md`, `docs/DM_AND_VIDEO_PLAYBOOK.md`, and `docs/SESSIONS.md`). If one isn't in your session, attach it with `add_repo` (access "push" for vibloid) and clone it.
2. In vibloid read `README.md`, `CLAUDE.md`, `docs/runbook.md`, `prompts/trading.md`, `prompts/brand.md`, `scripts/make-short.ts`, `scripts/make-tradenotes-videos.ts` and `specs/money-first-100.json` (an example spec). The generator draws every visual in code and uses a local voice (Kokoro), with no footage and no language-model API.
3. Get the generator running: `pnpm install`, a throwaway Postgres on port 5433 (see README and `E2E_ADMIN_URL`), ffmpeg on PATH, and Kokoro via `scripts/setup-kokoro.sh`. If a step is blocked by the network or environment, STOP and tell the founder exactly what is blocked. Do not hand over a video made with the mock placeholder voice as if it were final.

## 1. Read the article and pick the story
The article's checkable numbers (all arithmetic, so you may use them, but label every example as hypothetical):
- R-multiple = net result ÷ planned risk. Risk $200, make $500 = +2.5R. Lose $200 = −1R.
- EURUSD example: long at 1.0850, stop 1.0820 (30 pips, 1 lot, about $10 a pip) so 1R = $300; exit 1.0910, +$600, or $593 after $7 fees = +1.98R.
- A challenge with a 10% target, 10% max loss and 5% daily loss limit, measured in R: at 2% risk that is 5R, 5 losses, 2.5 losses a day; at 1% it is 10R, 10 losses, 5 losses a day; at 0.5% it is 20R, 20 losses, 10 losses a day.
- If a trader's expectancy is +0.25R, a 10R target takes about 40 trades at 1% risk (an average, not a promise).
Pick the single most surprising, true idea for a cold viewer who is thinking about a prop firm challenge, for example "a 5% daily limit is only five losses at 1% risk".

## 2. Make 3 versions to test hooks (one spec each in `specs/`, slug prefix `tn-rmultiple-`)
Same lesson, three different first two seconds, 30–45 seconds each:
- **A, the maths shock:** open on a number ("5% daily loss limit. At 1% risk, that is five losses.").
- **B, the question:** "Are you doing this one calculation before paying for a challenge?"
- **C, the reframe:** "Risk $200, make $500. That is not a $300 win. It is +2.5R."
Each spec follows the structure of `specs/money-first-100.json` and `scripts/make-tradenotes-videos.ts` (hook, promise, 3–4 beats with scenes such as kinetic text, checklist, typing, dots, an animated example of the calculator, then a CTA). Use the "Andrew Builds" look from `docs/CONTENT_ENGINE.md` (the `andrew` preset) and a brand channel: `kind: "brand"`, `appName: "TradeNotes"`, `appBlurb: "a trading journal and performance analytics app"`.

## 3. Rules (these come from both repos; the generator enforces some of them)
- Educational only. No signals, no trade calls, no "this works", no win rates, no profit claims, no "pass your challenge" promises. Never say or imply the founder or TradeNotes users made money.
- Label every example number "hypothetical example" on screen at least once. Say one natural sentence acknowledging that trading involves risk of loss. End with "Not financial advice."
- Ownership disclosure in speech: "I built TradeNotes, so I'm biased" once early (in the beat that first mentions the app) and in the call to action.
- Mention only features that exist today: it logs trades, calculates R-multiple and expectancy, breaks results down by setup and mistake, and has a free plan up to 50 trades. Do NOT mention backtesting, broker sync, AI features, or "pass rates". If unsure a feature exists, search the TradeNotes repo or leave it out.
- No fake testimonials, user counts or reviews.
- Lead with the lesson. The app appears in at most the last one or two beats.
- Do not copy other creators' scripts, footage, music or branding.
- The CTA says "free R-multiple and challenge calculator, link in my pinned comment" (TikTok and Shorts don't make description links clickable).

## 4. Deliver
1. Run: `TTS_PROVIDER=kokoro pnpm exec tsx scripts/make-short.ts specs/tn-rmultiple-a.json specs/tn-rmultiple-b.json specs/tn-rmultiple-c.json`.
2. Check each output (mp4, srt, cover, POST-COPY.md): extract 3 frames per video with ffmpeg and look at them (text readable, nothing cut off at 9:16, labels visible); confirm the length is under 60 seconds and the voice is clear. Fix and re-render anything wrong.
3. For each version write the post copy (YouTube title, description, TikTok caption, tags) in POST-COPY.md. Every description includes the link `https://tradenotes.dev/learn/r-multiple-prop-firm-challenge?src=tt-v3` plus a suffix for the hook (`-a`, `-b`, `-c`, for example `?src=tt-v3a`) so we can see which hook works, the financial disclaimer and the AI/synthetic-media disclosure the generator adds.
4. Commit the specs and any generator fix on a new vibloid branch `tn-article1-videos`, push it, and open a pull request. Do NOT commit rendered media. Do NOT merge. Do NOT upload or post anything anywhere: the founder reviews and approves first.
5. Send the three MP4 files to the founder (SendUserFile). In your final message give: a table of the 3 hooks, the video lengths, the link tag for each, your recommendation for which to post first and why, and anything you could not verify.
6. In the TradeNotes repo, add an entry at the top of `docs/SESSIONS.md` (what was asked, found, changed, open) and open a PR for it (do not merge).
