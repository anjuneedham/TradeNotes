# Legal Requirements — checklist (not legal advice; items marked ⚖️ need qualified counsel)
- **Business registration (Jamaica):** register business name or company with Companies Office of Jamaica; TRN; ⚖️ choose structure.
- **Tax:** income tax on profits; GCT registration threshold for services; ⚖️ treatment of foreign digital sales; check whether Handypay handles sales tax/VAT as merchant of record or whether that is the founder's responsibility once thresholds approach ⚖️.
- **Payments:** founder reports Handypay is fully set up (hosted subscription links in use). ⚖️ Confirm with Handypay: who is merchant of record, payout country/currency, refund and chargeback handling, and who owes sales tax/VAT.
- **Data protection:** Jamaica Data Protection Act 2020 (registration with the Information Commissioner, data protection officer obligations, breach notification) ⚖️; GDPR/UK GDPR for EU/UK users; CCPA if thresholds met.
- **Policies:** Terms, Privacy, Risk Disclaimer (drafts in app), Cookie notice if non-essential cookies/analytics are added, refund policy (14-day first payment), cancellation any time.
- **Trading:** we provide no advice/signals → avoid regulated investment-advice territory; ⚖️ confirm with FSC-Jamaica and that marketing content stays educational.
- **Market data:** written licence permitting display to end users in a commercial SaaS; no scraping, no redistribution beyond licence.
- **Consumer protection:** clear renewal disclosure, easy cancellation (FTC click-to-cancel style), no fake urgency/testimonials.
- **IP:** trademark search for "TradeNotes" ⚖️ (name may be in use — check before heavy marketing spend).
- **Security incidents:** incident runbook in DAILY_OPERATIONS; notify affected users/regulator per DPA/GDPR timelines.
- **Records:** keep invoices, payment-provider reports, expense receipts ≥ 7 years.

## Jamaica data-protection findings (2026-11-10; secondary sources — confirm on the Information Commissioner's portal)
- The Data Protection Act 2020 applies to anyone processing other people's personal information; sources show **no small-business exemption**. TradeNotes stores emails and trade data → treat yourself as a **data controller**.
- Registration is **online** with the Office of the Information Commissioner; reported requirements: controller contact details, whether public authority, other info the Commissioner requires, **registration fee + annual maintenance fee** (Data Protection (Data Controller Registration) Regulations, 2024). Amounts not verified here.
- Sources disagree on dates (effective 2021 vs registration deadline 1 Dec 2023 with grace period). Ask counsel what applies now.
## What only a lawyer can confirm (I cannot)
1. Terms of Service, Privacy Policy, Risk Disclaimer (drafts in `src/app/legal/*`) are adequate for Jamaica **and** for customers in the US/UK/EU.
2. DPA registration status/fees and breach-notification duties.
3. Merchant of record, sales-tax/VAT duty for Handypay sales; income-tax treatment.
4. Marketing claims stay on the "education, not investment advice" side of FSC rules.
5. "TradeNotes" trademark: `.app` and `.co` are already registered by others — search for conflicts before spending on branding.
