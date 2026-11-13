# Channel setup — YouTube Shorts, TikTok, Instagram Reels
**Status: a brief for the owner. Nothing here has been created, posted or changed on any account.** Items marked **[VERIFY]** could not be confirmed from an official platform page (the limits below come from third-party guides found by web search; check them in each app before you type anything).

## 0. Decision needed first: which channel name?
`docs/CONTENT_ENGINE.md` §1 says TradeNotes content publishes on the existing **Andrew Builds** channel. This brief asks for one consistent handle. Two options:
- **A (recommended for a clean funnel):** new TradeNotes-branded accounts on all three platforms, same handle. Visitors know what they are following and the bio can speak only to journaling.
- **B:** keep Andrew Builds and post TradeNotes as a series. Less setup, but followers of a build-in-public channel are not the beginner-trader audience, and the bio/link has to serve both.
Everything below assumes **A**. If you choose B, reuse the bio lines but keep the existing handle.

## 1. Handle
Pick the first of these that is **free on all three platforms** (I cannot check availability; do it in each app's sign-up screen):
1. `tradenotes` 2. `tradenotesapp` 3. `tradenotesdev` 4. `usetradenotes`
Rules to respect (all **[VERIFY]**): TikTok username ≤ 24 chars (letters, numbers, `_`, `.`); Instagram username ≤ 30 chars; YouTube handle ≤ 30 chars. Display name (≤ 30 chars on TikTok/Instagram **[VERIFY]**): **TradeNotes — Trading Journal**.
Do not use "official", "pro", "signals", "funded" or "profit" in the handle or name.

## 2. Bio (same message, sized per platform)
Core line: *A trading journal for newer traders. Free plan. Not financial advice.*

| Platform | Limit **[VERIFY]** | Bio text | Chars |
|---|---|---|---|
| TikTok | 80 (one source says 160; trust what the app shows) | `Trading journal for newer traders. Free plan. Not financial advice.` | 66 |
| Instagram | 150 | `A trading journal for newer traders: track R, tag mistakes, review your week.\nFree plan. Not financial advice.` | ~108 |
| YouTube (channel description, "About") | 1,000 **[VERIFY]**; keep it short | `One idea a day about journaling your trades and fixing repeat mistakes. TradeNotes is a trading journal with a free plan. It does not give trading advice or promise results. Not financial advice.` | ~195 |

Do **not** put in any bio: "7 years of trading", income, "funded", "profitable", win rates or user counts. The founder's trading history appears in internal docs but is an unverified public claim: add it only if the owner confirms the exact wording.

## 3. Link in bio
One link per platform, each with its own `?src=` tag (see §6):
| Platform | Link | Notes |
|---|---|---|
| TikTok | `https://tradenotes.dev/?src=tt-organic` | A clickable bio link may depend on account type or follower count **[VERIFY]** |
| Instagram | `https://tradenotes.dev/?src=ig-organic` | Instagram now allows several links; one sources says up to 5 **[VERIFY]**. Keep this one first |
| YouTube | `https://tradenotes.dev/?src=yt-organic` | Add under channel "Links" in YouTube Studio. Links in Shorts descriptions may not be clickable **[VERIFY]** |
Link-in-bio text (the label the person sees, where the platform allows one): **"Start free — no card"**. Source: pricing page says "No card needed for Free." Do not use a third-party link-in-bio tool (no new accounts or paid tools).
Landing page headline people will see: "Know your trades. Understand your patterns. Improve your process." with a **Start free** button (`src/app/(marketing)/page.tsx`).

## 4. Profile image brief
- Square, simple, readable at 40 px. Background navy `#0A0F1A`, one amber `#F2B01E` element (palette from `docs/CONTENT_ENGINE.md` §1).
- Idea: a minimal notebook/line mark or the letters "TN" in Inter Bold. No chart-going-up arrows, no money, no candlesticks with green arrows, no faces needed.
- Do not copy another creator's or broker's mark. Make it in a free tool (Canva free, Figma free, or Inkscape). The repo contains no logo file (only default Next.js SVGs), so this is new work for the owner.
- Safe zone: platforms crop to a circle; keep the mark inside the central 70%.
- Banner (YouTube): same palette, text "A trading journal. One idea a day." plus "Not financial advice." small.

## 5. Pinned-post idea per platform
Pin a single "what this channel is and isn't" post, built from `VIDEO_060` (What TradeNotes is and isn't). It is a Draft package: the script says TradeNotes won't tell you what to trade or promise profits; it records your trades, explains your numbers and shows your habits; free to start.
- **TikTok:** pin this video (pinning limit per account **[VERIFY]**). Pin a comment on every video with the one-line takeaway (existing routine in `SEVEN_DAY_PUBLISHING_PLAN.md`).
- **Instagram:** pin to the profile grid (limit **[VERIFY]**); also create one Highlight "Start here".
- **YouTube:** set as the channel trailer/featured Short if available, or pin the Day-4 demo (Short pinning options are limited **[VERIFY]**).

## 6. Source tracking with the existing `?src=` tag
What exists (verified in `src/middleware.ts`, `src/lib/db-config.ts`, `docs/marketing/CAMPAIGN_TRACKING_PLAN.md`):
- `?src=<tag>` on any URL sets a 30-day first-party cookie (`tn_src`), first tag wins, and the tag is saved on `profiles.signup_source` at first sign-in.
- Tag format: lowercase letters, digits and hyphens, 1–24 characters (`^[a-z0-9-]{1,24}$`). Anything else is silently dropped.
- No `utm_*` parameters are read by the app (I found no code that does). Use only `?src=`.

Tags in use or planned, so organic stays separable from other tests:
| Tag | Where | Already defined in |
|---|---|---|
| `tt-organic`, `ig-organic`, `yt-organic` | Bio links (this plan) | `CONTENT_STRATEGY.md` |
| `ig-ad-001`, `-004`, `-013` | Paid Instagram test | `INSTAGRAM_AD_STRATEGY.md` |
| `tt-dm`, `ig-dm` | Manual DMs | `SALES_PLAYBOOK.md` |
| `?ref=code` | Partner links (separate system) | `AFFILIATE_PROGRAM.md` |
Optional per-video tags (only where a link can be clicked, e.g. a YouTube description or a DM reply): `yt-v003`, `tt-v004` (≤ 24 chars). Keep it to the videos you most want to compare; the bio link stays per-platform.

Weekly query (adapted from the tracking plan; run in the Supabase SQL editor):
```sql
select p.signup_source as src, count(*) as signups,
  count(*) filter (where (select count(*) from tradenotes.trades t where t.user_id = p.id) >= 5) as activated,
  count(*) filter (where s.plan <> 'free' and s.status in ('active','trialing','past_due')) as paid
from tradenotes.profiles p left join tradenotes.subscriptions s on s.user_id = p.id
where p.signup_source like '%-organic' or p.signup_source ~ '^(yt|tt|ig)-v' group by 1 order by 2 desc;
```
(I did not run this; it is copied and adapted from the tracking plan.)

Known gaps to tell the owner plainly:
- **Undercount:** people who watch, then search the site later, arrive untagged. Treat `?src=` counts as a floor.
- **First touch wins:** someone who clicked an ad tag first stays on the ad tag.
- The tag is stored at first sign-in, so a person who clicks today and signs up in 3 weeks is still counted; after 30 days the cookie expires.

## 7. Platform limits to verify (summary)
| Item | Value found | Source quality |
|---|---|---|
| TikTok bio / username / display name | 80 / 24 / 30 chars | Third-party, consistent; one source says bio 160 |
| TikTok caption | 2,200 (some say 4,000) | Conflicting |
| Instagram bio / username / display name | 150 / 30 / 30 | Third-party, consistent |
| Instagram bio links | up to 5 | Two third-party sources |
| YouTube title / description | 100 / 5,000 | Third-party, consistent |
| YouTube Shorts title that shows without cutting | ~40–70 chars | Third-party, differing |
| YouTube handle | ≤ 30 chars (3-char minimum not confirmed) | Third-party |
| Shorts maximum length (currently up to 3 minutes?) | **Not confirmed**; our videos are 25–45 s so it does not matter | Not found |
| TikTok bio link eligibility | **Not confirmed** | Not found |
| Pin limits (TikTok, Instagram, YouTube) | **Not confirmed** | Not found |

## 8. First-day checklist for the owner (manual)
1. Check handle availability on all three; create accounts yourself. 2. Add bio, name, image. 3. Add the tagged bio link. 4. Turn on any "AI-generated content"/synthetic-voice disclosure if you use a synthetic voice (`VIDEO_PRODUCTION_GUIDELINES.md`). 5. Confirm each platform's account type (personal vs creator/business) lets you add the link. 6. Test each tagged link in a private window and confirm the landing page loads.
