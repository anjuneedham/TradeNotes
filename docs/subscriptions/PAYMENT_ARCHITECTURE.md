# Payment architecture

```
User ─[Subscribe]→ startCheckout (server action)
        │  refuses if already paid
        └→ HandyPay POST /subscription-sessions {amount_cents, usd, month, metadata:{user_id, plan}, success/cancel URLs}
              └→ redirect to HandyPay hosted checkout (card never touches us)
HandyPay ─(signed webhook)→ POST /api/webhooks/handypay
        verifySignature(raw body)          401 if bad · 503 if secret not configured
        BEGIN
          insert billing_events(id=evt…)   ON CONFLICT DO NOTHING → duplicate ⇒ 200, stop
          resolveUser: metadata.user_id → tracked subscription id → verified unique email
          SELECT subscription FOR UPDATE
          applyEvent(state, event)          pure reducer (lib/billing/lifecycle.ts)
          UPDATE subscriptions · INSERT payments · INSERT audit_log
          mark event processed (outcome)
        COMMIT  (any error ⇒ ROLLBACK + 500 ⇒ HandyPay retries)
        then email (best effort)
Every request ─→ getContext() ─→ effectivePlan(subscription row, now) ─→ limits enforced in the same transaction as writes
```

## Components
| File | Role |
|---|---|
| `src/lib/billing/handypay.ts` | REST client, signature sign/verify, https guard |
| `src/lib/billing/lifecycle.ts` | Pure state machine (no I/O) |
| `src/lib/billing/webhook.ts` | Transactional processor |
| `src/app/api/webhooks/handypay/route.ts` | HTTP endpoint |
| `src/app/app/billing/actions.ts` | checkout, cancel, resume, portal |
| `src/lib/entitlements.ts` | Access rule incl. grace |
| `db/paste/07_billing.sql` | Schema |

## Environment variables (Vercel → Settings → Environment Variables; mark Sensitive)
| Name | Value | Effect when absent |
|---|---|---|
| `HANDYPAY_API_KEY` | `hp_test_…` first, then `hp_live_…` | Static checkout links + manual activation copy (old behaviour) |
| `HANDYPAY_WEBHOOK_SECRET` | from HandyPay → Webhooks → endpoint | Webhook returns 503 (events retried later) |
| `HANDYPAY_API_URL` | **never set in production** (test hook) | — |

Webhook URL to register in HandyPay: `https://tradenotes.dev/api/webhooks/handypay`, events: all `checkout.session.*`, `customer.subscription.*`, `invoice.*`, `charge.refunded`.

## Manual operations still possible
Owner SQL from DEPLOYMENT.md still works for comped/manual plans; set `provider='manual'`. Unmatched events are visible with:
`select id, type, received_at from tradenotes.billing_events where outcome like 'ignored:no-matching-user%' order by received_at desc;`
