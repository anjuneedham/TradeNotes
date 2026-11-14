# QA results: Phase 3 (differentiation and growth), PR #7
Run 2026-11-13/14 on the final commit of `phase3-growth` (after the code-review fixes and the two gap resolutions described in "Follow-up: the two gaps" below). Everything ran locally (Postgres 16 with simulated Supabase roles, production `next build` + `next start`, screenshots through the in-memory store) plus GitHub CI. **Nothing was run against the real Supabase project, real storage, production, or a real phone.** The branch was cut from `main` @ fbb3be1 (the brief said 8af47d1 and "next migration 12"; main had moved to migration 15, so this is migration **16**).

## Automated results
| Check | Result | Evidence |
|---|---|---|
| Lint, `tsc --noEmit` | PASS | exit 0 |
| Unit + DB tests (`npm test` with a database) | PASS 334/334 | 33 files; includes 4 DB integration tests (founding, affiliate, SQL vs engine on 10,300 trades, new: shared screenshot quota). Was 277 + 3 skipped at baseline |
| `bash scripts/test-paste.sh` | PASS | 40 isolation checks; second run of every file succeeds |
| `npm run build` (migrate + verify-db + next build) | PASS | **25** tables; `verify-db` **102 passed, 0 failed** (was 72) |
| Browser e2e `scripts/e2e.js` | PASS **257/257** | 174 existing (re-run after the dashboard/analytics/trade-page refactors) + 83 Phase 3 checks |
| Money-path e2e `scripts/e2e-billing.js` | **42/43, same as `main`** | the one failure is the known founding price ($6 shown, $12 expected on a fresh DB). Not loosened, not caused by this PR |
| `scripts/viewport-check.js` | PASS 21/21 | no horizontal scroll on the checked pages (it does not cover the new pages; those are in the e2e at 390px) |
| GitHub CI | PASS | both jobs green on `d4f2a12` (first commit also green). The smoke test now also checks `/demo*` (200, SAMPLE DATA, noindex on trade pages), the sitemap, the manifest and `/r/<junk>` (404 + `X-Robots-Tag`) |
| Code review (high effort) | 10 findings, all fixed | CSV negatives were written as text (`'-125.5`, so spreadsheet totals ignored losses); exit trigger let a missing key through; 2,000-trade and 5-link caps could race; backtest list read long notes it never shows; one-trade strategy silently missing from the comparison chart; share report silently excluded other-currency accounts; BTCEUR was typed as forex; unauthenticated report recomputed history on every hit; two duplicated UUID patterns; quick-log made two DB calls |
| Security review (new tables, sharing, uploads) | no findings at confidence 8 or above | see the notes in the PR conversation: token entropy and hashing, the single SECURITY DEFINER lookup, aggregate-only DTO, interpolated SQL fragments come only from constants, RLS and path constraints on the new tables |

Tests were shown to be able to fail: I made the share-report builder leak trade ids on purpose and 3 tests failed; the first e2e run also caught real defects (see "Found during QA").

## Feature matrix (what was tested as whom)
| Feature | No data | Free | Standard | Premium | Result |
|---|---|---|---|---|---|
| Strategy comparison | B (Premium, no trades) sees "need at least two strategies", no table, none of A's numbers | upgrade notice, no table, no strategy names or numbers loaded | same | table values hand-checked (below), small-sample warning per strategy, curves + legend, filters apply to all (short-only), unknown names ignored, 390px | PASS. After a downgrade the page is gated again |
| Backtest log | empty state with the label | notice naming Premium; entry form not rendered | same | create at 390px, metrics hand-checked (below), label on list/new/detail/export, export first line + every row + file name, screenshot upload/view, delete | PASS |
| Backtest vs real stats | | | | real dashboard stays $1,190.00 over 4 trades; real analytics, journal, calendar and the real CSV contain no hypothetical trade | PASS |
| Backtest after a downgrade | | | | form open while the plan lapses: server refuses, nothing saved; entries stay readable, exportable, deletable; no add link; edit page has no form | PASS |
| Public demo | public, no account | | | 390px: no horizontal scroll, SAMPLE DATA on all three pages, pinned totals, read-only, unknown trade 404, linked from `/` and `/pricing`, in the sitemap | PASS |
| Share links | an owner with no trades gets an honest empty report | can create a link (all plans) | | create at 390px, hash-only storage, public view, revoke, expiry, 5-link cap shown | PASS |
| Quick-log | | at 49 trades: the stale-form 51st is refused by the server; the 50th shows Saved + upgrade notice; at 50 the page shows the notice | | iPhone UA at 390px: defaults from the last trade, six fields, every target >= 48px, one-tap save, same metrics as the full form | PASS (Standard user for the main flow) |
| Account deletion | | | | hypothetical trades, their screenshots and share links all gone; the deleted user's live link then 404s | PASS |

### Hand-calculated expectations (all asserted in e2e and unit tests)
- **Comparison** (seeded trades): London breakout +1,000.00 (risk 500, +2.00R) and -500.00 (no stop): 2 trades, win 50.0%, expectancy +250.00, profit factor 2.00, average R 2.00R, max drawdown 500.00, net +500.00. Range fade +590.00 (gross 600, fees 10): 1 trade, win 100.0%, no profit factor, no R, drawdown 0.00.
- **Backtests** (units as typed, no conversion): HYPO1 long 2 @100, stop 95, exit 110 = +20 (+2.00R); HYPO2 long 1 @50, stop 48, exit 49 = -1 (-0.50R); HYPO3 long 1 @10 to 10.5, fees 0.10 = +0.40. Closed in the order HYPO2, HYPO3, HYPO1: net +19.40, win 66.7%, profit factor 20.40, expectancy 6.47, average R 0.75R, max drawdown 1.00.
- **Quick-log** EURUSD short 2 lots 1.1000 to 1.0950, stop 1.1050: +1,000.00, risk 1,000.00, +1.00R; dashboard 1,190.00 + 1,000.00 = 2,190.00 over 5 trades.
- **Demo** (fixed seed): 190 trades, net +11,623.48, win 46.8%, profit factor 1.44, max drawdown 3,600.16. Trade 1 by hand: ES long 2 x 50, 5883.25 to 5878.70, fees 9 = -464.00, R = -464/475.

## Cross-user (user B vs user A), including guessing ids
- **Hypothetical trades**: B gets 404 on A's detail and edit pages, sees none in the list or the export, and gets 404 viewing, deleting or uploading to A's backtest screenshot (also for a Standard user). Database level: B cannot read, edit, delete or forge backtest trades or screenshots, or attach one to A's trade.
- **Share links**: B's Settings lists only B's links. B submitting A's link id to the revoke action (the form's hidden id swapped in the browser) changes nothing: A's link still opens and is still unrevoked in the database. At the database level B cannot list, revoke, relabel, delete or forge links; a revoked link cannot be revived; hash, scope and expiry cannot be changed.
- **Public report privacy**: with planted markers (a note, a named account, an email, instruments, strategies, a mistake tag, a screenshot, trade dates, a hypothetical trade) none appears in the page text or the raw HTML. The report type allows only aggregate fields (a unit test lists them exactly).
- **Quick-log**: trades land only in the logging user's account; B sees none of them.

## Performance (10,000 real trades + 2,000 hypothetical trades + a share link, local Postgres, warm median of 5)
| Page | Median | Body |
|---|---|---|
| Dashboard `/app` | 169 ms | 135 KB |
| Strategy comparison, 4 strategies | 146 ms | 104 KB |
| Backtests list (2,000 entries, 200 shown) | 88 ms | 434 KB |
| Backtest export (2,000 rows) | 31 ms | 435 KB |
| Quick-log page | 18 ms | 27 KB |
| Public share report (first hit 113 ms, then cached for 60 s) | 13 ms | 50 KB |
| `/demo` | 5 ms | 75 KB |
Target from the brief: under 1.5 s server time. Met by a wide margin locally. **Not measured:** real Supabase network latency, Vercel cold starts. Script: `scripts/perf-phase3.js`.

## Found during QA (and fixed)
1. After saving the last allowed trade, quick-log lost its "Saved" confirmation (the page swapped the form for the upgrade notice). Fixed: the confirmation stays and the notice is added.
2. The first run of the new e2e showed a stale test server (the old build was still serving after a rebuild): a test-harness problem, not an app bug.
3. Defaults from the last trade include the **side**: in the first run my own test logged a short by accident. That is the specified behaviour ("defaults from the last trade"), but it is worth knowing (KNOWN_ISSUES 30).

## Not built / not done (stated honestly)
1. **Bar replay**: not built, by instruction. It would need a paid market-data licence; the recommendation is in `docs/BACKTEST_REPLAY_LICENSING.md`. It was removed from the pricing and landing pages (it had been listed as "in development").
2. **Real devices and real Supabase were not tested.** The iPhone case is Playwright emulation (user agent, 390px, touch); the `beforeinstallprompt` Android path and a real "Add to Home Screen" were not exercised. Supabase Storage for backtest screenshots (path prefix `<user>/backtest/`, three-level account purge) is covered by the in-memory store and a fake-`fetch` unit test only.
4. **Shared quota** is tested at the SQL level against a real database (`screenshot-quota.db.test.ts`) and by reading the route, not by filling 2 GB through the browser.
5. **No accessibility audit** (keyboard operation and labelled controls were built in; screen-reader behaviour and contrast were not tested). The comparison chart has an accessible name, a legend with line styles and a table with the same numbers, but no keyboard-focusable data points.
6. **Comparison with 3 or 4 strategies** is unit-tested (selection, grouping, series styles) but the browser test used two strategies.
7. The public share page and `/demo` have **no rate limit** beyond the host's; the aggregation is cached for 60 s per owner and scope, and the link itself is checked on every request.
8. Share links cannot hide money amounts (profit and loss totals are shown). Anyone with the link sees them. Documented in Settings, on the page, in the privacy policy and in KNOWN_ISSUES 27.
9. Hypothetical results have no currency conversion and are not in the comparison or share links by design.
10. Quick-log sets entry and exit time to "now" (no time field), so hour and weekday analytics are wrong for a trade logged later until it is edited.

## Owner checklist from this phase
1. **Confirm the assumptions:** share links on **every plan** (flag `shareLinks` in `src/lib/plans.ts`); two backtest tables; share-link expiry choices 7/30/90 days and 5 active links.
2. **Legal:** the Privacy Policy gained a "Share links" bullet and backtest/hypothetical wording; the Disclaimer bullet changed tense (backtests now exist). Please have the lawyer see both (`docs/LEGAL_FILL_IN.md`, last section).
3. **Deploy note:** the next production build runs migration 16 on the production database (3 additive tables and 2 replaced functions, idempotent, tested twice locally and in CI, `verify-db` runs after it). Watch that first build.
4. After deploying: resubmit the sitemap in Search Console (it now lists `/demo` and `/demo/analytics`), and open one share link in a private window.
5. Still open from before: real payment and refund, screenshots bucket and env vars (`docs/OWNER_SETUP_STORAGE.md`), branch protection, the stale "switched on by hand" pricing FAQ, lawyer review of earlier additions.

## Follow-up: the two gaps from the first report, and how each was resolved
### Gap 2: share links showed profit and loss to anyone holding the link
**Resolution (done, in code): money amounts are now hidden by default and shown only if the owner opts in per link.**
- Why this design: a viewer who only needs to judge consistency does not need dollar amounts, so the safe behaviour should be the default and the exposure an explicit, informed choice. Hiding must happen **on the server**: if the page merely hid numbers, they would still be in the HTML and the data sent to the browser.
- How it works: `share_links.show_amounts` (default false, immutable after creation: to change it, create a new link). `buildReport` requires the choice (no default, so a caller cannot forget) and, when hidden, sets net P&L, expectancy, average win/loss and max drawdown to `null` and rescales the equity curve to the range -1..1 (shape only, no scale, no currency axis, no amounts in tooltips or the accessible name). Win rate, profit factor, average R, streaks and counts stay.
- Evidence: unit tests (hand-calculated rescale: cumulative 100, 60, 120 becomes 0.8333, 0.5, 1; every money field null; planted private strings absent in both modes; exact field list); `verify-db` (default resolves hidden, opted-in resolves shown, cannot be changed afterwards); e2e: the default link's page has no dollar amount, no Net P&L / Expectancy / Max drawdown text, no money keys or large cumulative values in the HTML/flight data, the stored column is false; a link created with the box ticked still shows amounts; after one link is created the box is OFF again for the next.
- Wording updated everywhere it was described: Settings panel, public page ("The owner chose to hide money amounts"), privacy policy, pricing/landing copy, `docs/LEGAL_FILL_IN.md`, KNOWN_ISSUES 27.
- A mistake of mine worth recording: my first diagnosis of a failing check ("the checkbox stays ticked") was wrong; the real cause was a race in my own test (it read the previous link's URL). The form now also resets after each created link as a defensive measure, with its own test.
- Remaining by design: with amounts ON, the viewer sees profit and loss totals (stated on the create form, the page and the privacy policy). Win rate and profit factor together can still hint at performance quality; that is the point of sharing them.

### Gap 1: nothing ran against real Supabase, production or a real phone
**Resolution: narrowed with real evidence where it is possible from here; the remainder is owner-only by your own rules, and is turned into a short checklist.**
- What I can and cannot do: changing Supabase settings or env vars, creating the bucket, and touching the production database are owner-only in the hard rules, and I have no physical phone. So the gap cannot be fully closed by me. What I could do was replace pretend tests with more real ones:
  1. **Storage adapter over real HTTP** (`src/lib/storage/supabase-http.test.ts`): the real `SupabaseStore` talks over a real socket to a local emulation of the Storage REST API. It checks that real-trade and backtest paths are stored, read and signed; that the service key goes in headers only and never in a URL; that account deletion removes the user's files three folders deep (`<user>/<trade>/..` and `<user>/backtest/<id>/..`) and none of another user's; that a wrong key is refused without leaking it; and that traversal or malformed paths are refused. **Proven able to fail:** making the purge stop one folder level short fails the test. Limit: the emulation encodes the documented Storage behaviour, so it is not the real service.
  2. **Installability checked by Chromium itself** (`scripts/check-installable.js`, run under `xvfb-run`): on the signed-in `/app/quick` and `/app`, real Chromium loads the manifest and reports **zero installability errors** (start URL `/app/quick`, standalone, 192, 512 and maskable icons). A control (a known-good static manifest) passes the same way, which shows the checker works in this environment. Two limits: Playwright's normal headless and incognito contexts never load manifests (so this cannot run inside the normal e2e; the e2e instead checks every icon's pixel size against its declaration), and a first load of the signed-out `/login` page reported `no-manifest` once in a fresh profile while `/pricing` and the signed-in pages loaded it; I did not chase that further because installation starts from the signed-in app.
- **What only you can do (cannot be done from here):**
  1. Create the private `trade-screenshots` bucket and the two Vercel env vars (`docs/OWNER_SETUP_STORAGE.md`). Until then screenshots, including on backtests, stay off in production.
  2. Merge, and watch the first production build (it runs migration 16; a failure stops the deploy before it goes live).
  3. On the live site with a Premium test account: add a backtest, attach a screenshot, view it, delete the account and confirm the file is gone; create a share link (once with amounts hidden, once shown) and open each in a private window.
  4. On a real phone: open `/app/quick` signed in, add to the home screen (iPhone Safari: Share, Add to Home Screen; Android Chrome: menu, Install app or Add to Home screen), and log one trade from the icon.
  If any step fails, send the symptom and it will be fixed on this branch or a follow-up.
