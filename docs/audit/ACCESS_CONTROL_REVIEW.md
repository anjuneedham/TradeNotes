# Access control review
Every entry point, who may call it, and what stops misuse.

| Entry point | Auth check | Data scoping | Paid gate | Tested |
|---|---|---|---|---|
| `/app/**` pages | middleware (cookie) + `getContext()` (real session) | `withUser` → RLS | — | e2e: signed-out → /login |
| `createTrade` | `getContext()` | RLS + ownership trigger (account must be caller's) | `canAddTrade(plan, count)` **inside the insert transaction** | e2e: forged account id → "Account not found." ; limit at 50 |
| `updateTrade` (new) | `getContext()` | `UPDATE … WHERE id=$1` under RLS → foreign id matches 0 rows → "Trade not found."; trigger re-checks account ownership | none (editing never adds) | e2e: forged trade id → refused, A's trade unchanged |
| `deleteTrade` | `getContext()` | RLS | — | e2e |
| `/app/journal/[id]`, `/edit` | `getContext()` | RLS → 404 | — | e2e: B → 404 |
| `/app/export` (new) | Better Auth session, 401 otherwise | `withUser` → RLS | — | e2e: own rows only; anonymous refused |
| `savePreferences` | `getContext()` | own profile row; `is_admin` protected by trigger | — | e2e + verify-db |
| `startCheckout` (new) | `getContext()` | user id from session (never from the form) | refuses if already on a paid plan | e2e-billing |
| `cancelSubscription` / `resumeSubscriptionAction` / `openPortal` (new) | `getContext()` | acts only on the caller's own `provider_subscription_id` from DB | — | e2e-billing: correct sub id; B (no sub) gets no button, makes no API calls |
| `deleteAccount` (new) | `getContext()` + Better Auth password check | deletes caller only | cancels live subscription first | e2e: wrong password refused; cascade |
| `POST /api/webhooks/handypay` | HMAC signature (no session) | owner connection; user from signed metadata / tracked sub / verified email | — | 37 e2e + 5 signature unit tests |
| `/api/auth/*` | Better Auth | — | rate limit 30/min | e2e-email |
| Admin | none exists | — | — | — |

## Things a user cannot do (verified)
Read/update/delete another user's trades, exits, strategies, accounts, profile, subscription or payments; attach an exit to another's trade; put a trade into another's account; use another's strategy; make themselves admin; change their own plan; insert a payment; read billing events; read login tables. (verify-db 42 checks + e2e.)
