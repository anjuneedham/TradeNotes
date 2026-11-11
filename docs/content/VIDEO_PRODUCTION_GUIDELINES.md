# Video production guidelines
Applies to every package in `videos/`. Visual system: `docs/CONTENT_ENGINE.md` §1.

## Format
9:16, 1080×1920, 30 fps, H.264; 25–45 s; no intro/outro; end on a 2 s text card. Narration −16 LUFS, true peak −1.5 dB, music ducked ~−18 dB under voice.

## Animation (for Claude-driven animated video tools)
- Flat motion graphics: cards, bars, counters, simple price lines. One accent colour (amber) for the key word/number.
- Transitions: 0.22 s dip. No zooms, no shaky "hype" effects, no fake trading screens with fake P&L.
- Numbers on screen must match the voiceover exactly.
- When a storyboard says "Screen recording", capture the real app with sample data (`capture_demo.js` in the channel repo or Playwright) and burn in **SAMPLE DATA · NOT REAL TRADES**.

## Captions
Burned in, ≤24 characters per line, ≤2 lines, lower-middle third, highlight one key word. The caption tables in each package are timed at 2.6 words/s — re-time to the actual voice track.

## Voice
Calm, clear, conversational; no shouting. If using synthetic voice, disclose it where the platform requires and never imitate a real person.

## Compliance checklist (every video)
- [ ] No profit promise, no "this strategy works", no income claims
- [ ] "Not financial advice." visible
- [ ] App footage labelled SAMPLE DATA, no real names/emails
- [ ] Only shows features that exist today
- [ ] Music licensed for the platform
- [ ] Founder approved the script

## Status honesty
A package is "produced" only when an exported MP4 exists and has been reviewed. Track that in the content tracker; this repo contains scripts only.
