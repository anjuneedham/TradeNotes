# Design QA

Date: 2026-11-11. Environment: local, Node 22, Postgres 16, schema from `db/paste`, **production build** (`next build` + `next start`). Not tested against the deployed site or the production database.

## Automated
| Check | Command | Result |
|---|---|---|
| Types | `npx tsc --noEmit` | 0 errors |
| Lint | `npm run lint` | exit 0 |
| Unit | `npm test` | 55 passed (50 existing + 5 for `trades-data`) |
| Build | `npm run build` (migrate + verify-db + next build) | Success; marketing and legal pages remain static |
| Browser e2e | `node scripts/e2e.js` | **38/38** (30 existing + 8 new) |

The 30 existing checks pass with one line changed (two-step delete). That matters: they assert hand-calculated figures ($593.00, 1.98R, $293.00, 50.0 %), the exclusion and small-sample notices, tenant isolation and auth gates — so the redesign did not alter any number or rule.

New checks: mistake-tag and instrument breakdowns on Analytics; date range on the dashboard; journal `status=open`; trade detail shows result, planned risk, tags and strategy; **user B gets 404 on user A's trade URL**; billing shows usage "3 of 50"; appearance preference applies and reverts.

## Manual / visual
Screens captured and inspected with a seeded account (47 trades, three strategies, tags, one open trade) and with the e2e account (3 trades):

| Screen | 390 px | 820 px | 1280 px | Light | Dark |
|---|:-:|:-:|:-:|:-:|:-:|
| Landing | ✓ | — | ✓ | — | ✓ |
| Pricing | ✓ | — | ✓ | — | ✓ |
| Log in / Sign up | ✓ | — | ✓ | — | ✓ |
| Onboarding | ✓ | — | ✓ | — | ✓ |
| Dashboard (empty and populated) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Analytics | ✓ | ✓ | ✓ | ✓ | ✓ |
| Journal | ✓ | ✓ | ✓ | ✓ | ✓ |
| Trade detail | ✓ | ✓ | ✓ | ✓ | ✓ |
| Log a trade | ✓ | ✓ | ✓ | ✓ | ✓ |
| Plan & billing | ✓ | ✓ | ✓ | ✓ | ✓ |
| Settings | ✓ | ✓ | ✓ | ✓ | ✓ |

"—" = not captured. Every captured page was also checked by script for horizontal page overflow (`scrollWidth > innerWidth`).

## Defects found during QA and fixed
| Defect | Fix |
|---|---|
| Pricing page 502 px wide on a 390 px phone | Screen-reader-only text inside the scrolling table escaped its container; scrolling boxes are now `relative` (rule added to the architecture doc) |
| Journal overflowed at 820 px | Table now starts at 1024 px; cards below |
| Hero preview figure clipped ("+$1,130.0") | Preview stats use a two-column grid |
| Public header wrapped on phones | "Learn" moves to the footer below 640 px |
| Tag chips could not be operated by the test driver (hidden checkbox) | The real input now covers the chip — also better for assistive technology |
| A hint containing the word "instrument" made two fields match the label "Instrument" | Hint reworded |
| Input borders were 1.3–1.9:1 | New `field` token, 3.2–3.7:1 |
| An active subscriber could start a second subscription from the other plan card | Checkout button replaced by an instruction for active subscribers |

## Defect found and **not** fixed (backend)
Futures trades cannot be saved — handoff H-1.

## Accessibility
| Item | Result |
|---|---|
| Text contrast | Measured for every token pair in both themes: minimum 4.93:1 |
| Focus visible | Global 2 px ring; chips and radio cards show it via `:has(:focus-visible)` |
| Keyboard | Forms, filters, tabs and delete confirm are native controls and links. Tab order follows the visual order. Not exhaustively walked on every page |
| Labels | Every input has a visible label; filters have screen-reader labels |
| Errors | `role="alert"`; `aria-invalid` on fields; summary + field text |
| Colour independence | Results are signed (+/−) and labelled; statuses are words |
| Touch targets | Buttons, inputs, tabs ≥ 44 px on phones; chips 36 px |
| Reduced motion | Honoured |
| Chart | Text alternative in `aria-label`; read-out works by touch; **no keyboard access to individual points** |
| **Screen reader** | **Not tested** with VoiceOver or NVDA |
| Automated audit (axe / Lighthouse) | **Not run** |

## Performance
First-load JavaScript 103–108 kB per route (trade form 138 kB). Fonts: three self-hosted files, 92 kB total, `font-display: swap`. No images. No client-side data fetching. Not measured: Lighthouse, real-device timing, behaviour with thousands of trades.

## Not tested
- Deployed environment, real email, real payment, activation after payment.
- Paid-plan and lapsed states on the billing page with real subscription rows (code paths read; states 5–7 not exercised in a browser).
- The two limit panels in a browser (logic is the existing tested `canAddTrade`; seeded account reached 47 of 50 and showed the "3 left" notice).
- Safari and Firefox (Chromium only). iOS safe-area behaviour of the bottom bar on a real device.
- Long content: very long strategy names and notes; instruments with 20+ characters.
- Second trading account (cannot be created).
