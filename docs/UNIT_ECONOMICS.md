# Unit Economics & Budget (estimates, USD)
## Initial costs
Domain $15 · business registration (Jamaica, sole trader/company — confirm with COJ) $50–300 · legal review of Terms/Privacy $300–1,500 · **total ≈ $400–1,800**.

## Monthly recurring
| Item | Launch | At ~100 users |
|---|---|---|
| Vercel Pro | $20 | $20 |
| Neon database (free tier at launch; paid tier price to verify on neon.com) | $0 | ~$20 (estimate) |
| Email (Resend) | $0 | $20 |
| Sentry | $0 | $26 |
| Market data (e.g. Polygon/Massive starter, or Databento usage) | $0–30 | $50–200 |
| AI API (P2) | $0 | $10–30 |
| **Fixed total** | **~$45–75** | **~$150–320** |
Payment fees: **Handypay's rates are not yet known** — assume ~3–6% of revenue until confirmed (also confirm payout currency/fees, see LEGAL).

## Break-even (blended ARPU after payment fees ≈ $15, assumed)
- Launch ($75/mo): **5 paying users**.
- Growth ($320/mo): **~22 paying users**.

## Scenarios (month 3)
| | Paying | MRR | Costs | Net |
|---|---|---|---|---|
| Conservative | 15 | $210 | $120 | +$90 |
| Base | 50 | $750 | $200 | +$550 |
| Optimistic | 150 | $2,300 | $400 | +$1,900 |
(Founding discounts depress month-1 MRR; founder time not costed.)

## Paid services — what is actually required (researched 2026-11-10; web-search level, verify at checkout)
| Service | Needed? | Cost | Note |
|---|---|---|---|
| **Vercel Pro** | **Yes, to charge customers** | ~$20/mo per seat + usage | Vercel's Hobby plan is limited to non-commercial personal use per its own docs; a paid SaaS needs Pro |
| Domain `tradenotes.dev` | Yes | $9.99 yr 1, $13 renewal via Vercel (cheaper registrars may show ~$5–8 yr 1; compare **renewal** price) | Confirmed available 2026-11-10; trademark not yet checked |
| Neon database | Free tier to start | $0 → usage-based (Launch plan ≈ $0.106/CU-hour per third-party sources; unverified) | Free: 1 GB/project, 100 CU-hours; writes fail past 1 GB, no surprise bill |
| Resend email | Free to start; **needed before charging** | Free: 100 emails/day, ~3,000/mo; Pro ~$20/mo | Needs a verified domain, so buy the domain first |
| Handypay | Already set up | Fees unknown — get the rate card | |
| Legal review | Strongly advised before launch | est. $300–1,500 one-off | See LEGAL_REQUIREMENTS |
| Jamaica DPA registration | Likely required | fee + annual maintenance fee (amounts unverified) | Register as data controller with the Office of the Information Commissioner |
| Market data | Not yet | — | See ARCHITECTURE (bring-your-own-data first) |
| Error monitoring (Sentry) | Optional | free tier | Add after launch |
**Minimum cash to launch ≈ $20/mo (Vercel Pro) + ~$10/yr domain.** Everything else can start free.
