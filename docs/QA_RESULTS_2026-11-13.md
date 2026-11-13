# QA results: Phase 1 (capture and evidence), PR #1
Run 2026-11-13 on commit after `777a3ff` (merged with `main` @ 1aee3cb). All runs are local (Postgres 16 with simulated Supabase roles) plus GitHub CI. **Screenshots were exercised with the in-memory storage fake; the Supabase adapter was tested against a faked `fetch` only. It has not touched a real Supabase bucket.**

## Automated results
| Check | Result | Evidence |
|---|---|---|
| Lint, `tsc --noEmit` | PASS | exit 0 |
| Unit tests | PASS | 171 passed, 2 skipped (the DB tests, run separately) |
| DB tests (founding, affiliate) | PASS | 2/2 against local Postgres and in CI |
| `scripts/test-paste.sh` | PASS | 40 isolation checks; second run of every file succeeds |
| `verify-db.mjs` | PASS | 53 passed, 0 failed (was 43; +10 cover screenshots, upload counters, time zone) |
| `next build` + smoke test | PASS | local and CI; all public routes 200 incl. new SEO routes |
| GitHub CI run 43339934841 | PASS | both jobs green. CI had failed on every `main` run I could inspect (runs 6 to 36) because `ci.yml` was invalid YAML; fixed in this PR |
| Browser e2e `scripts/e2e.js` | PASS 86/86 | 30 original + new Phase 1 flows (below) |
| Money-path e2e `scripts/e2e-billing.js` | 42/43, same as `main` | The one failure ("checkout $12/month") also fails on unmodified `main` with a fresh DB: the founding offer (10 seats, $6) is active, so the test sees $6. Not caused by this PR. Needs the test or seed fixed by whoever owns the founding offer |

## Feature matrix (what was tested as whom)
| Feature | No data / Free | Standard | Premium | Result |
|---|---|---|---|---|
| Broker import (auto-detect, preview, import, duplicate skip, roll back) | Free sees upgrade notice, no form | Tradovate CSV and MetaTrader HTML recognised; totals match broker figures; re-import skips all; dashboard net = sum of both files | (same code path) | PASS |
| Futures point value on imported trades | | ES +$1,025.00, CL -$500.00 shown correctly | MNQ hint "$2 per point" shown on the form | PASS |
| Time zone | | MT5 times read in Europe/Athens (unit-tested to the UTC instant) | Setting saved and persisted | PASS |
| Multiple accounts | Second account refused ("Free includes 1") | Second created; third refused; switcher; "All accounts" combined view | | PASS |
| Screenshots | Upload refused (plan) | Upload, view, delete; 5-per-trade cap; SVG renamed `.png` rejected; cross-site POST 403 | | PASS (fake store) |
| Delete account | | Screenshot rows and files gone | | PASS |
| Mobile 390px | | | accounts, import, new trade, trade detail: no horizontal scroll | PASS |

Not covered by a full-matrix run: Premium was tested for mobile layout and settings only, not every flow. Standard covered the feature flows.

## Cross-user (user B vs user A), by direct id guessing
- B cannot view, upload to, or delete A's screenshot: 404 on all three. Guessed all-zero id: 404. Signed-out request gets no image. Cross-site upload: 403.
- DB level (verify-db): B sees none of A's screenshots, cannot attach to A's trade, cannot delete/relabel them, cannot change A's time zone, cannot reset own upload counter, cannot use a path that embeds another user's id.
- Pre-existing checks (trades, edits, exports, deletion) all still pass.

## Reviews
- Code review (high): 10 findings, all fixed (WebP parser infinite loop, multiplier wiped on edit, account-currency change, fingerprint compatibility, rate/quota races, dead time-zone code, duplicate-key issues, cached session, cached storage total, manual-import futures warning).
- Security review: no findings at confidence 8 or above.
- During this QA run I also found and fixed a regression of mine: in-file duplicates were no longer counted as "skipped" on import, and the billing e2e used the old upload label.

## Known gaps and limits (honest list)
1. **Broker fixtures are synthetic**, built from each broker's documented column layout. None has been checked against a real export. Treat each preset as "implemented and unit-tested", not "verified with real files", until you import a real export per broker and compare with the broker's own report.
2. **Real Supabase Storage is untested.** Needs the bucket and env vars (docs/OWNER_SETUP_STORAGE.md). Until set, the app shows "not available yet" and pricing lists screenshots as in development.
3. **No 10,000-trade run yet** (Phase 2 performance task). The dashboard still loads up to 10,000 trades into memory.
4. Fees are one number per trade; commission/swap are not split.
5. Thinkorswim and Tradovate exports carry no commissions; the importer warns.
6. "All accounts" does not convert currencies; other-currency accounts are excluded and disclosed.
7. Accessibility was not audited beyond keyboard-reachable controls and labelled inputs; `scripts/viewport-check.js` was not run.
8. CSV export does not include screenshots (stated in Settings and the Privacy Policy).
