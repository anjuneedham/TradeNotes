# Email audit (2026-11-11)
| Required email | Before this round | Now | Sent when |
|---|---|---|---|
| Welcome | none | **Template + sent** | First visit to the app (profile created), if Resend is on |
| Email verification | plain text | **HTML + text template** | Sign-up; unverified login attempt |
| Password recovery | plain text | **HTML + text template** | Forgot password |
| Subscription confirmation | none | **Template + sent** | First paid activation (checkout webhook) |
| Payment failure | none | **Template + sent** | `invoice.payment_failed` |
| Cancellation confirmation | none | **Template + sent** | Cancel button (app) or provider event if cancelled elsewhere |
| Plan ended | none | **Template + sent** | `customer.subscription.deleted` |
| Important account notice | none | **Template (manual use)** | Owner-triggered; no automated sender yet |

## Infrastructure
- Resend HTTP API, no SDK (`src/lib/email.ts`); now sends `html` + `text`.
- Off until `RESEND_API_KEY` is set. While off: no verification (anyone can register any address) and no reset — UI says so.
- Failures never break the user's action (best-effort, logged). **No alerting** — a broken key fails silently except in logs (known issue 22).
- Reply-to defaults to the support email once filled in.

## Gaps
No unsubscribe needed (all transactional). No bounce/complaint webhook handling. No email on account deletion (the address is gone; consider sending before deletion later).
