# Email test report (2026-11-11)
| Test | Environment | Result |
|---|---|---|
| `src/lib/email-templates.test.ts` — every template renders subject/HTML/text, links/plan/date filled, HTML escaped, no profit wording | Vitest | **11/11** |
| `scripts/e2e-email.js` — verification, unconfirmed-login resend, confirmation link sign-in, reset flow, neutral messages, invalid token | Production build + **fake** Resend | **15/15** |
| `scripts/e2e-billing.js` — welcome, subscription confirmed, payment failed, cancellation, plan ended | Production build + **fake** Resend | all PASS (part of 37/37) |

## Not tested
**No email has been delivered to a real inbox.** Domain not purchased; DNS (SPF/DKIM/DMARC) not configured; Resend account not connected. Rendering in Gmail/Outlook/Apple Mail not checked.

## Verdict
Email is **not production-ready**. Ready = domain verified in Resend + one real signup, reset, and (test-mode) payment email received and checked on a phone and a desktop client.
