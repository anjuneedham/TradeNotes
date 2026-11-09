# Launch Plan
**Reality check (Nov 8):** codebase started today. Realistic: landing + waitlist/free signup live Nov 8–9; paid checkout working ~Nov 10–11; first payment shortly after. Nov 15 target of 10 paying is possible only via founder-led sales with the founding offer. We will not take money before payments, data isolation and the journal are verified.

## Minimum acceptable product (to charge money)
Auth · onboarding (experience, markets, first account) · manual trade entry with partial exits · journal list/detail/edit/delete · CSV import with preview/dedupe/rollback · dashboard with core metrics + explanations + exclusion notices · Handypay checkout + entitlements (manual activation acceptable for the first customers; webhook when Handypay provides docs) with server-enforced limits · legal pages reviewed · RLS verified with two test users · mobile-usable · error/empty states.
Backtesting: sold as "Pro — backtesting launching [date]" to founding members only if not ready; never shown with fake data.

## Payment verification process
1. Handypay: subscribe with a test/real small payment, confirm it appears in the Handypay dashboard, activate the plan (DEPLOYMENT.md SQL), verify entitlement in the app, then cancel/refund and verify downgrade.
2. Live mode: founder buys Starter with own card, verifies entitlement, refunds.
3. Monthly (daily once >10 customers): reconcile Handypay active subscribers vs `tradenotes.subscriptions`; extend renewals.

## Scorecard (current)
| Area | Status |
|---|---|
| Landing / pricing / learn / legal drafts | ✅ built, builds locally; not deployed |
| Metrics engine | ✅ 16 tests pass |
| CSV parser/dedupe | ✅ 3 tests pass |
| DB schema + RLS | 🟡 written, not applied |
| Auth, journal UI, dashboard, import UI | ❌ |
| Payments (Handypay) | 🟡 checkout links + billing page built; activation manual; webhook needs Handypay docs |
| Deployment | ❌ (no Vercel project) |
| Legal review | ❌ |
| Backtesting | ❌ (data provider not chosen/licensed) |
