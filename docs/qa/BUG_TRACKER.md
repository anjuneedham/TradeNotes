# Bug tracker
| ID | Bug | Severity | Found by | Status |
|---|---|---|---|---|
| B-1 | Futures trades cannot be saved (`futures` vs DB `future`) | High | Fable (H-1), reproduced | **Fixed + e2e** |
| B-2 | Onboarding "Futures" didn't pre-select futures in trade form (same mismatch) | Low | Opus | **Fixed** |
| B-3 | Past-due users lost access immediately, contradicting billing copy | Medium | Opus | **Fixed** (3-day grace) + tests |
| B-4 | Cancellation email suppressed when cancel was initiated in-app (flag set before webhook) | Medium | e2e-billing | **Fixed** (app sends it) |
| B-5 | Checkout redirect rejected http URL from local fake | Test-only | e2e-billing | Fixed with test-hook-only exception |
| B-6 | Terms said export/delete only "ask us" after self-service existed | Low (accuracy) | Opus | **Fixed** |
| B-7 | Privacy said "we may keep payment records" but deletion cascades them | Low (accuracy) | Opus | **Fixed** (HandyPay keeps them) |
| B-8 | Six FKs without indexes (RLS filters / cascades) | Low | Opus | **Fixed** (08_fk_indexes) |
| B-9 | Next's bundled PostCSS advisories | Moderate | npm audit | **Fixed** (override) |
| B-10 | Dashboard query slow (1.7 s/10k) right after bulk insert | Low | Opus | Not a bug — stale stats; note for CSV import |
| B-11 | Email provider rejection is silent to the user | Medium | Known issue 22 | Open (alerting) |
| B-12 | Times stored/shown in UTC | Low | Known | Open |
| B-13 | Founding-member offer has no mechanism | Medium (trust) | Fable H-17 | Open — founder decision |
| T-1 | e2e forged-create test didn't actually send forged value (React reset it) | Test bug | Opus | Fixed — DB check showed no leak |
