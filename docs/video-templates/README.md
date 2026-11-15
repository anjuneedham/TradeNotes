# Short-video templates (TradeNotes / Andrew Builds)

Three working specs for the Vibloid Short generator (`scripts/make-short.ts` in the vibloid repo). Each one renders as-is to a 57-60 s vertical Short with voice, captions and code-drawn scenes. Copy one, change the words, run it. The same files are kept in vibloid `specs/templates/` and TradeNotes `docs/video-templates/`.

| File | Format | Use it when |
|---|---|---|
| `belief-reversal.json` | Kinetic hook, promise, three numbered beats, twist, app beat, payoff, end card | The viewer believes something and you can name the three things behind it. No data needed. |
| `sample-data-reveal.json` | Hook, SAMPLE trades (chips), one new tag (typing), the split (kpis), honest twist, payoff, end card | A pattern is easier to show than to explain. |
| `checklist-loop.json` | Identity hook, steps (checklist, typing), why the skipped step matters (dots), payoff, do-this-today end card | You are teaching a routine the viewer can do today. |

The filler text is real, compliant copy (backtest errors, the after-a-loss tag, the weekly review), so it shows the rhythm. Replace all of it. The `_template` block at the top of each file says what to keep; the generator ignores that block.

## Clone and run
```bash
cd vibloid
cp specs/templates/belief-reversal.json specs/tradenotes/06-my-topic.json
# edit: slug (tradenotes-06-my-topic), title, body, post. Delete the _template block if you like.
pnpm exec vitest run tests/tradenotes-specs.test.ts            # schema, claims lint, series rules, scene drawing
TTS_PROVIDER=kokoro pnpm exec tsx scripts/make-short.ts specs/tradenotes/06-my-topic.json
```
Needs: ffmpeg, Postgres reachable at `E2E_ADMIN_URL` (default `postgres://postgres@localhost:5433/postgres`), and `bash scripts/setup-kokoro.sh` once. Output lands in `output/shorts/<slug>/` (mp4, srt, vtt, cover, POST-COPY.md). The `ok20to45s` flag in the summary will read `false` for 45-60 s videos; look at `durationS`.

## Hook and loop checklist
- [ ] Hook is 12 words or fewer and reverses a belief, teases without a number, or calls out an identity. No hype.
- [ ] Hook scene is `kinetic`, 3-4 lines, 14 characters or fewer per line (all lines must be on screen by 1.6 s, which is the cover frame).
- [ ] Promise (18 words or fewer) opens the first loop by second 8: a named count with the last item teased.
- [ ] Every beat ends on a line the next beat only partly answers. A re-hook every 8-12 s.
- [ ] No more than 3 loops open at once.
- [ ] Every loop is paid off truthfully in this video. The hook's own question is paid last, just before the CTA.
- [ ] CTA comes after the payoff: one small action for today, then "Not financial advice."
- [ ] 150-158 words in total (about 2.6 words per second including the end hold).

## Compliance guardrails
- Educational only. No win rate, profit figure, "this works", "will improve your returns", signals, entries, exits or price targets.
- A journal is evidence about your own behavior. A backtest is what an idea did historically, not a prediction. Say that whenever a backtest is mentioned.
- Narration carries no `%` or `$` figures. Numbers live only in scenes with the "SAMPLE DATA · NOT REAL TRADES" badge, and the voice calls them "sample".
- If you change sample numbers, recompute everything derived from them (the kpis cards in `sample-data-reveal.json` are the sums of its chips).
- One natural spoken sentence about the risk of loss.
- Spoken ownership in the app beat: "I built TradeNotes, my own trading journal, so I'm biased." Say only what the software does. One app beat per video.
- "Not financial advice." spoken in the CTA and shown on the end card (`small`).
- No fake testimonials, user counts or income screenshots. The founder approves every claim before posting.
- `claims` stays `[]` unless you add a sourced statistic; then list it and resolve it in the app before rendering.

## Scene kinds
Set `"visual_type": "scene"` on the beat and put one of these in `scene`. `body.scenes.hook`, `.promise` and `.cta` take the same shapes.

| kind | Parameters | Notes |
|---|---|---|
| `kinetic` | `lines: [{ text, color?: "amber"\|"text"\|"loss"\|"win" }]`, `sub?`, `badge?: true` | Big stacked words. Hooks, twists, payoffs. `badge` adds the SAMPLE label. |
| `chips` | `items: [{ t: "+$40", k: "win"\|"loss" }]`, `caption?` | Grid of trades, 5 per row, with a live win/loss tally. SAMPLE badge always on. |
| `sum` | `won`, `lost`, `trades` | Won and lost bars, net, expectancy per trade and profit factor, all computed. SAMPLE badge. |
| `kpis` | `title?`, `note?`, `cards: [{ label, value, hint?, tone?: "win"\|"loss"\|"neutral" }]` | App-style dashboard, 4 cards at most. SAMPLE badge. Use `note` to repeat "sample / hypothetical". |
| `progress` | `have`, `need`, `caption?` | "have of need closed trades" bar. SAMPLE badge. |
| `typing` | `text`, `label?`, `caption?` | Text typed into a box. About 4 lines of 24 characters. Plans, rules, tags. |
| `checklist` | `items: string[]`, `title?` | Rows that tick one by one. Best with 2-3 items. |
| `dots` | `total`, `label`, `caption?` | Dots fill while a counter runs "n/total". |
| `endcard` | `title`, `tagline`, `small?` | Closing card. `tagline` breaks into lines after each full stop, so avoid abbreviations like "vs.". |

A beat can instead use `"visual_type": "chart"` with `chart: { dataset, kind: "line"|"candles"|"bars"|"counter", title?, unit? }` and a matching entry in the spec's top-level `datasets` (each needs a named `source`).
