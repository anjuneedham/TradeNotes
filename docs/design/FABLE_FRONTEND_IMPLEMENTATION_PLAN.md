# Frontend implementation plan

## Phases
| Phase | Scope | Status |
|---|---|---|
| 1 Discovery | Read all code and docs; run locally; baseline e2e 30/30; before-screenshots | **Done** |
| 2 Design direction | "Ledger" system, tokens, typography, IA | **Done** |
| 3 UX architecture | Layout split, page structures, component list | **Done** |
| 4 Subscription experience | Tier recommendation, comparison, paywall and billing specs | **Done** (design); automation blocked on H-3 |
| 5 Implementation — round 1 | Everything below marked Done | **Done** |
| 6 QA — round 1 | Typecheck, lint, 55 unit tests, 30/30 e2e, production build, screenshots at 390 / 820 / 1280 in both themes, contrast measured | **Done**; gaps listed in `FABLE_DESIGN_QA.md` |

## Round 1 — delivered
| Step | Change | Risk control |
|---|---|---|
| 1 | Tokens, fonts, primitives (`globals.css`, `ui.tsx`) | Existing export names kept, so untouched pages kept compiling |
| 2 | Layout split into `(marketing)`, `(auth)`, `app` | Route groups: no URL changed; middleware untouched |
| 3 | App navigation (sidebar / tab bar) | "Log out" button name kept for e2e |
| 4 | Dashboard restructure + `lib/trades-data.ts` | Same query, same engine; all e2e number checks pass unchanged |
| 5 | Analytics page | Read-only; new helpers unit-tested |
| 6 | Trade form | Every field `name` and label kept; server action unchanged except one additive field |
| 7 | Journal: status filter, cards, confirm delete, detail page | One e2e line added for the confirm step |
| 8 | Pricing, billing, plan names | Plan ids untouched |
| 9 | Settings + preferences action | Writes one existing column under RLS; one cookie |
| 10 | Landing, learn, auth, onboarding restyle | Copy claims checked against what exists |

## Round 2 — frontend work that needs no backend (proposed order)
| # | Item | Size |
|---|---|---|
| 2.1 | Screen-reader pass (VoiceOver + NVDA) and fixes | S |
| 2.2 | `error.tsx` and `not-found.tsx` inside `/app` in the design system (today: framework defaults) | S |
| 2.3 | `loading.tsx` skeletons for Dashboard, Analytics, Journal | S |
| 2.4 | Extend e2e: analytics page, trade detail, settings, status filter, limit panels, light theme | M |
| 2.5 | Split the zod schema from the constants so the trade form bundle drops ~30 kB | S |
| 2.6 | Real screenshots on the landing page once there is a production account worth showing | S |
| 2.7 | R-multiple distribution chart on Analytics (data exists: per-trade R) | M |

## Round 3 — needs Opus first (see handoff for contracts)
| # | Item | Depends on |
|---|---|---|
| 3.1 | Edit trade (reuse `TradeForm` pre-filled) | H-2 |
| 3.2 | Billing automation states (success, pending, past due, cancel, switch, history) | H-3 |
| 3.3 | User timezone in forms and tables | H-5 |
| 3.4 | Account editing, password change, export, delete account | H-6 |
| 3.5 | Plan badge and usage in the navigation | H-7 |
| 3.6 | Journal filters: date, strategy, outcome, mistake; sorting | H-8 |
| 3.7 | CSV import flow | H-12 |
| 3.8 | Multiple accounts + switcher | H-12 |
| 3.9 | Calendar view, weekly review | H-12 |

## Definition of done for any screen
Typecheck, lint, unit tests and e2e pass; checked at 390, 820 and 1280 px in both themes with no horizontal page scroll; keyboard reachable with visible focus; every claim on the screen is true of the deployed product; any missing capability is stated in words and listed in the handoff.
