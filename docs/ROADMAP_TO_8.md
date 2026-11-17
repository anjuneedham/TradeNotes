# From 6.5 to 8.0 (industry-specific score)
Written 2026-11-14 from `docs/READINESS_REVIEW.md` (main, ad0d9b3). The 6.5 is the weighted total of the brief's own scorecard (`docs/NEXT_BUILD_BRIEF.md` section 2); the target is **8.1 weighted**. These scores are an internal rubric (AI judgement), not market validation. Signups and payments are the real test.

## The arithmetic
Weighted total = Σ weight × score. Today 6.48. Needed gain: **+1.62**, with only ~0.1 of slack, so **every row has to reach its target**.
| Row (weight) | Now | Target | Weighted gain | What closes it | Owner |
|---|---|---|---|---|---|
| Data capture and import (25%) | 6 | 8 | **+0.50** | Verify imports against **real** broker exports (2–3 of yours, anonymised) and fix parsers; import validation report; split fees into commission / swap | You supply files; Claude fixes and tests |
| Visual evidence (10%) | 4 | 8 | **+0.40** | Bucket exists per the build log, and production has the Supabase URL and service key set. Run one real upload end to end on production; add annotated notes; flip the "in development" label on the pricing page only after that works | You test once; Claude adds notes + copy |
| Review and journaling workflow (20%) | 6 | 8 | **+0.40** | Reminder emails (code exists, e2e unfinished; production lacks `CRON_SECRET`); goals; free-form daily journal; playbook checklist inside the new-trade form | Claude builds; you set `CRON_SECRET` + GitHub secrets |
| Analytics depth (25%) | 7.5 | 8 | +0.125 | MAE/MFE (optional manual high/low fields on a trade) and saved views | Claude |
| Multiple accounts (10%) | 7 | 8 | +0.10 | Currency conversion in the combined view (needs a documented FX rate source and disclosure) | Claude; you approve the rate source |
| Trust, speed, mobile (10%) | 8 | 9 | +0.10 | Accessibility pass, real-phone install test, page timing on real Supabase | You test on a phone; Claude fixes |
**Sum of gains = +1.625 → 8.1.**

## Order (weight × ease, and what helps revenue before 31 Dec)
1. **Real broker exports (capture, +0.50).** Biggest weight and the biggest credibility risk: today every import fixture is synthetic. A failed first import kills activation, so this also protects the Dec conversion funnel. *Start now: export your own broker history, anonymise it, and send it.*
2. **Screenshots end to end (+0.40).** Mostly your setup; Claude adds notes. Quick win.
3. **Reminder emails + goals + daily journal + checklist (+0.40).** Retention engine; ties into `EMAIL_LIFECYCLE_PLAN.md`.
4. **Analytics (MAE/MFE, saved views), accounts conversion, accessibility/mobile (+0.33 together).** Smaller, mostly Claude.
Rough effort (estimate): 4–6 build sessions of focused work. The score can't reach 8.0 without every row, so don't expect it before late December unless imports and screenshots are done in the first two weeks.

## Honest note on priorities
Hitting 8.0 does not by itself bring subscribers. The items that move the 100-member goal fastest are **import reliability, screenshots, reminders and the lifecycle emails**, because they raise activation and retention. MAE/MFE, currency conversion and saved views can wait if the goal is revenue by 31 Dec.
