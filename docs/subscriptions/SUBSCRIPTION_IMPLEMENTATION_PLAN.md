# Subscription implementation plan
| Step | Status |
|---|---|
| Validate Fable's tier proposal against code | COMPLETE — FINAL_SUBSCRIPTION_TIER_MATRIX |
| Cost + margin model | COMPLETE — scripts/unit-economics.py |
| Provider evaluation | COMPLETE — stay on HandyPay |
| Schema: subscription fields, events, payments | VERIFIED (migrate ×2, test-paste, verify-db 42) |
| Lifecycle reducer | VERIFIED (23 unit tests) |
| Webhook endpoint | VERIFIED vs fake (e2e-billing 37) |
| Checkout via API with user metadata | VERIFIED vs fake |
| Cancel / resume / portal | VERIFIED vs fake |
| Payment history UI, automated billing states | VERIFIED vs fake |
| Billing emails | VERIFIED vs fake Resend |
| Server-side entitlement + grace | VERIFIED |
| Real HandyPay test-mode run | **BLOCKED — founder: test API key + webhook secret** |
| Plan switching in-app | NOT STARTED (manual by email; HandyPay switching API undocumented beyond quantity) |
| Founding-member coupon | NOT STARTED — decision needed (recommend removing the line) |
| Annual billing | NOT STARTED (not shown in UI) |
| Admin view of subscriptions | NOT STARTED (SQL in PAYMENT_ARCHITECTURE) |
