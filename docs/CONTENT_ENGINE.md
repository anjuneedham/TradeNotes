# Content Engine — repeatable short-form system

**Goal:** 3 TikToks + 2 YouTube Shorts a day from **one weekly recording session**, using the same 5 formats so editing becomes mechanical.
**Platforms:** TikTok + YouTube Shorts (same file, different caption/title). Founder approves every claim before posting.

## 0. Rules that never bend
- **No profit claims, no "this will make you profitable", no fake results/testimonials/user counts.** Every screen recording shows either the founder's own real data or data clearly labelled **SAMPLE DATA**.
- On-screen small text on every video: **"Not financial advice."** Backtest/hypothetical numbers are labelled as such.
- Only show features that exist today (see `IMPLEMENTATION_STATUS.md`). Backtesting is "coming", not shown as working.
- Don't copy other creators' scripts, footage, music, branding or exact visual identity (the Andrew Builds look is your own channel's). Use platform-licensed sounds only.
- Educational market facts: only things you can cite or demonstrate with your own data.

## 1. Visual system — taken from the Andrew Builds repo (`anjuneedham/Andrew-Builds-`, `production/*/video_style_config.json` + `THUMBNAIL_BRIEF.md`)
TradeNotes content publishes on the **Andrew Builds** channel, so it uses that channel's existing look. Those values are reproduced here from the repo; the repo notes they are placeholder brand values you may still replace.

| Element | Spec (from the repo config) |
|---|---|
| Frame | 9:16, 1080×1920, 30 fps, H.264 CRF 20, narration −16 LUFS, true peak −1.5 dB |
| Palette | Background `#0A0F1A` · panel/slate `#141B2B` · text `#F5F7FA` · **one accent: amber `#F2B01E`** · muted `#8A97AD` |
| Type | Inter Display Bold headings (96 px vertical), Inter Medium captions |
| Captions | Burned in, **58 px**, lower-middle (keep between 18% and 70% of frame height), dark rounded box at 62% opacity, **≤24 characters per line, ≤2 lines**, highlight the key word in amber |
| Motion | Quick "dip" transition (0.22 s), **no zoom, no intro, no outro**; end on a 2 s text card |
| Content on screen | The real app inside the frame. Demo footage always carries a burned-in label — for TradeNotes: **"SAMPLE DATA · NOT REAL TRADES"**. Hide any real names |
| Thumbnails/covers | ≤4 words, off-white first line + amber second line, one UI card, photo slot of you; one accent colour, no gradients on text, no shocked faces/arrows, no money/results |
| Pacing | One idea per short; hook in the first 1–2 s; 20–45 s total |

**Rules carried over from that repo (they match ours):** never show revenue you have not confirmed arrived; nothing from a private conversation without permission; no invented activity to hit a number (**if only one real thing happened today, post one**).
**Tooling you already own:** `production/tools/produce.py` (FFmpeg assembly from JSON), `qa.py` (checks), `make_thumbnails.py`, `capture_demo.js` (records the app on demo data), `suggest_content.py` (ideas from real activity), templates in `production/templates/`. Recommended: add TradeNotes as a series inside that repo rather than rebuilding any of it (needs push access to that repo — say the word).
**The app inside the frame:** TradeNotes itself is dark with blue accents; that is fine — the frame, captions and thumbnails stay Andrew Builds (navy + amber).

## 2. The five repeatable formats
Each is a template: the structure stays fixed, only the topic/numbers change.

**F1 — "The number lies" (education + stat).** 25–35 s
Hook (red text): a misleading stat → reveal the number that matters → show it in the app → CTA.
Beats: 0–2 hook · 2–10 setup example · 10–22 reveal (big number) · 22–30 show in TradeNotes · 30–35 CTA.

**F2 — "Journal this with me" (live trade log).** 30–45 s
Screen-record logging one real trade: instrument → entry/stop → exit → tag the mistake → see R. VO explains each field in plain English. Ends with the lesson line.

**F3 — "Mistake of the week" (psychology).** 25–40 s
Name a mistake (moved stop, revenge trade) → what it looks like in a journal → how tagging reveals its cost → one rule to prevent it.

**F4 — "Build log" (build-in-public).** 20–40 s
Real progress: one shipped feature, one number from the build (e.g. tests passing, a bug found), one honest problem. Shows the progress strip. Builds trust with beginners.

**F5 — "Beginner answers" (Q&A).** 20–30 s
One question ("How many trades before I can trust a strategy?") → direct answer first → the nuance → link to `/learn`. Reuses glossary entries.

## 3. Weekly production workflow (≈ 5 h/week founder time)
| When | Task | Output |
|---|---|---|
| Sun, 60 min | **Record:** 10 screen recordings (2 per format) + 10 voiceovers from approved scripts | raw clips |
| Sun, 30 min | Approve scripts (claims check) — I draft, you approve before recording | approved script list |
| Mon–Fri, 20 min/day | Edit 1–2 clips from the batch (captions auto-generated, then fixed by hand) | 5 finished videos |
| Daily, 10 min | Post: TikTok + Shorts, pin comment with CTA, reply to every comment in the first hour | 3 posts |
| Daily, 45 min | **Outreach:** 20–30 personalised DMs (see `SALES_PLAYBOOK.md`) | pipeline |
| Fri, 20 min | Review: log views/saves/clicks/signups per video → pick next week's winners | sheet row per video |

**Tools (free-first):** phone or OBS for screen recording; CapCut (free) or Descript for captions/cuts; a Google Sheet for tracking. Descript is connected to this workspace — once you have recordings, I can drive it to create caption clips; you still approve the final cut.
**Voiceover:** record in a quiet room, phone mic 15 cm away, then normalise loudness in the editor.

## 4. Posting, CTA ladder, tracking
- Cadence: 3 TikToks + 2 Shorts daily (re-post best TikToks as Shorts; change title/caption).
- CTA ladder (rotate): (1) "Free journal — link in bio" (2) "Comment 'JOURNAL' and I'll send it" (3) "Follow for day-by-day" (4) ~~founding-member offer~~ withdrawn: no offer exists (see `HQ.md` "Offer rule").
- Link in bio → landing page. Add `?src=tt` / `?src=yt` later for attribution (not built yet).
- Track per video: format, hook text, 3-sec view rate, avg watch %, saves, link clicks, signups. **Kill formats with weak hooks after 10 posts; double down on the top 2.**

## 5. Script skeleton (copy for every video)
```
ID / Format / Pillar:
Hook (≤2 s, on-screen text + spoken):
Talking points (3 max):
Full VO:
Screen recording plan (what to click, in order):
On-screen captions / big numbers:
CTA:
Title (Shorts) / Caption + hashtags (TikTok):
Claims to verify before posting:
Editing notes:
Status: idea → scripted → approved → recorded → edited → posted → measured
```

## 6. Idea bank (30) — each = format + hook
| # | Fmt | Hook (draft) |
|---|---|---|
| 1 | F1 | "A 70% win rate can still lose money — here's the math" |
| 2 | F1 | "Your profit factor is hiding this" |
| 3 | F1 | "Why 10 trades proves nothing" |
| 4 | F1 | "Average win vs average loss: the number most traders skip" |
| 5 | F1 | "Max drawdown: the stat that predicts if you'll quit" |
| 6 | F2 | "Logging a forex trade in 60 seconds" |
| 7 | F2 | "How I tag a losing trade so it teaches me something" |
| 8 | F2 | "Logging a trade with two partial exits" |
| 9 | F2 | "What R-multiple means — on a real trade" |
| 10 | F2 | "Importing your broker CSV" *(only after import ships)* |
| 11 | F3 | "The mistake that cost me the most (moving my stop)" |
| 12 | F3 | "Revenge trading looks like this in a journal" |
| 13 | F3 | "Oversizing: how to see it in your data" |
| 14 | F3 | "Entering early — the pattern my journal exposed" |
| 15 | F3 | "FOMO trades: tag them and count them" |
| 16 | F4 | "Day 1: building a trading journal because I kept repeating mistakes" |
| 17 | F4 | "I wrote tests for my win-rate formula — here's what broke" |
| 18 | F4 | "A user-isolation bug I found before launch" |
| 19 | F4 | "Why I made the app say 'not enough data' instead of a number" |
| 20 | F4 | "First signup / first feedback" *(only when real)* |
| 21 | F5 | "How many trades before you trust a strategy?" |
| 22 | F5 | "Do I need to journal if I'm profitable?" |
| 23 | F5 | "What's expectancy in plain English?" |
| 24 | F5 | "What's a good risk/reward ratio?" |
| 25 | F5 | "Why do backtests fail in live trading?" |
| 26 | F3 | "Sessions: which of London/NY is actually your best?" (use own data) |
| 27 | F1 | "Fees are the stat you're not counting" |
| 28 | F5 | "Should beginners backtest first?" |
| 29 | F4 | "What I'd tell my 1-year-in self about journaling (7 years in)" |
| 30 | F5 | "Weekly review in 10 minutes: the 3 questions" |
| 31 | F4 | "I'm going all-in on one business" *(story is yours; claims must be true and approved by you)* |
| 32 | F4 | "Why a two-sided marketplace is brutal to market — and what I'm doing instead" *(only your own facts)* |
| 33 | F4 | "Day 1 of outreach: 25 DMs on TikTok, 25 on Instagram — what I'll measure" |

## 7. Next steps (owner)
1. Confirm the Andrew Builds palette above is the look you want (the repo says it is placeholder).
2. I draft scripts for ideas 1–10 in the skeleton above → you approve → record the first batch.
3. Create the tracking sheet (columns = section 4) — I can generate a CSV on request.
