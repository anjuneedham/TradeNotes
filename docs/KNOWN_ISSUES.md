# Known Issues
1. Entry/exit times from `datetime-local` are stored as UTC; weekday stats use UTC. Needs per-user timezone (profiles.timezone) — P1.
2. Journal delete has no confirmation dialog.
3. No trade detail / edit page yet (JRNL-2). Wrong trades must be deleted and re-entered.
4. Screenshots, daily/weekly reviews, calendar view not built.
5. Fees field is a single number (commission + swap combined, quote-currency units converted by the user's FX rate only when quote ≠ account currency… fees are converted with the same rate).
6. Forex lots assume standard 100,000 units; mini/micro lots must be entered as 0.1/0.01.
7. No rate limiting beyond Supabase Auth's built-ins.
8. No error monitoring (Sentry) yet.
9. Legal pages are drafts, unreviewed.
10. Dashboard fetches all trades (≤10,000) per load; fine for launch, needs SQL aggregation later.
