# Category scorecard
Initial = start of this round with Fable's frontend merged (Fable's own overall was 7/10 for the frontend). Final = after this round's **verified** work. Scores are 0–10.

| Category | Weight | Initial | Final | Evidence for final |
|---|---:|---:|---:|---|
| Core functionality | 20% | 6.0 | **7.5** | Futures fixed; edit, export, self-delete added (e2e). Still no CSV import, multi-account, timezone |
| UX / frontend (Fable baseline) | 15% | 7.0 | **7.0** | Unchanged design; new UI uses Fable's primitives. Landing still has no real screenshots |
| Database / security | 15% | 8.0 | **8.5** | 42 build-time checks, forged-id e2e, 0 vulns, FK indexes. Held back: email verification off in prod, TLS unverified, no monitoring |
| Payments / subscriptions | 15% | 3.0 | **5.0** | Full lifecycle built and passing 23 + 37 tests — **but never run against real HandyPay**. An unverified payment system is a launch blocker, so this cannot score higher |
| Performance / reliability | 10% | 7.0 | **7.5** | 55 ms dashboard query at 10k trades; transactional webhooks; no error monitoring |
| Onboarding / usability | 10% | 7.0 | **7.0** | Unchanged; edit removes the worst friction but onboarding answers still unused |
| Legal / trust | 5% | 4.0 | **5.0** | New subscription policy; pages now accurate. Business name/support email unset; unreviewed; founding offer without mechanism |
| Email / notifications | 5% | 4.0 | **5.0** | 8 templates, billing emails, tested with fake. Not live, no real delivery |
| Mobile responsiveness | 5% | 7.0 | **7.0** | 21/21 viewport combos, mobile e2e; no real devices |
| **Weighted total** | | **6.1** | **6.9** | |

Calculation (final): 7.5×.20 + 7.0×.15 + 8.5×.15 + 5.0×.15 + 7.5×.10 + 7.0×.10 + 5.0×.05 + 5.0×.05 + 7.0×.05 = **6.875**.
