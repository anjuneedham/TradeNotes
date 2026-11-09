# Known Issues
1. Entry/exit times from `datetime-local` are stored as UTC; weekday stats use UTC. Needs per-user timezone (profiles.timezone) — P1.
2. Journal delete has no confirmation dialog.
3. No trade detail / edit page yet (JRNL-2). Wrong trades must be deleted and re-entered.
4. Screenshots, daily/weekly reviews, calendar view not built.
5. Fees is a single number in the trade's quote currency (commission + swap combined); converted with the same FX rate as P&L when the quote currency differs from the account currency.
6. Forex lots assume standard 100,000 units; mini/micro lots must be entered as 0.1/0.01.
7. No rate limiting beyond Supabase Auth's built-ins.
8. No error monitoring (Sentry) yet.
9. Legal pages are drafts, unreviewed.
10. Dashboard fetches all trades (≤10,000) per load; fine for launch, needs SQL aggregation later.
11. Billing is manual: plan activation by owner SQL after confirming payment (DEPLOYMENT.md). No webhook, no automatic renewal/cancel, no founding coupon, no annual link.
12. **Email is not configured**: until `RESEND_API_KEY` is set, email confirmation is OFF (anyone can register any address) and password reset is unavailable (UI says so). Because payments are matched by email, set up email BEFORE taking payment.
13. `.npmrc` uses legacy-peer-deps (optional peer conflict, see DECISIONS).
14. Not yet reviewed: Better Auth cookie/CSRF settings behind a custom domain; Neon pooled-connection behaviour under load.
