# Decision memo: AI weekly summaries with the Claude API
Written 2026-11-14 for the owner. **Nothing was built; no API account or key was created.** Prices below come from Anthropic's own pricing page, fetched 2026-11-14 (https://platform.claude.com/docs/en/about-claude/pricing; the page shows no date, so "current" means current on that day). Disclosure: this memo was written by a Claude model, which has an interest in the answer; weigh it accordingly.

## Recommendation (short)
**Conditional GO as a small, opt-in, Premium-only pilot, after the owner approves a spend cap and the lawyer approves the wording. NO-GO as a default-on feature.** Cost per user is tiny; the real risks are (1) the text reading like investment advice, (2) a new US processor receiving trading notes, and (3) prompt injection through notes. All three are manageable with the design below but need owner decisions first.

## Cost per user per week
### Cited prices (USD per million tokens, standard, 2026-11-14)
| Model | Input | Output | Batch (50% off) input / output |
|---|---|---|---|
| Claude Haiku 5.5 (prompt up to 100,000 tokens) | $0.10 | $0.50 | $0.05 / $0.25 |
| Claude Sonnet 5.5 | $2 | $10 | $1 / $5 |
| Claude Opus 5.5 | $4 | $20 | $2 / $10 |
Other facts from the same page: US-only inference adds a 1.1x multiplier; "Claude 4.7 and later models ... use a newer tokenizer ... approximately 30% more tokens for the same text" (I apply +30% to my token estimates below); cache reads are cheaper but not needed here (one call per user per week). I did not verify the usage-tier and rate-limit rules (UNVERIFIED).

### Assumptions (mine; not measured)
- One call per opted-in user per week. Input = a fixed instruction (about 600 tokens) + the week's statistics and up to 40 trade lines (symbol, side, result, R, tags, strategy) about 3,000 tokens + optionally the user's notes. Output about 600 tokens.
- Light case: 3,600 input, 600 output. Heavy case (user opts to include free-text notes, 40 trades with 250-word notes): about 15,000 input, 800 output. Both multiplied by 1.3 for the tokenizer.
### Result (arithmetic shown)
| Case / model | Tokens (after +30%) | Per summary | Per month (4.33 weeks) |
|---|---|---|---|
| Light, Haiku 5.5 | 4,680 in, 780 out | 4,680 x 0.10/1e6 + 780 x 0.50/1e6 = $0.00047 + $0.00039 = **$0.00086** | $0.0037 |
| Light, Sonnet 5.5 | same | 4,680 x 2/1e6 + 780 x 10/1e6 = $0.00936 + $0.0078 = **$0.0172** | $0.074 |
| Heavy, Haiku 5.5 | 19,500 in, 1,040 out | $0.00195 + $0.00052 = **$0.0025** | $0.011 |
| Heavy, Sonnet 5.5 | same | $0.039 + $0.0104 = **$0.0494** | $0.214 |
Add 10% for US-only inference if required. Even the heavy Sonnet case is about 0.9% of a $24 Premium month; the Haiku case is a rounding error. **Cost per user is not the risk. Runaway volume or a bug (a retry loop, a bot signing up) is**, hence the cap below. Quality on a short, structured summary is the unknown: I did not test Haiku versus Sonnet on real journals. Pilot both on synthetic and the owner's own data before choosing.

## What data would be sent
Default (recommended): **aggregates and structured fields only**: period dates, trade count, win rate, profit factor, expectancy, drawdown, R distribution, results by strategy, session, weekday, mistake tag; list of rule-break tags. No names, email, account names, instruments only if the user keeps "include symbols" on.
Opt-in second switch: **free-text notes and review text.** These can contain anything a person types (names, health, money problems). Off by default, separately explained.
Never sent: email, user id (use a random per-call reference), screenshots, payment data, IP.

## Opt-in, retention, processor
- **Opt-in:** off by default; a clear switch in Settings with a plain-English list of what is sent, to whom (Anthropic, United States), and that the user can turn it off at any time. Premium-only for the pilot (keeps volume and risk small).
- **Retention at TradeNotes:** store the generated summary in the user's own row (it is their data, deletable, covered by account deletion and export). Do not store the prompt. This needs a new table or a column on `reviews`; either needs RLS and isolation checks (not built).
- **Retention at Anthropic: UNVERIFIED.** I did not read Anthropic's commercial terms or privacy centre for API data retention, training use, and the data processing addendum. The owner (or the lawyer) must read them and record the answer before launch; do not claim "not stored" or "not used for training" on the site until confirmed in writing.
- **New processor:** Anthropic joins the Privacy Policy list (src/app/(marketing)/legal/privacy) and docs/LEGAL_FILL_IN.md, with the country (US) and the purpose. Cross-border transfer point for the Jamaican controller: ask the lawyer.

## Risk: reading like advice
TradeNotes' position is "not financial advice, no performance promises" (landing page, Disclaimer). An AI paragraph saying "you should cut your position size" or "your EURUSD longs are your edge" crosses that line in tone even if the disclaimer sits nearby. Mitigations (design requirements, not guarantees):
1. System prompt limits output to **describing the user's own past data and their own stated rules** ("you broke your rule X in 4 of 9 trades"); forbids forecasts, recommendations to buy, sell, size or leverage, and market commentary.
2. Fixed output template (what happened, what repeated, one question to review), no free-form advice section.
3. A post-check in code rejects output containing banned patterns (should/must + buy/sell/enter/exit/risk more, price targets, guarantees) and falls back to a statistics-only summary. Pattern lists are imperfect; keep a human-readable log of rejections.
4. Permanent label on every summary: "Automatically generated description of your own entries. Not advice. May be wrong." Link to the Disclaimer.
5. No numbers computed by the model: **all figures are computed by our code and inserted; the model only writes around them** (prevents invented statistics). Validate that every number in the text appears in the supplied data.
6. Lawyer reviews the template and label before launch.

## Risk: prompt injection from user notes
Notes are untrusted text. A user (or text pasted into a note from a web page) could write "ignore previous instructions and ...". Impact is limited because the model has **no tools, no database access and no network**, and the output is shown only to the same user. Still:
- Send notes only inside clearly delimited data blocks, with the instruction that they are quotations to describe, never instructions.
- Never give the call any tool or any other user's data; one user per call; no shared context between users.
- Output is rendered as plain text (no HTML, no links, no images) to avoid exfiltration via markdown images.
- Run the banned-pattern check above on output; log, not store, rejected attempts.
- Test with an injection suite (notes that try to reveal the prompt, produce advice, mention other users, output links) before launch.
Share links and public pages must never include summaries (they would contain private text).

## Monthly spend cap design
1. **Hard cap in code:** a table (or counter) of month-to-date estimated cents per month, checked and incremented **before** each call using the worst-case price for the chosen model and max_tokens; refuse (and show "summaries paused") once the cap is reached. Atomic increment in one SQL statement so concurrent calls cannot overshoot. Suggested default cap: $10 per month for the pilot; the owner sets it.
2. **Per-user limit:** 1 summary per user per ISO week (unique key user + week); manual regenerate off or limited to 1 per day.
3. **Input and output ceilings:** max trades per call, max note characters, `max_tokens` fixed; reject oversize input instead of truncating silently.
4. **Kill switch:** an environment flag read on every call (owner-controlled in Vercel).
5. **Provider-side cap:** set a spend limit on the Anthropic organisation/workspace if the console offers one. I could not confirm this from the pricing page (UNVERIFIED); the owner should check. Treat the provider-side limit as a second layer, never the only one.
6. **Alerting:** log a warning at 80% of the cap (same rule as the Resend cap in the brief); show usage to the owner in the checklist.
7. **Billing is a new account with a payment card: a new paid vendor.** Not allowed without the owner's written approval.

## Effort (estimate)
Prompt, template and validators 2 to 3 days; opt-in settings, storage, cap, tests (injection suite, advice-pattern tests, two-user isolation, cap race test) 3 to 4 days; privacy/terms/pricing copy and a plan-flag update 1 day. About 1.5 to 2 weeks, plus ongoing prompt tuning.

## Go / no-go
**Conditional GO (pilot).** Conditions: owner approves a new Anthropic account and the cap in writing; Anthropic's retention and training terms are read and recorded; lawyer approves the label, template and Privacy Policy text; the injection and advice-pattern tests exist and pass; start Premium-only, aggregates-only, notes switch off. **NO-GO** if the owner will not accept a new US processor or cannot confirm retention terms. Not a reason to prioritise it over verifying real broker imports and the payment test, which block revenue.
