# HandyPay live setup, from zero (go-live checklist)
Goal: customers pay inside TradeNotes, HandyPay tells TradeNotes, the plan switches on automatically.
You need two secrets in Vercel: **API key** (lets the app create checkouts) and **webhook signing secret** (lets the app trust HandyPay's notifications). Without the webhook secret, payments succeed but plans never activate.

## Before you start
- The old key pasted in chat on 2026-11-12 is compromised: **revoke it** in HandyPay and create a new one. Never paste keys in chat/GitHub.
- Your own first payment will use a founding seat (50% off, 1 of 10) and, if you arrive through a partner link, create a commission. Do the self-test from a clean browser with no `?ref=`. A SQL clean-up for the seat is at the bottom.

## Step 1: Create the live API key (HandyPay dashboard)
1. Log in to HandyPay, make sure the account is in **Live** mode (not Test).
2. Developers / API keys -> **Create key**. It starts with `hp_live_`. Copy it once.

## Step 2: Add the webhook endpoint (HandyPay dashboard)
1. Webhooks -> **Add endpoint**.
2. URL, exactly: `https://tradenotes.dev/api/webhooks/handypay`
3. Events: select `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_succeeded`, `invoice.payment_failed`, `charge.refunded` (or "all events"; unknown ones are ignored safely).
4. Save, then reveal and copy the endpoint's **signing secret** (often `whsec_...`).

## Step 3: Put both secrets in Vercel
Vercel -> project **tradenotes** -> Settings -> Environment Variables. Add two variables, each with **Production** ticked and **Sensitive** ON:
| Name | Value |
|---|---|
| `HANDYPAY_API_KEY` | the `hp_live_...` key |
| `HANDYPAY_WEBHOOK_SECRET` | the endpoint signing secret |
Tell Claude (no values) when both are saved; I will confirm they exist and redeploy. (Or redeploy yourself: Deployments -> latest -> Redeploy.)

## Step 4: Check the endpoint is alive (30 seconds)
In HandyPay Webhooks, use **Send test event** if offered. Open the delivery log: expect **HTTP 200** and a body like `{"ok":true,"outcome":"..."}`. `401 bad signature` = wrong secret in Vercel (re-copy, redeploy). `503` = secret missing from Production.

## Step 5: First live payment (yourself, cheapest plan)
1. Private browser window -> https://tradenotes.dev -> sign up with a real inbox -> confirm the email.
2. Account -> Plan & billing -> Standard (monthly). While seats remain you should see the 50% founding price.
3. Pay with a real card. Expected: returned to /app/billing, plan shows **Standard** within about a minute, a row appears in Payment history.
4. HandyPay Webhooks -> delivery log: each event shows 200 with `"ok":true`. Outcomes starting `applied:` are good; `ignored:no-matching-user` means the event did not carry our user id.
5. Cancel in-app (access continues to period end), then Resume. Then refund the payment in HandyPay and confirm a "refunded" row.
If anything looks wrong, stop, do NOT take other customers, and send Claude what the delivery log shows (not the secret).

## Step 6: Release your own founding seat (optional, SQL on the TradeNotes database)
```sql
update tradenotes.subscriptions set is_founding_member = false, founding_claimed_at = null
where user_id = (select id from public.tn_user where email = 'YOUR-TEST-EMAIL');
```

## Reference
Signature header `X-HandyPay-Signature: sha256=<hex>`: HMAC-SHA256 of the raw body with the signing secret. Every event id is stored once (retries cannot double-apply); raw payloads are kept in `tradenotes.billing_events`. Field names are Stripe-style assumptions (KNOWN_ISSUES #26): the first real delivery is the proof.
Troubleshooting: Vercel -> Logs -> search `billing webhook failed` or `checkout failed`; Sentry (once active) tags these `billing-webhook` / `checkout`.

## 14-day free trial (2026-11-13)
- Four HandyPay subscription products exist, each with a 14-day free trial: Standard monthly US$12, Premium monthly US$24, Standard annual US$120, Premium annual US$240 (verified on each hosted checkout page: "charge USD X every month/year after your 14-day trial"). Their price ids are in `src/lib/plans.ts` (`HANDYPAY_PRICE_IDS`); the static links (`CHECKOUT_LINKS`) are the fallback when no API key is set.
- With the API key set, checkout creates a session from the **price id** with `trial_period_days: 14` plus `metadata` (user id, plan, interval). The **founding-member price stays an inline custom amount with no trial** (HandyPay documents the trial parameter only for the price form).
- Older products (the earlier 7-day-trial links and any duplicates created while setting this up) are no longer used by the app; archive them in HandyPay so nobody finds them.
- **Not yet confirmed against real deliveries (do this in HandyPay test mode before advertising the trial):** (1) does the price-form session echo `metadata`? (if not, the webhook falls back to the tracked subscription or the verified account email, and plan from the amount); (2) which events and statuses arrive at trial start, trial end and the first charge (`customer.subscription.created/updated`, `invoice.paid`, `customer.subscription.trial_will_end`) and what `invoice.paid` looks like for a US$0 trial invoice; (3) a trial that ends without payment must return the account to Free; (4) cancelling during the trial. Until then, `checkout.session.completed` still sets a provisional 32-day period that the first real period end replaces.
