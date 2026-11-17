# Multi-account tests — actual results
Run 2026-11-11 against a local production build (`next build && next start`) + PostgreSQL 16 with the production migration path (`db/paste`). Accounts are created fresh each run (`a…@e2e.test`, `b…@e2e.test`, `bill-a/b…@example.test`).

## Required checks
| Requirement | Test | Layer | Result |
|---|---|---|---|
| A cannot access B's trades | B journal empty; B dashboard has none of A's numbers | e2e (browser) | PASS |
| Changing record IDs does not expose data | B opens A's `/app/journal/<A id>` → **404**; `/edit` → **404** | e2e | PASS |
| A cannot edit B's records | B submits the edit form with A's trade id injected → "Trade not found."; A's trade still `$593.00`, no `HACKED` rows | e2e | PASS |
| A cannot create into B's account | B submits create form with A's account id injected → "Account not found." | e2e | PASS |
| DB: cross-owner rows | `select count(*) from trades t join accounts a … where t.user_id <> a.user_id` → **0** | SQL | PASS |
| A cannot delete B's records | `delete from trades` as B → 0 rows | verify-db | PASS |
| Notes / attachments | Notes live on `trades` (same RLS). Attachments: `trade_screenshots` has RLS + ownership trigger; **no upload feature exists yet** | verify-db | PASS (schema) / N/A (feature) |
| Subscription information | B sees only own subscription row; cannot update it (0 rows), cannot insert a paid row | verify-db | PASS |
| Payment history | B cannot see A's payment; A sees own; B cannot insert payments; B cannot read billing events | verify-db | PASS |
| Billing UI | B's billing shows Free, no payment history, no Cancel button; B triggers no HandyPay calls | e2e-billing | PASS |
| API bypass of frontend | Export endpoint returns only own rows; anonymous → 401/redirect; webhook rejects unsigned/forged | e2e, e2e-billing | PASS |
| Account deletion scope | B deletes own account; 0 orphan rows; A unaffected (A logs in afterwards, data intact) | e2e | PASS |

## Suites and totals (this session)
| Suite | Result |
|---|---|
| `node scripts/verify-db.mjs` | **42/42** |
| `npm run test:db` (fresh DB, simulated Supabase roles) | OK |
| `bash scripts/test-paste.sh` | 40 PASS + idempotent re-run OK |
| `node scripts/e2e.js` | **53/53** |
| `node scripts/e2e-billing.js` | **37/37** |
| `node scripts/e2e-email.js` | **15/15** |

## Note on one test I had to fix
The first forged-create test "failed" because React reset the injected value before submit, so A's id was never sent and the trade landed in **B's own** account (checked in SQL — not a leak). The test now replaces the input element so the forged value is genuinely submitted; it then correctly gets "Account not found."

## Not yet run in production
These tests ran locally. `verify-db` (incl. the two-user isolation test) runs on every Vercel build against the production database. The browser suites have not been run against the live domain (it isn't attached yet).
