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
