# Legal information sources
**Not legal advice. Every document in this folder needs review by a qualified lawyer (Jamaica, plus advice on US/UK/EU customers) before public launch.**

## Source of truth
The live pages render from code: `src/app/(marketing)/legal/{terms,privacy,subscription,disclaimer}/page.tsx` with facts from `src/lib/legal.ts`. The Markdown files here are the review copies of the same text for counsel. If they disagree, the code is what users see — update both.

## What was used, and from where
| Fact | Source | Verified? |
|---|---|---|
| Country: Jamaica; governing law: Jamaica | `src/lib/legal.ts` (founder-set) | Founder decision; **counsel to confirm** |
| Refund 14 days on first payment; deletion within 30 days on request | `src/lib/legal.ts` | **Founder never confirmed** (flagged in LEGAL_FILL_IN) |
| Providers: Vercel, Supabase, Resend, HandyPay | Code | Yes |
| Cookies: `better-auth.session_token`, `tn_src` (30 days), `tn_theme` | Code | Yes |
| Payment data received (amount, date, status, receipt link, customer/subscription ids) | Code (`payments`, `subscriptions`) | Yes |
| Self-service export and deletion | Code + e2e | Yes |
| 3-day past-due grace; cancel at period end | Code + tests | Yes |
| Jamaica DPA 2020 obligations | `docs/LEGAL_REQUIREMENTS.md` (secondary sources) | **No — confirm with the Information Commissioner / counsel** |

## Agriloop repository (`anjuneedham/agriloopmain`, `legal/*.md`) — reviewed 2026-11-11
Found: Agriloop's documents name the controller as **"AgriLoop (business registration in progress), Independence City, Saint Catherine, Jamaica"** with a YardScale Digital contact address; the shared Supabase organisation is named "YardScale-Digital".
**Not copied into TradeNotes.** Nothing establishes that the same entity operates TradeNotes, registration is "in progress", and Agriloop is a marketplace with different data practices. Agriloop's text was **not** reused.

## Founder must supply (blocks public launch)
| Field (`src/lib/legal.ts`) | Question |
|---|---|
| `businessName` | Which legal/trading name operates TradeNotes? (e.g. a registered "YardScale Digital" business, if that is real — confirm registration status) |
| `supportEmail` | Address for support, privacy, cancellations, refunds (ideally `support@tradenotes.dev` once the domain exists) |
| `address` (optional) | Town/parish-level is acceptable; full address recommended for DPA controller details |
| `refundDays` | Confirm 14 (or 0) |
| `deletionDays` | Confirm 30 (self-service deletion is now immediate; this covers email requests) |
| `dpaRegistrationNumber` | After registering as a data controller |
| `counselReviewed` | Set true only after review |

## Claims that must stay true
"Not a broker, adviser or financial service" · no profit promises · "trades are never deleted on downgrade" · cancellation at any time in-app · past-due grace 3 days · HandyPay never shares card numbers with us.
