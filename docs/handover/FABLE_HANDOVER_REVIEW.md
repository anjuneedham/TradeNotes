# Fable handover review
Reviewer: Opus (technical lead) · Date: 2026-11-11 · Method: read all 16 design documents **and** compared them with the code, built it, and ran it.

## Where Fable's work was
Fable's work was **not on `main` or on this branch**. It was on the unmerged branch `origin/ccr-1a791cba-pqxtyk` (3 commits, 67 files, +2,912/−444). That branch descends directly from this branch's head, so I **fast-forwarded** it in unchanged (commit `0a8a660`). Nothing Fable made was rewritten.

## Verdict
Fable's work is high quality and, unusually, **honest**: the documents describe what the code does, mark unbuilt features as unbuilt, and list backend dependencies with precise contracts (`docs/design/OPUS_FABLE_HANDOFF.md`, H-1…H-20). I checked every claim I relied on against the code; I found **no case where a document claimed something the code doesn't do.**

## 1–3. Designed, implemented, works
| Area | Designed | Implemented | Verified by me |
|---|---|---|---|
| Design system (light + dark tokens, IBM Plex, primitives in `components/ui.tsx`) | Yes | Yes | Build; screenshots via e2e at 390/1280 px |
| App shell, nav, mobile tab bar | Yes | Yes | e2e "no horizontal scroll" at mobile width |
| Landing, pricing, learn, legal (route group `(marketing)`) | Yes | Yes | HTTP 200, static |
| Dashboard + new Analytics page | Yes | Yes | e2e numbers match hand calculation ($593.00 / 1.98R) |
| Journal list + status filter, trade detail | Yes | Yes | e2e incl. user B → 404 on A's trade |
| Trade form (mobile sticky save, live risk read-out, limit panel) | Yes | Yes | e2e |
| Billing screen (manual process), plan comparison | Yes | Yes for manual billing | e2e |
| Settings (preferences) | Yes | Yes | e2e |
| Error + not-found pages | Yes | Yes | build |
| e2e coverage of new screens | — | 38 checks | **38/38 on my run before any change** |

## 4–5. Incomplete / visually complete but functionally disconnected
| Item (Fable ref) | State found | What I did |
|---|---|---|
| **H-1 Futures trades fail to save** | Real bug: form sent `futures`, DB allows `future` | **Fixed** + regression test + e2e |
| **H-2 No trade edit** ("single biggest gap") | Detail page said "delete and re-enter" | **Built** `/app/journal/[id]/edit` + `updateTrade` |
| **H-3 Subscription automation** | Billing UI designed for automated states, backend manual | **Built** API checkout, signed webhooks, lifecycle, payment history, cancel/resume/portal |
| H-4 Downgrade keeps data | Correct in code | Confirmed + tested (e2e-billing) |
| H-6 Export / delete account | Settings said "email support" | **Built** CSV export + password-confirmed deletion |
| H-6 Change password / edit account | Explanation only | **Not built** (password reset by email exists) |
| H-5 User timezone | UTC labelled | **Not built** — documented |
| H-8 More journal filters, H-9 SQL aggregation | Not built | Deferred, documented |
| H-12 CSV import UI, multiple accounts, screenshots, calendar | Labelled "in development" | Deferred; not advertised as available |
| H-16 Support email / business name | Placeholders | **Founder input required** |
| H-17 Founding-member offer | Copy only, no mechanism | Flagged — see tier matrix (recommend: remove line or honour manually) |

## 6–9. Needed backend / DB / API work (now done unless stated)
- DB: `db/paste/07_billing.sql` (subscription provider fields, `billing_events`, `payments`, RLS, grants). Idempotent; applied twice in test.
- API: `POST /api/webhooks/handypay`; `GET /app/export`; server actions `updateTrade`, `startCheckout`, `cancelSubscription`, `resumeSubscriptionAction`, `openPortal`, `deleteAccount`.
- Contracts from the handoff honoured: return URLs `?checkout=success|cancelled`; `cancel_at_period_end`; billing history shape (id, date, description, amount, currency, status, receipt URL).

## 10. What must be preserved
The design tokens, primitives, the honest copy ("today the paid plans mainly raise your trade limit"), the two-step delete, the usage meter, and the rule that no tier ever gates viewing/exporting your own data.

## Frontend changes I made (all for functionality, none for taste)
| Change | Reason |
|---|---|
| `TradeForm` accepts `edit` (pre-fill, submits to `updateTrade`) | H-2 |
| Trade detail: "Edit trade" button + "Changes saved." notice | H-2 |
| Billing: automated states (success/cancelled/error notices, past-due warning, "Ends …" badge, Manage card, payment history); manual copy kept when the API key is absent | H-3 |
| Settings → Your data: export button + delete form | H-6 |
| Footer: Subscriptions policy link | Legal |
All use Fable's existing primitives (`Card`, `Notice`, `Badge`, `btnCls`, `inputCls`). The only new style is a red-outline destructive button for account deletion.

## Disagreements with Fable
1. **Past-due access.** The old `effectivePlan` cut access immediately on `past_due`, while Fable's billing copy promised access "until the paid period ends". I aligned the code with the copy and added a 3-day grace (`GRACE_DAYS`), stated in Terms and the subscription policy.
2. None on design.
