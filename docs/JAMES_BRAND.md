# James: brand guide

James is a stickman who writes his notes. He is the **mascot, narrator and host** everywhere: website, daily newsletter, videos (YouTube, Shorts, TikTok, Reels), and social posts. One character, one voice, one sign-off.

## Who he is
- A cartoon learner sharing what he writes down about trading, money habits and keeping a journal. Not a guru, not a trader to copy, not a real person with real earnings.
- Voice: calm, curious, friendly, a little dry. First person ("my notes", "I wrote this down"). Short spoken sentences. Admits what he doesn't know.
- Sign-off (always the same): **"That's today's page from my notes. See you tomorrow. — James"**

## Look
- White line figure on near-black (`#0b0f14`), one blue notebook (`#3b82f6`). Round head, two dot eyes, small smile. Poses: write (default), wave (sign-off), think (questions), read.
- Never change his proportions, add a face-swap, a suit, cash, cars, charts-going-up or a "rich" look. Never show him profiting.
- Master drawing: `src/components/James.tsx` (site), `src/lib/james-art.ts` (images), `drawJames` in Vibloid `src/lib/scenes.ts` (video). Keep the three in sync.
- Profile art, regenerate with `node scripts/brand-assets.js`: `public/brand/james-avatar.png` (800x800, safe for circular crops) and `james-banner.png` (2560x1440, keep text in the centre safe area). Use the same avatar on **every** platform so people recognise him.

## Where he appears
| Surface | How |
|---|---|
| Website | Header mark, home page "Meet James", every note page, favicon, share images (`opengraph-image`) |
| Newsletter | "James's Daily Notes", plain-text email in his voice, sign-off, unsubscribe + disclaimer |
| Videos (Vibloid) | Narrator on every script (`prompts/james.md`, TTS persona); `james` scene (speech bubble) and a waving James on the end card |
| Social | Same avatar/banner; per-note posts from `/notes/<slug>/share` (X, Instagram, TikTok, YouTube) |

## Daily rhythm
1. Write tomorrow's note in `src/content/notes.ts` (article or made-up story, alternating). Merging it is the approval.
2. 07:00 Jamaica time the newsletter goes out (cron). The note page goes live the same day.
3. Open `/notes/<slug>/share`, review the drafted posts, post them yourself. Nothing posts automatically.
4. Optionally turn the note into a Short with Vibloid (James narrates).

## Hard rules (same as the rest of the business)
- Educational only. No financial advice, no profit or income claims, no tips or signals, no fake testimonials.
- Every post, email and description carries "Not financial advice" and, where relevant, that trading involves risk of loss.
- Stories are **always** labelled "made up". Real numbers need a source or must be clearly labelled hypothetical.
- Handles: reserve the same name on every platform and say "James" in the display name, e.g. "James | TradeNotes". (Account creation is manual; not done here.)
