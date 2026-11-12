# Initial product score: **6.1 / 10**
Measured at the start of this round, after merging Fable's frontend (see CATEGORY_SCORECARD for the breakdown).

Why not higher: futures trades failed to save; a wrong trade could not be corrected; payments were manual with email matching and no webhook; no self-service data rights; email off in production; legal identity placeholders.
Why not lower: core journal and analytics were accurate and tested; tenant isolation was enforced by the database and re-verified on every deploy; Fable's frontend was coherent and honest.

## Critical blockers at that point
1. Broken primary path for futures traders. 2. No automated, verified payment system. 3. No reachable support contact. 4. Email verification off (payments matched by email).
