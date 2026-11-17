# QA · 001 · voiced cut (founder's own voice, "Video 1.m4a" from Drive)
File: `TradeNotes_001_voiced.mp4` · checked 2026-11-13

**Result: FAIL on length only; everything else passes. Not ready to post.**

| Check | Result | Detail |
|---|---|---|
| 1080x1920, 30 fps, H.264 | pass | |
| Length 25-45 s | **FAIL** | 51.1 s. Your take is slow (about 2.0 words/s; the script assumes 2.5), so after removing all repeats about 48 s of speech remains. |
| Narration -16 LUFS, true peak -1.5 dB | pass | -16.0 LUFS integrated, peak -1.9 dBFS (source take was -24 LUFS) |
| Captions <=24 chars, <=2 lines, timed to the audio | pass | timed by speech activity per scene, expect up to about 0.3 s drift; check by ear |
| Not financial advice., SAMPLE DATA label, end card >=2 s, no music | pass | end card 3.1 s |
| Synthetic-voice disclosure | n/a | your own voice |

## What was edited (version 2: repeats removed)
Only the clean attempt of each phrase is kept. Removed: the false starts "win rate" (about 26-28.6 s in your file), "the size of your win" (31.5-34.1 s), "that's why every trade in here" (36.7-38.5 s), the stray "you" before "divided by" (44.2 s), and the stumbled "average R minus zero point" (60.9-64.4 s) plus the 4 s dead gap. Phrases are joined with 0.1-0.3 s of your own room tone, short crossfades at every join, light noise reduction, gentle compression and normalisation. A transcript of the final audio reads through once, with no repeats.
- Joins worth listening to: "each loss minus" + "one R" (about 55.3 s and 59.3 s in your file).

## Needs your decision / a pickup
- [ ] **Length.** Re-record faster (about 2.5 words/s gives about 42 s), or I speed the voice up about 1.15x (pitch kept), which still lands near 46 s.
- [ ] **"my journal".** You answered "use safer wording" on the brief page but recorded "every trade in **my** journal". The captions follow what you said. Keep it if true, otherwise re-record that sentence as "in a journal needs an R number".
- [ ] Wording I could only check by transcript, not by ear: "costs" (script said "cost"), "win and losses" (script "wins and losses"), "what you risk" (script "risked"). Captions use the script words; tell me if you said otherwise.
- [ ] Sign-up not yet tested (affects 010 and 013 only).
