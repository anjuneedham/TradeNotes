# HandyPay: API key and webhook setup (do TEST mode first)
The app switches from static links to automatic billing the moment `HANDYPAY_API_KEY` exists. Webhooks are what activate a plan after payment, so set BOTH before testing.

## 0. Rotate first
The live key pasted in chat on 2026-11-12 must be revoked in HandyPay. Never paste keys in chat or commit them; they go only in Vercel as **Sensitive**.

## 1. Test mode first (recommended)
1. HandyPay dashboard -> switch to **Test mode** -> Developers/API keys -> create a key. Test keys start `hp_test_`.
2. Vercel -> tradenotes -> Settings -> Environment Variables -> add `HANDYPAY_API_KEY` = the test key, **Production**, tick **Sensitive**.

## 2. Webhook endpoint
1. HandyPay dashboard -> Webhooks -> Add endpoint, URL exactly: `https://tradenotes.dev/api/webhooks/handypay`
2. Select these events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid` (and/or `invoice.payment_succeeded`), `invoice.payment_failed`, `charge.refunded`. (If HandyPay lets you pick "all events", that is fine: unknown ones are ignored.)
3. Copy the endpoint's **signing secret**. Vercel -> add `HANDYPAY_WEBHOOK_SECRET` = that secret, Production, **Sensitive**.
4. Redeploy (env vars apply only to new deployments).

## 3. How the app verifies
Header `X-HandyPay-Signature: sha256=<hex>` = HMAC-SHA256 of the raw request body with the signing secret. Bad or missing signature -> 401. Each event id is stored once, so retries cannot double-apply. Raw payloads are saved in `tradenotes.billing_events` so the first real delivery can be inspected.

## 4. Test payment (about 15 minutes)
1. Sign up on tradenotes.dev with a real inbox, confirm the email.
2. /app/billing -> choose Monthly or Annual -> Standard. With founding seats open you should see 50% off.
3. Pay with HandyPay's test card. Within about a minute the plan should switch to Standard and a payment row should appear under Payment history.
4. Tell Claude. I will check `billing_events` outcomes (should be `applied:*`, not `ignored:*`), the founding-seat flag and the commission row if a partner link was used.
5. Cancel from /app/billing, confirm it says access continues to period end; then use Resume.
6. Refund the test payment in HandyPay; confirm a `refunded` row appears and any unpaid partner commission is voided.

## 5. Go live
Only after step 4 passes: create live-mode key + live webhook endpoint (same URL, new secret), replace both Vercel variables, redeploy, and run ONE real cheapest-plan payment on yourself, then refund it.

## Troubleshooting
- Plan did not change: HandyPay -> Webhooks -> delivery log. 401 = wrong secret; 5xx = look in Vercel logs for `billing webhook failed`; 200 with `ignored:no-matching-user` = metadata `user_id` missing (event came from a static link, not in-app checkout).
- "We couldn't start checkout": key missing or wrong mode; Vercel logs show `checkout failed`.
