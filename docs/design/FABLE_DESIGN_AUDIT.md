# Design audit (before redesign)

Method: read all source, ran the app locally, captured every screen at 1280 px and 390 px, walked signup → onboarding → first trade → dashboard → billing. Scores are for the state **before** this work; the after-scores are in `FRONTEND_COMPLETION_REPORT.md`.

## Summary
The MVP was **sound underneath and thin on top**. The metrics engine is careful (exclusions disclosed, small samples flagged, no infinity), data isolation is real, and the copy is unusually honest about what isn't built. The interface was a default Tailwind dark theme with one layout, no hierarchy between screens, and several dead ends. Nothing was broken visually; little of it felt like a product someone pays for.

| Area | Score /10 | One-line verdict |
|---|---:|---|
| Visual identity | 3 | Generic dark + blue; system font; no logo; indistinguishable from a template |
| Consistency | 5 | Few components, so few inconsistencies — but class strings repeated by hand |
| Navigation | 3 | Two stacked nav bars in the app; marketing links shown to signed-in users; no active state |
| Dashboard | 5 | Correct numbers, flat hierarchy: 8 equal cards, 5 equal tables, nothing says "look here" |
| Trade entry | 5 | Complete but one long undifferentiated form; tag selections lost on a validation error |
| Journal | 3 | Table only; clips on mobile; notes can never be read; one-click permanent delete |
| Analytics | 4 | Lived inside the dashboard; no date range; mistake/emotion tags collected but never analysed |
| Subscription | 4 | Honest but bare; no usage shown; limit message is a dead-end error |
| Mobile | 4 | No horizontal page scroll, but nav wraps to two rows and the journal table is cut off |
| Accessibility | 5 | Labels present; no visible focus style; delete links tiny; chart has no values |
| Honesty / trust | 8 | The strongest part: unbuilt features labelled, sample-size warnings, no fake numbers |
| **Overall** | **4.5** | |

## Screen notes
**Landing.** Clear headline. No picture of the product anywhere, so a visitor cannot tell what they are signing up for. Says TradeNotes helps "test changes before you risk money" while backtesting does not exist (the feature card admits it; the hero sentence does not). Page title advertised "Backtesting".

**Pricing.** Truthful. But all three buttons are the same weight, "Starter/Pro" don't match the founder's tier names, and there is no comparison table or answer to "when am I charged / what if I cancel".

**Auth.** Functional, unstyled: a bare form floating under the marketing header. Error handling is good (no account enumeration).

**Onboarding.** One screen, sensible defaults, quick. Doesn't explain why it is asking.

**Dashboard.** The eight KPI cards carry equal weight and every card repeats a "Learn more" link. The equity curve has no axis values, so it shows shape without scale. The empty state is good and should be kept.

**Trade form.** All fields present and validation is thorough on the server. Problems: direction is a dropdown (the most important binary choice on the form); no feedback on what the stop/target mean in money or R until after saving; errors appear only under fields with no summary; market names are lowercase database values; emotion/mistake ticks are cleared when the server rejects the form.

**Journal.** At 390 px only four of eight columns are visible and P&L — the column people look for — is off-screen. There is no way to open a trade. "Delete" is a 12 px text link that deletes immediately.

**Billing.** Shows plan name and two links. Doesn't show price, usage against the limit, what happens on cancel, or what "activated by hand" means for someone who has just paid.

## What was worth preserving (and was)
- Every metric definition and the exclusion/small-sample notices, word for word.
- The labelled EXAMPLE on the empty dashboard.
- Plain-English hints with a switch to hide them.
- The honest "in development" language on pricing.
- All form field names and the server action contract.
