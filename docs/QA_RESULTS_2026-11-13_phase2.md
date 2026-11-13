# QA results: Phase 2 (analytics and review), PR #3
Run 2026-11-13 on the final commit of `claude/phase2-analytics-qa4aj3` (after the code-review fixes). Everything ran locally (Postgres 16 with simulated Supabase roles, production `next build` + `next start`) plus GitHub CI (both jobs green on the PR). **Nothing was run against the real Supabase project or production.** One infrastructure hiccup: the local Postgres server died during the first full run (stale pid, connection refused); it was restarted and the whole run repeated; the results below are from the repeat.

## Automated results
| Check | Result | Evidence |
|---|---|---|
| Lint, `tsc --noEmit` | PASS | exit 0 |
| Unit tests | PASS | 260 passed, 3 skipped (the DB tests, run separately) |
| DB tests (founding, affiliate, **SQL vs engine on 10,300 seeded trades**) | PASS 3/3 | local and CI |
| `bash scripts/test-paste.sh` | PASS | 40 isolation checks; second run of every file succeeds |
| `npm run build` (migrate + verify + next build) | PASS | 22 tables; `verify-db` 72 passed, 0 failed (was 53) |
| Browser e2e `scripts/e2e.js` | PASS 174/174 | was 86; +88 Phase 2 checks (two or more users, 390px) |
| Money-path e2e `scripts/e2e-billing.js` | 42/43, same as `main` | the one failure is the known founding price ($6 shown, $12 expected on a fresh DB). Not loosened, not caused by this PR |
| GitHub CI | PASS | both jobs green on the PR's latest commit |
| Code review (high effort) | 10 findings, all fixed | cap trigger blocking edits, uncaught playbook cap, stale checklist answers after a strategy change, duplicate dashboard query, equity-curve spacing, NOT VALID legacy rows, false "added" notices, unit rounding, duplicated profit-factor maths, false "updated" notice |
| Security review | no findings at confidence 8 or above | new tables, server actions, filter SQL, redirects, XSS surface |

Tests were shown to be able to fail: the SQL result was broken on purpose twice (fee conversion, status precedence) and `aggregate.db.test.ts` failed both times; the old review-cap trigger was restored and the new `verify-db` check failed.

## Performance (10,000 seeded trades, local Postgres, warm median of 5, full server response over localhost)
| Page | Before (Task 1 code) | After |
|---|---|---|
| Dashboard `/app` | 284 ms (1.35 MB body) | **209 ms** (134 KB) |
| Analytics (incl. all new analytics) | 1,274 ms | **387 ms** |
| Journal | 73 ms | 60 ms |
| Calendar (one month) | n/a | 48 ms |
| Reviews editor / Playbook | n/a | 26 ms / 30 ms |
| Dashboard `?range=30d` / Analytics with 2 filters | n/a | 51 ms / 81 ms |
Data layer alone: 134 ms for 10,300 trades; aggregation in `metrics.ts` 9 ms. Target was under 1.5 s: met with a wide margin. **Not measured:** real Supabase latency (each page issues 2 to 4 queries in parallel, so add network round-trips), Vercel cold starts. A single user with 100,000 trades takes about 1.2 s for one query; very large journals should use a date filter. Index findings are in `db/paste/12_analytics_indexes.sql` (an expression index is never usable under row-level security; only `trades_user_closed` was kept).

## Feature matrix (what was tested as whom)
| Page / feature | No data | Free | Standard | Premium | 10,000 trades | Result |
|---|---|---|---|---|---|---|
| Filter bar (dashboard, analytics, journal, calendar) | empty state, no welcome screen when filters match nothing | works | two filters change totals exactly; garbage and repeated params ignored | | 51 to 81 ms filtered | PASS |
| New analytics (PF, drawdown/recovery, R distribution, heatmap, time held, mistake cost) | empty states | visible (analytics are on every plan) | numbers checked against hand calculation | 390px: no horizontal scroll | 387 ms | PASS |
| Calendar | empty month | upgrade notice, no grid, no data loaded | month totals, day click-through to filtered journal, weekly totals, zone-aware | 390px: grid + weekly list, More tab | 48 ms | PASS |
| Reviews | empty history | upgrade notice; after a downgrade existing reviews readable, writing refused by the server (plan lapsed with the form open) | create, edit (one row per period), month review, delete, garbage dates 404 | 390px save and delete | 26 ms | PASS |
| Playbook | empty | upgrade notice, no forms; after a downgrade rules and answers readable | rules, ticking, per-rule follow rate, adherence analytics, retire/delete, 20-rule cap, duplicate strategy | 390px | 30 ms | PASS |
| Account deletion | | | | | | reviews, playbook items, checklist answers and trades all removed (checked in the database) |

## Cross-user (user B vs user A), including guessing ids
- B passing A's account id, strategy or symbol in any filter sees nothing; an account id that is not B's is ignored and never widened to "all".
- B cannot open A's trade (404), calendar, reviews or playbook data; B opening the same review week sees an empty form.
- Database level (`verify-db`): B cannot read, edit, delete, or forge (`user_id` = A) reviews, playbook items or checklist answers, cannot tick an item on A's trade or A's item on B's trade, cannot add an item to A's strategy; one row per period; Monday/1st rules; text caps; 2,000 reviews and 80 rules per strategy caps; editing at the cap still works.

## Not built (stated honestly)
1. **MAE/MFE**: not built (owner has not asked; no entry/exit extremes are captured).
2. **Reminder emails for reviews**: not built (no confirmed free scheduler).
3. A separate "daily journal" entry type: day reviews use the same template; there is no free-form daily diary or goals feature.
4. The checklist is ticked on the trade's page after logging; it is not shown inside the new-trade form.
5. CSV export contains trades only (reviews, playbook, screenshots are not in it; stated in Settings, privacy page, pricing).

## Known gaps and limits
1. **Playbook plan tier is an assumption** (Standard and Premium); the brief gives none. One flag in `PLANS`; tell the owner to confirm.
2. Real Supabase, production data, and the real HandyPay/Resend/Sentry paths were not exercised. Migrations 12 to 14 will run on the production database at the next build (`npm run build` runs migrate + verify): additive and idempotent, tested twice, but unproven on the real project.
3. Accessibility: colour-blind-safe cells (sign + glyph + size words) and keyboard-reachable controls were built in; **no full audit**, `scripts/viewport-check.js` not run, screen-reader behaviour not tested.
4. Strategies created from the trade form are not capped (the playbook page lists up to 500).
5. Equity curve is thinned to about 400 points for display only; all statistics use the full series.
6. Broker fixtures from Phase 1 are still synthetic; imports have not been checked against real exports.
7. "All accounts" still does not convert currencies (other-currency accounts are excluded and disclosed).
8. Review and weekday boundaries use the user's saved time zone; weeks run Monday to Sunday (no setting for Sunday-start).
