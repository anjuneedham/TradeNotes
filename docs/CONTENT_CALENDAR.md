# SEO content calendar: 3 articles a week (Mon / Wed / Fri)

**Goal:** first paying subscriber from organic search + email. Measure: Search Console impressions/clicks per article, `tradenotes.leads` rows by `source`, signups with `signup_source` starting `article-`.

**Audience:** beginner to intermediate forex and futures traders, especially people doing or considering **prop firm challenges** (the fastest-growing journaling audience, and the one that searches most for rules, risk and R).

## How each article is built (the scheduled session follows this)
- One page at `src/app/(marketing)/learn/<slug>/page.tsx`, same pattern as `r-multiple-prop-firm-challenge`: H1 that includes the main keyword, worked examples with real numbers, a free tool or table where possible, `LeadForm`, FAQ with FAQPage JSON-LD, Article JSON-LD, "not financial advice" footer.
- Add the slug to `PUBLIC_PATHS` (`src/lib/seo.ts`), the sitemap priority, the Guides box on `/learn`, and the CI smoke list in `.github/workflows/ci.yml`.
- Link to 2+ earlier articles and from 1+ earlier article to the new one (internal links help ranking).
- Honest: no profit promises, no fake stats. Prop firm rules: say "typical" and "check your firm's current rules".
- 1,200–2,000 words. Quality over volume: a thin article hurts more than a missing one.
- Signup links use `?src=article-<short-slug>`.
- Open a PR for the owner to review and merge. Never merge without the owner.

## Queue (top = next). Mark `DONE <date> PR#` when published.
| # | Slug | Main keyword / angle | Free tool or asset |
|---|---|---|---|
| 1 | r-multiple-prop-firm-challenge | what is r multiple / r multiple calculator / prop firm challenge risk | R + challenge calculator. **DONE 2026-11-15** |
| 2 | trading-expectancy-formula | expectancy formula trading / is my strategy profitable | expectancy calculator (win rate, avg win R, avg loss R) **DONE 2026-11-16** |
| 3 | prop-firm-daily-drawdown-rules | prop firm daily drawdown explained / trailing vs static drawdown | drawdown buffer calculator |
| 4 | trading-journal-template | trading journal template excel / google sheets | links the /free template (main lead magnet page) |
| 5 | profit-factor-explained | profit factor trading / good profit factor | profit factor calculator |
| 6 | how-to-pass-prop-firm-challenge | how to pass a prop firm challenge (risk plan, not hype) | challenge risk planner (reuses calculator) |
| 7 | position-size-calculator-forex | position size calculator forex / lot size | lot size calculator |
| 8 | revenge-trading | revenge trading / how to stop revenge trading | "tilt rules" checklist |
| 9 | win-rate-vs-risk-reward | win rate vs risk reward / break-even win rate | break-even win rate table |
| 10 | how-to-review-trades | how to review your trades / weekly trading review | links the 30-trade checklist |
| 11 | futures-trading-journal | futures trading journal (NQ, ES) / tick value | tick value table |
| 12 | trading-journal-vs-spreadsheet | trading journal app vs spreadsheet (honest comparison) | none |
| 13 | max-drawdown-explained | max drawdown trading / recovery math | recovery-needed table |
| 14 | trading-plan-template | trading plan template | free template (new lead magnet) |
| 15 | forex-trading-sessions-times | best forex session to trade (by data, not opinion) | session times table |

Re-check this queue every 4 weeks against Search Console queries: write what people already find you for.
