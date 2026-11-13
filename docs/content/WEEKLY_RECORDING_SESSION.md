# Weekly recording session (7 videos in one sitting)
**Time budget:** about 3 hours recording + 2–3 hours editing across the week. Session A records Days 1–7, Session B records Days 8–14 (`WEEK_1_2_CALENDAR.md`). Free tools only; nothing here needs a new account.
Builds on `docs/CONTENT_ENGINE.md` §3 and `VIDEO_PRODUCTION_GUIDELINES.md` (9:16, 1080×1920, 30 fps, narration −16 LUFS).

## 0. The day before (30 min)
- [ ] Read the seven scripts aloud once; fix anything you would not say. **Approve each script** (the claims check in the calendar header) before recording.
- [ ] Print or open the seven scripts on a second device so you are not reading off the screen you record.
- [ ] Charge the phone; free 10+ GB; turn on do-not-disturb (notifications ruin screen recordings).
- [ ] Decide the voice route: your own voice (recommended) or synthetic voice. If synthetic, never imitate a real person and use any disclosure the platform requires.

## 1. Setup
**Audio (matters most):** quiet room, soft furnishings, phone mic about 15 cm from your mouth (as in `CONTENT_ENGINE.md`), pop-free. Record 10 s of room tone first for noise reduction. No fans or AC.
**Lighting (only if you appear on camera; the scripts don't require it):** face a window, light in front not behind, no overhead-only light. A phone torch bounced off a white wall is enough.
**Framing:** vertical, phone on something stable at eye level.
**Screen recording:** browser at 1080×1920 window or phone screen recording; zoom the app to 125% so text is readable on a phone; hide bookmarks bar, extensions and any real names or emails; light/dark mode: keep one for the whole batch.

## 2. The sample-data account
Create (or reuse) a **separate free-plan TradeNotes account** that holds only invented sample trades, so no real trading data can appear by mistake.
- [ ] 25–30 invented trades across 3 weeks, mixed winners and losers, with realistic R. Enter by hand: **broker import is Standard/Premium, so don't use it in free-plan footage.** The free plan holds 50 trades.
- [ ] Include the items the scripts show: one EURUSD long with stop (Day 4 and 11), mistake tags **Entered early, Moved stop, Revenge trade, Broke rules** on a few trades, the emotion **Bored** on a few, "Did you follow your plan?" = No on some, two strategy names for Day 5.
- [ ] Under 30 trades is enough to trigger the small-sample warning for Day 10; if your sample has 30+ trades, record the warning from a separate account with fewer, or skip that shot and say so.
- [ ] Keep the numbers **boring and not flattering**: the account must not look like a profitable track record. A mixed result is the honest sample.
- [ ] Every screen recording gets the burned-in label **SAMPLE DATA · NOT REAL TRADES**.
- [ ] Do **not** open Calendar, Reviews, Playbook or Import while recording (paid features). If a pop-up or upgrade prompt appears, retake.
- [ ] Never record with real customer data. If you use your own real trades instead, say so and hide anything identifying.

## 3. Recording order (batching saves the most time)
1. **All voiceovers first**, in script order, standing or sitting the same way. For each: read once, pause 2 s, re-read the line you fumbled (clap at each retake to see it in the waveform).
2. **Then all screen recordings**, grouped by what you open, not by video: (a) new-trade form (Days 4, 8, 11, 12, 14); (b) journal list with R column and filters (Days 3, 4); (c) dashboard/analytics (Days 1, 2, 5, 6, 7, 9, 10); (d) trade detail/edit (Days 11, 13).
3. Record each screen action **three times slowly**; you will speed up in the edit.
4. **Last, one 10 s "outro" breath** of room tone, and any on-camera pieces.
**Retake rule:** two takes for each line max; if the third is needed, change the wording instead.

## 4. File naming
`TN_<day>_<video>_<slug>_<type>_v<n>.<ext>` e.g. `TN_D04_V003_log-losing-trade_vo_v1.wav`, `TN_D04_V003_log-losing-trade_screen_v2.mp4`, final: `TN_D04_V003_log-losing-trade_FINAL_9x16.mp4`.
Folders: `week-01/raw-audio`, `raw-screen`, `edit`, `final`, `captions`. Keep a copy of the approved script next to each file.

## 5. Editing (free tools; pick one)
| Tool | Use | Note |
|---|---|---|
| CapCut (free) | Auto-captions, cuts, templates | Check the export has no watermark and no paid-only effects/music on free tier **[VERIFY]**; auto-caption features can move behind paywalls |
| DaVinci Resolve (free) | Cuts, audio clean-up, 1080×1920 timeline | Steeper learning curve |
| OBS Studio (free) | Screen recording | |
| Audacity (free) | Noise reduction, loudness | Target −16 LUFS |
| FFmpeg tools in the channel repo | `produce.py`, `qa.py` (see `CONTENT_ENGINE.md` §1) | They live in another repo; I have not run them |
Descript appears in `CONTENT_ENGINE.md` as connected to the workspace; use it only if it is already your free account (no new plans).

**Per-video edit steps (≈ 20 min each once practised):**
1. Drop VO on the timeline; cut breaths and false starts; remove dead air over 0.4 s.
2. Lay screen clips over the VO at the lines they illustrate (the storyboard in each `VIDEO_0XX.md` has timings).
3. Add the on-screen text from the calendar; amber highlight on the key word.
4. Burn in captions: ≤ 24 characters per line, ≤ 2 lines, 58 px, lower-middle third (inside 18–70% of height). Auto-caption, then fix every word by hand (numbers, "R", "EURUSD").
5. Add the corner **"Not financial advice."** for the whole video and **SAMPLE DATA · NOT REAL TRADES** over every app clip.
6. Music (optional): platform-licensed library only, ducked about −18 dB under voice, none if unsure.
7. 0.22 s dip transitions only; **no zooms, no intro, no outro**; end on a 2 s text card.
8. Export 1080×1920, 30 fps, H.264, narration around −16 LUFS, true peak ≤ −1.5 dB.

## 6. Pre-publish QA (every video; tick before it leaves the folder)
- [ ] Hook is in the first 2 seconds
- [ ] Length 25–45 s
- [ ] "Not financial advice." visible throughout
- [ ] Sample-data label on every app clip; no real names/emails
- [ ] Every number on screen matches the voiceover; worked-example figures marked EXAMPLE
- [ ] Only free-plan, built features shown; no Calendar/Reviews/Playbook/Import; no unbuilt features
- [ ] No profit, income or "get funded" language; no testimonial; no user count
- [ ] No trial or price mentioned in the video
- [ ] Sound is licensed for the platform; captions readable on a phone
- [ ] Caption, tags, Shorts title and CTA match the calendar

## 7. Posting day routine (≈ 10 min, you do it; I do not post)
Upload natively to each platform (no cross-platform watermark); paste the platform caption and title; set the bio-link tag is already in the profile; pin a comment with the takeaway; reply to every comment in the first hour using `COMMENT_AND_DM_PLAYBOOK.md`; log views in the tracker (`MEASUREMENT.md`).
