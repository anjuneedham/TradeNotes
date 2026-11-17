# Prompts for the remaining work (Phase 2 to the end, and video production)
Written 2026-11-13, after Phase 1 shipped (PR #1, #2; live on tradenotes.dev; `main` @ 8af47d1).

## How to use
1. Start a **new** session on the `anjuneedham/TradeNotes` repo, model **Opus**, effort **low** (set in the session settings; a prompt cannot set it).
2. Paste the single line for the job:
   - Phase 2: `Do docs/prompts/PHASE_2.md. Read docs/prompts/COMMON_RULES.md first.`
   - Phase 3: `Do docs/prompts/PHASE_3.md. Read docs/prompts/COMMON_RULES.md first.` (only after Phase 2 is merged)
   - Phase 4 and finish: `Do docs/prompts/PHASE_4_AND_FINISH.md. Read docs/prompts/COMMON_RULES.md first.` (only after Phase 3 is merged)
   - Videos: `Do docs/prompts/VIDEO_PRODUCTION.md.`
3. One phase per session. Merge and deploy a phase before starting the next. Low effort works because each prompt is a numbered list of small tasks with a pass/fail check; if a session wanders, tell it "stop, do task N only".

## State at the time of writing (so the next session does not rediscover it)
- Phase 1 is live: broker import (13 formats), instrument specs, multiple accounts, screenshots code. The owner reports the `trade-screenshots` bucket exists; **no end-to-end upload test has been run on production** (no paid test account yet).
- TradeNotes' real database is a separate Supabase organization/project ("TradeNotes", Free plan). The Supabase connector in the build sessions sees only `YardScale-Digital` (Agriloop). **Never run SQL against YardScale-Digital for TradeNotes work.** Production deploys are done by hand (`create_deployment`, target production) because Production Branch is not set to `main`.
- CI was broken by invalid YAML until PR #1; it works now (two jobs). `scripts/e2e-billing.js` has one pre-existing failing check (founding price $6 vs expected $12 on a fresh database): do not "fix" it by loosening the test; ask the owner.
- Open owner items: real payment plus refund test, lawyer review, Production Branch = `main`, paid test account, Supabase Free tier has no backups and pauses after inactivity.
- Docs to trust: `docs/NEXT_BUILD_BRIEF.md` (spec), `docs/QA_RESULTS_2026-11-13.md` (what was verified and the honest gaps), `docs/BUILD_LOG.md`.
