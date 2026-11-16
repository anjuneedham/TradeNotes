# Page brief template (marketing pages)

Use this as the prompt/brief when asking a model (or a person) to add a marketing page. Fill every input; do not skip the checklist.

## Inputs
- **Route:** `/…` under `src/app/(marketing)/`. Prefer adding a data entry to `src/lib/marketing.ts` (FEATURES, PLATFORMS, COMPETITORS, GUIDES) over a new file; the `[slug]` templates render it.
- **Audience:** prop-firm challenge traders and/or beginner retail traders.
- **One job:** the single thing the visitor should do next (almost always: start Free).
- **Facts source:** the code path(s) that prove each claim (e.g. `src/lib/plan-features.ts`, `src/lib/broker-import.ts`).
- **src value:** see naming below.
- **Next steps:** 3 existing routes that follow naturally.

## Honesty checklist (all must be yes)
- [ ] Every feature claim is true in code today (check `FEATURES_NOW` in `src/lib/plan-features.ts`, docs/HQ.md "Not available").
- [ ] Unbuilt items (auto-sync, replay/market data, reminder emails, news) appear only as "not available yet".
- [ ] Prices, trade limits, trial days and the founding offer are read from `src/lib/plans.ts` (`PLANS`, `TRIAL_DAYS`, `FOUNDING_OFFER`) via `OFFER` in `src/lib/marketing.ts`; no hard-coded numbers.
- [ ] No testimonials, user counts, results, income claims, or promise of passing a challenge.
- [ ] Disclaimer line kept ("does not provide financial advice and does not promise trading results"); `affiliated` set when a firm/broker/platform is named.
- [ ] Competitor facts: only what was read on the competitor's own page, with `checked` date and source link. Could not verify → leave it out.
- [ ] Import pages say formats were built from sample files and ask users to report problems.

## CTA rules
- Use `FunnelPage` (`src/components/Funnel.tsx`): it renders the top CTAs, the end-of-page `Cta`, `NextSteps` and the disclaimer.
- Primary: `/signup?src=<src>` "Start free, no card". Secondary: `/demo?src=<src>`. Lead capture: `/free?src=<src>` where relevant.
- No popups, timers, fake scarcity or pre-ticked boxes. No new heavy client libraries.

## ?src naming
lowercase, hyphenated, `<pagetype>-<slug>`: `prop-landing`, `feature-<slug>`, `import-<slug>`, `compare-<slug>`, `guide-<slug>`, `how-it-works`, `changelog`, `learn`, `home-bottom`, `nav`. Social/DM links keep the existing `tt-organic` style from docs/HQ.md.

## Verification
1. Add the path to `FUNNEL_PATHS` (automatic for data entries) so it lands in the sitemap.
2. `npx tsc --noEmit && npx eslint src && npx vitest run && npm run build`.
3. Check every internal link resolves to a built route (`.next/server/app/...`).
4. Read the page at 375px width: no horizontal scroll.
5. Add a docs/SESSIONS.md entry.
