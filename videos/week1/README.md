# Week 1 review packages (videos 001 to 014, Opus-voiced scripts)
Nothing here has been posted. The founder approved all 14 scripts and chose **"no voice yet"**, so every video is a **silent cut** with burned-in captions and a timing sheet for recording the voice later.

**Status honesty:** every MP4 below was exported and reviewed (automated checks plus a frame-by-frame contact sheet). None is ready to post until a voice is added, the captions are re-timed to it, it is mixed to -16 LUFS, and the "founder to verify" items in each QA note are cleared.

MP4s are **not committed** (`.gitignore`); they were delivered to the founder directly. Each folder holds: `TradeNotes_NNN_silent.mp4`, `NNN_captions.srt` (upload), `NNN_captions_burnin.ass`, `NNN_thumbnail.png` (max 4 words), `NNN_platform_text.md` (TikTok / Reels / Shorts text + hashtags + pinned comment), `NNN_timing_sheet.md`, `NNN_QA.md`.

| # | Title | Length | Status | QA |
|---|---|---|---|---|
| 001 | Your win rate is lying to you | 44.1 s | silent cut, QA pass | `001/001_QA.md` |
| 005 | What '1R' means | 40.1 s | silent cut, QA pass | `005/005_QA.md` |
| 002 | The 3 things to write after every trade | 35.3 s | silent cut, QA pass | `002/002_QA.md` |
| 004 | The trade after the loss | 40.6 s | silent cut, QA pass | `004/004_QA.md` |
| 008 | What a 'lot' actually is | 38.7 s | silent cut, QA pass | `008/008_QA.md` |
| 003 | Logging a losing trade with me | 39.4 s | silent cut, QA pass | `003/003_QA.md` |
| 006 | 'I just need a better strategy' | 34.2 s | silent cut, QA pass | `006/006_QA.md` |
| 009 | Moving your stop | 39.0 s | silent cut, QA pass | `009/009_QA.md` |
| 012 | 'I watch the chart' | 35.8 s | silent cut, QA pass | `012/012_QA.md` |
| 007 | Not all losses are mistakes | 38.6 s | silent cut, QA pass | `007/007_QA.md` |
| 014 | Boredom trades | 35.0 s | silent cut, QA pass | `014/014_QA.md` |
| 010 | Your worst trading session | 38.6 s | silent cut, QA pass | `010/010_QA.md` |
| 011 | The 5-minute weekly review | 37.6 s | silent cut, QA pass | `011/011_QA.md` |
| 013 | Fixing a trade you logged wrong | 31.4 s | silent cut, QA pass | `013/013_QA.md` |

## How the footage was made
- Real app: a local build of `main`, a local Postgres database and sample users only (`sample-...@example.com`, account "Sample account"). Sample trades were entered through the app's own trade form, so P&L and R are computed by the app. Recorded with Playwright at 720 CSS px wide (wide enough for the Avg R column), scaled into a 1080x1920 frame with **SAMPLE DATA · NOT REAL TRADES** burned in.
- Sample trades built to match the scripts: 001 (7 x +$30 / +0.30R, 3 x -$100 / -1.00R, avg -0.09R), 005 (+$100 +2.00R, -$50 -1.00R, +$100 +0.50R), 003 (EURUSD long 1 lot 1.0850 / stop 1.0820 / exit 1.0820, risk $300, -1.00R, "Entered early", lesson "Wait for the candle to close"), 013 (1 lot EURUSD 1.0850 to 1.0950, $7 fees = +$993.00, edited to 1.0910 = +$593.00, "Changes saved."). Analytics videos use one 32-trade sample account.
- Package fixes from `docs/content/voiceover/README.md` applied on screen: 001 chips +0.3R/-1R with avg -0.09R; 003 "stop 30 pips"; 005 risk amounts shown; 007 card reads LOSS; 008 end card "Size changes your risk."; 010 Analytics "By session" with Avg R visible; 011 no "this week" range implied; 013 $993 to $593; 014 "The fix: trades you skip".
- Style: navy #0A0F1A, one amber accent, Inter Display, 0.22 s dip transitions, no zoom, captions max 24 chars x 2 lines, "Not financial advice." on screen throughout, end card of at least 2 s, no music.
- CTAs on 010 and 013: https://tradenotes.dev/signup returned HTTP 200 ("Create account") on 2026-11-13. A full production sign-up was not tested.

## Founder answers applied (2026-11-13, from the voiceover brief page)
- 001: line changed to "every trade in a journal needs an R number" (not first person).
- 003 and 013: prices read as "one point zero eight five zero" style (not "oh").
- Kept as written: 002 "thirty seconds", 003 "same steps I use", 004 personal rule and tagging, 006 twenty trades and "most beginners", 007, 008.
- Voice: founder records own voice, one file per video (001.wav etc.), sent in chat. No music. Thumbnails: founder will supply a photo. EURUSD is spoken "euro U-S-D".
- Open: live sign-up not yet tested, so the 010 and 013 CTAs must not post until it is. The script review (ready / needs changes) on the brief page was left blank; the end-card handle is empty.
