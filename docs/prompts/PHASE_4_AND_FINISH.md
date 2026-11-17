# Phase 4 (memos only) and the final re-score
Read COMMON_RULES.md first. Start only after Phase 3 is merged. Branch `phase4-memos`. **Do not build any Phase 4 item.** No code except docs.

## Tasks
1. **Memo: broker auto-sync via an aggregator** (for example SnapTrade). One page in `docs/decisions/MEMO_BROKER_SYNC.md`: what it would give users, which brokers, pricing (look it up and cite the page and date; mark anything not found as unverified), data and privacy impact (credentials never stored; consent; new processor; privacy policy changes), legal and terms impact, build effort, and a go/no-go with the conditions that would change it.
2. **Memo: AI weekly summaries** (Claude API). `docs/decisions/MEMO_AI_SUMMARIES.md`: cost per user per week with stated assumptions (tokens in and out; use current Claude pricing from the claude-api skill or the official page and cite it), privacy (what trade data is sent, retention, opt-in), risk of the summaries reading like advice, prompt-injection from user notes, rate limits and a monthly spend cap design, go/no-go.
3. **Memo: bar replay and data licensing.** `docs/decisions/MEMO_REPLAY_DATA.md`. Start from the table in `docs/ARCHITECTURE.md` (Massive, Tiingo, OANDA, others), re-check each vendor's current commercial-display terms, state what is confirmed and what needs a sales answer, include the "bring your own CSV candles" option and the question to send each vendor. One-page recommendation with a monthly cost range.
4. **Final re-score** (spec: `docs/NEXT_BUILD_BRIEF.md` section 2 and 6). Re-score the six-area scorecard row by row **with evidence** (file, test, QA line), update `docs/READINESS_REVIEW.md` with the new overall, industry-specific and app-type ratings, and list every row that missed target and why. Note that the brief's own table sums to 4.05 at the start, not the 4.6 it states; use the table. Two ratings: what is live on tradenotes.dev, and what is in `main`.
5. **Owner checklist** at the end of `READINESS_REVIEW.md`: decisions needed, env vars, deployments, legal text to review, Supabase Free-tier risks (no backups, pausing), real payment plus refund test, Production Branch, lawyer review, data-controller registration.
6. Open the PR and follow "After the phase" (no security review needed unless code changed).

## Done means
Three memos with cited, dated sources; honest scorecard; owner checklist; CI green; nothing built.
