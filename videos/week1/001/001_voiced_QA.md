# QA · 001 · voiced cut (founder's own voice, "Video 1.m4a" from Drive)
File: `TradeNotes_001_voiced.mp4` · checked 2026-11-13

**Result: FAIL on length, otherwise PASS. Not ready to post.**

| Check | Result | Detail |
|---|---|---|
| 1080x1920, 30 fps, H.264 | pass | |
| Length 25-45 s | **FAIL** | 54.6 s. Your take runs about 2.0 words/s (the script assumes 2.5). After cutting pauses and the retake there is still about 51 s of speech. |
| Narration -16 LUFS, true peak -1.5 dB | pass | -16.0 LUFS integrated, peak -1.9 dBFS (source take was -24 LUFS) |
| Captions <=24 chars, <=2 lines, timed to the audio | pass | timed by speech activity per scene, expect up to about 0.3 s drift; check by ear |
| Not financial advice., SAMPLE DATA label, end card >=2 s, no music | pass | end card 3.1 s |
| Synthetic-voice disclosure | n/a | your own voice |

## What was edited
- Cut the 4 s dead gap and the stumbled retake ("average R minus zero point...") near the end; kept the clean second attempt.
- "each loss minus" and "one R" were joined across the gap (about 53.2 s and 59.4 s in your file): listen to that join.
- Shortened pauses, normalised loudness, re-timed scenes and captions to your speech.

## Needs your decision / a pickup
- [ ] **Length.** Re-record faster (about 2.5 words/s gives about 42 s), or I speed the voice up about 1.15x (pitch kept), which still lands near 46 s.
- [ ] **"my journal".** You answered "use safer wording" on the brief page but recorded "every trade in **my** journal". The captions follow what you said. Keep it if true, otherwise re-record that sentence as "in a journal needs an R number".
- [ ] Wording I could only check by transcript, not by ear: "costs" (script said "cost"), "win and losses" (script "wins and losses"), "what you risk" (script "risked"). Captions use the script words; tell me if you said otherwise.
- [ ] Sign-up not yet tested (affects 010 and 013 only).
