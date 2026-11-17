# Known Issues
1. Entry/exit times from `datetime-local` are stored as UTC; weekday stats use UTC. Needs per-user timezone (profiles.timezone) — P1.
2. ~~Journal delete has no confirmation dialog.~~ Fixed 2026-11-11 (two-step confirm).
3. Trade detail page exists (read-only, 2026-11-11). **No edit yet**: wrong trades must be deleted and re-entered (docs/design/OPUS_FABLE_HANDOFF.md H-2).
4. ~~Screenshots, daily/weekly reviews, calendar view not built.~~ Screenshots shipped in Phase 1 (need owner storage setup); calendar and reviews are Phase 2 (see docs/BUILD_LOG.md).
5. Fees is a single number in the trade's quote currency (commission + swap combined); converted with the same FX rate as P&L when the quote currency differs from the account currency.
6. Forex lots assume standard 100,000 units; mini/micro lots must be entered as 0.1/0.01.
7. Rate limiting exists only on auth endpoints (Better Auth, DB-backed: 30 requests/60s). App actions (trade creation etc.) are not rate limited.
8. No error monitoring (Sentry) yet.
9. ~~Legal pages are drafts, unreviewed.~~ Per the owner (2026-11-13) a lawyer has reviewed them; `counselReviewed` is true in `legal.ts` but the site deliberately makes no review claim (owner's choice, same day). Confirm the lawyer saw the 2026-11-13 additions (reviews, playbook, reminder emails in the Privacy Policy).
10. ~~Dashboard fetches all trades (≤10,000) per load.~~ Fixed in Phase 2: filtering, joins and the per-trade result run in SQL (no row cap); aggregates stay in `metrics.ts`. Measured on local Postgres with 10,000 seeded trades: dashboard 214 ms, analytics 272 ms (median, full server response). Not measured: real Supabase network latency. Memory still grows linearly with the number of trades in the selected filter (about 1.2 s and 100,000 rows for a single query at 100k trades), so very large journals should use a date filter.
11. ~~Billing is manual~~ Automated via HandyPay API + webhooks (2026-11-11), **pending one real test-mode run**; manual fallback remains when keys are absent. Previously: plan activation by owner SQL after confirming payment (DEPLOYMENT.md). No webhook, no automatic renewal/cancel, no founding coupon, no annual link.
12. **Email is not configured**: until `RESEND_API_KEY` is set, email confirmation is OFF (anyone can register any address) and password reset is unavailable (UI says so). Because payments are matched by email, set up email BEFORE taking payment.
13. `.npmrc` uses legacy-peer-deps (optional peer conflict, see DECISIONS).
14. Not yet reviewed: Better Auth cookie/CSRF settings behind a custom domain; Neon pooled-connection behaviour under load.
15. `next build` with `BETTER_AUTH_SECRET` unset logs a Better Auth "default secret" error during static generation but exits 0. With the env var set the build is clean. In production, auth refuses to run without the secret (fails closed) — set it BEFORE the first deploy.
16. **Supabase TLS is encrypted but not certificate-verified** unless `DATABASE_SSL_CA` is set (Supabase's pooler uses a private CA). Set the CA PEM to close this.
17. ~~TradeNotes shares a Supabase project with Agriloop.~~ Per the owner (2026-11-13) TradeNotes now has its own database. DEPLOYMENT.md and older docs may still describe the shared project; verify and update them.
18. Attribution cookie `tn_src` is first-party, `httpOnly`, 30 days; the privacy policy doesn't mention it yet — add before launch.
19. ~~DRAFT banner until counsel reviews them.~~ Removed; pages are live with no review claim (2026-11-13).
20. Vercel blocks deployments of known-vulnerable Next.js versions (happened on 15.5.4). Keep `next` current within 15.5.x and re-check `npm audit --omit=dev`; two `sharp` advisories remain (image optimisation only; we don't use next/image).
21. Vercel Deployment Protection is on for `*.vercel.app`; preview/branch URLs need a Vercel login. Custom domains are public.
22. If the email provider rejects a send (unverified domain, bad key), signup still says "Check your email" and nothing is sent; only a Vercel log line records it. Mitigated by on-page guidance; no alerting yet (see email/RESEND_SETUP.md).
23. Earlier status reports that said "lint clean" were based on the last line of output and were unreliable once `scripts/e2e*.js` existed. Fixed 2026-11-10: `scripts/**` excluded from app lint; verify with the exit code (`npm run lint; echo $?`).
24. Legal pages still contain unfilled required values until `src/lib/legal.ts` is completed (they display a warning). Not yet reviewed by counsel.
25. **Futures trades cannot be saved**: the form sends `futures`, the `trades.asset_class` check allows `future`. Found 2026-11-11; see docs/design/OPUS_FABLE_HANDOFF.md H-1.
26. Frontend redesign 2026-11-11: open items and backend dependencies are tracked in `docs/design/OPUS_FABLE_HANDOFF.md`; honest scores in `docs/design/FRONTEND_COMPLETION_REPORT.md`.

25. 2026-11-11: past-due subscriptions keep access until period end + 3 days (GRACE_DAYS); stated in Terms and Subscription policy.
26. 2026-11-11: HandyPay webhook object field names are assumed Stripe-style; raw payloads are stored in `billing_events.payload` — check the first real delivery.

27. 2026-11-13 (Phase 3): share links show **no money amounts by default** (ratios, counts and the shape of the curve); the owner can opt in per link ("Show money amounts", fixed at creation). With amounts on, anyone holding the link sees profit and loss totals (no names, notes, instruments or dates). Expiry 7/30/90 days, revocable, no per-link view count (deliberately: no tracking of viewers). Share links are on every plan by assumption; one flag in `PLANS` changes that.
28. 2026-11-13 (Phase 3): the public share page and `/demo` are not rate limited beyond the host's defaults. Tokens are 256 bits so guessing is not a realistic attack, but a flood of requests for unknown tokens costs one cheap indexed query each.
29. 2026-11-13 (Phase 3): hypothetical (backtest) amounts are **not currency-converted** and have no account: price x size x multiplier as typed, labelled with the first account's currency. Backtests are not in the comparison page or share links by design.
30. 2026-11-13 (Phase 3): quick-log sets entry and exit time to "now" (the form has no time field). A trade logged later in the day has the wrong time until edited; this feeds the hour/weekday analytics. Side and size default to the last trade, so check the side before saving.
31. 2026-11-13 (Phase 3): home-screen install is a shortcut only (no service worker): it needs a network connection and does not log trades offline.
32. Pricing FAQ "How does upgrading work?" still says plans are switched on by hand (stale since automatic billing; also noted in docs/SEO.md). Not changed in Phase 3.
