# Legal pages — STATUS 2026-11-12
Filled from the founder's submission: businessName "Yardscale Digital (App Studio)", address "Independence City, St Catherine, Jamaica", supportEmail support@tradenotes.dev, refund 14 days, deletion 30 days, governing law Jamaica, no DPA number yet. **counselReviewed = false** and every legal page now states (in `LEGAL.responsibilityStatement`) that the operator accepts full responsibility and that no lawyer reviewed it.
**Open:** support@tradenotes.dev must actually receive mail (set up forwarding) before the site is shared publicly.

# Legal pages — what to fill in
Pages (`/legal/terms`, `/legal/privacy`, `/legal/disclaimer`) are rendered from **`src/lib/legal.ts`**. Until required values are set, each page shows a red "not filled in" warning and `[… not set yet]` markers; `npm run check:legal` fails. **I am not a lawyer; these are plain-English drafts. The founder has accepted legal responsibility; a lawyer review is still recommended.**

## Values only you can supply
| Field | What | Needed? |
|---|---|---|
| `businessName` | Legal or trading name of who operates TradeNotes (the data controller) | **Required** |
| `supportEmail` | Address for support, privacy requests, cancellations, refunds | **Required** |
| `address` | Postal address | Optional (recommended for the DPA controller details) |
| `dpaRegistrationNumber` | Jamaica Data Protection Act registration no., once you have it | Optional until registered |
## Decisions that are promises to customers (confirm each)
- `refundDays` = **14** (full refund of the FIRST payment on request). This was my suggested default — you never confirmed it. Use 0 for "no refunds except where law requires".
- `deletionDays` = **30** (time to complete a verified deletion request). You must be able to keep this promise (today: delete the user row; cascades everything).
- `governingLaw` = "the laws of Jamaica" — confirm with counsel.
- `counselReviewed` = false. Set to true ONLY after a qualified lawyer reviews; until then pages say they are unreviewed.
## Facts the pages state (verify they remain true)
Providers: Supabase (database, US), Vercel (hosting/logs, US), Resend (email), Handypay (payments). Cookies: `better-auth.session_token`, `tn_src` (30 days). No advertising cookies. Vercel Web Analytics (cookieless) counts visits. We store IP + user agent with sessions. 18+ only. Plans are activated manually after payment confirmation (we "aim for one business day"). Liability cap = fees paid in prior 12 months (**counsel should review**).
## Still to do outside the code
Register as a data controller with the Jamaican Information Commissioner (see LEGAL_REQUIREMENTS.md); confirm who is merchant of record / owes sales tax with Handypay; trademark check on "TradeNotes".
## Added 2026-11-12 (journal feature build, phase 1) — owner to review
- **New data category: trade screenshots** (paid plans). Stored in Supabase Storage on the existing TradeNotes Supabase project (US), private bucket `trade-screenshots`, viewed only via signed links that expire in 2 minutes; EXIF/GPS metadata stripped on upload. Deleted with the trade, the trading account, an import roll-back, or the user account. Not included in the CSV export (stated on the Settings page and in the Privacy Policy).
- **Imported files**: read once; only resulting trades, file name and counts are kept.
- **New setting: time zone** (`profiles.timezone`). **New cookie: `tn_acct`** (selected trading account, 1 year, only after switching).
- Privacy Policy sections 2, 4, 5, 6, 7 updated accordingly. No change to `src/lib/legal.ts` facts. Counsel review still outstanding.

## Added 2026-11-13 (journal feature build, phase 2) — owner to review
- **New data categories (free text and answers written by the user):** (1) **reviews** (daily/weekly/monthly; five free-text answers plus a snapshot of summary figures taken when saved; paid plans, existing ones stay readable after a downgrade), (2) **playbook** (checklist rules per strategy, up to 200 characters each, and per-trade answers "followed / not followed"; paid plans). Same Supabase database and provider as the rest of the journal; no new provider, no new cookie.
- **Deletion:** removed with the user account (database cascade; tested). Deleting a strategy-less trade or a retired rule does not delete past answers. A review can be deleted by the user on any plan.
- **Export:** the CSV export still contains trades only. Reviews, playbook rules/answers and screenshots are NOT in it (stated in the Privacy Policy sections 2, 6 and 7 and on the pricing page). If counsel or the Jamaican regulator expects a complete export, add them in a later phase.
- **Reminder emails for reviews are NOT built** (no free scheduler confirmed by the owner); no new email category.
- Privacy Policy sections 2, 6, 7 updated. No change to `src/lib/legal.ts` facts. Counsel review still outstanding.

## Added 2026-11-13 (reminder emails) — owner to review
- **New email category: opt-in weekly review reminder** (paid plans, off by default, one-click unsubscribe, link only, no trading figures). Sent through Resend (already listed). We store `profiles.review_reminders` (the user's choice), `review_reminder_sent_at` and an audit-log row per send. Privacy Policy section 2 (Emails) updated. No new provider, no new cookie. See docs/REVIEW_REMINDERS.md.

## 2026-11-13: lawyer review recorded (owner instruction)
- `counselReviewed` set to **true** on the owner's statement that a lawyer has reviewed the pages. Every legal page now shows "Reviewed by a lawyer" next to the effective date, the responsibility statement says the documents were reviewed (it no longer says "written without review"), and the partner terms line follows the flag. No review date or lawyer name is stored or shown (not provided).
- **Check:** the Privacy Policy text added on 2026-11-13 (reviews, playbook, reminder emails, export/delete wording) and any refund/trial wording changed later must also have been seen by the lawyer. If not, send them the diff or set the flag back to false until they have.

## 2026-11-13 (later): no review claim on the site
- The owner asked for the pages to be live **without** saying they were reviewed. The "Reviewed by a lawyer" badge, the "reviewed" sentence in the responsibility statement and the partner-terms line were removed; the statement now only says Yardscale Digital accepts full responsibility. `counselReviewed` stays true in `legal.ts` as the owner's internal record and is not displayed.

## Added 2026-11-13 (journal feature build, phase 3: growth) — owner to review
- **New data categories (user-entered):** (1) **hypothetical backtest trades** (Premium; typed in by hand, kept in their own table, never part of real statistics; screenshots may be attached and share the same private bucket under the prefix `<user_id>/backtest/`, counted in the same storage quota); (2) **share links** (all plans): we store only a SHA-256 hash of the token, an optional label (only the owner sees it), the scope (all time, this year, last 90 or 30 days), created / expires / revoked times. The public page `/r/<token>` is read-only, noindex, no-store and shows aggregate totals and an equity curve **only**: no notes, instruments, strategy or account names, email, screenshots, tags or per-trade dates. We do **not** record who opens a link (no view counter).
- **Privacy risk to be aware of:** anyone who has the link can see the owner's profit/loss totals and drawdown in the chosen currency. The owner chooses to create it, can pick a 7, 30 or 90 day expiry, and can revoke it at once. The Settings text and the page itself state this and that the figures are unverified.
- **Not new:** the public `/demo` uses fictional data generated in code (no user data, no cookies beyond the site's existing ones). The web manifest and the quick-log page add no new data or processor. No service worker.
- **Deletion:** hypothetical trades, their screenshots (database rows cascade; account deletion removes every object under `<user_id>/`, including `backtest/`) and share links are removed with the account (tested). A user can delete a hypothetical trade on any plan.
- **Export:** hypothetical trades have their own CSV export, labelled HYPOTHETICAL in the first line, every row and the file name. The normal trades export never contains them.
- Privacy Policy sections 2, 6, 7 updated accordingly. No change to `src/lib/legal.ts` facts. Counsel: please also see the new Disclaimer-relevant wording: hypothetical results are labelled and carry the usual "not real trades, no slippage, not a prediction" caveats (the existing /legal/disclaimer already covers simulated results in general).
- **Disclaimer page wording changed** (`/legal/disclaimer`, one bullet): it said backtesting results "will be" hypothetical "if ever offered"; it now says the backtest log (Premium) and the demo ARE hypothetical or fictional, with the same caveats, and that TradeNotes supplies no market data. Counsel should see this line.
