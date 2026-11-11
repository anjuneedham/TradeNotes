import type { PoolClient } from "pg";
import { pool } from "../db";
import { applyEvent, FREE, subscriptionIdOf, userIdOf, objectOf, type ProviderEvent, type SubState, type Notify } from "./lifecycle";
import { verifySignature } from "./handypay";
import { sendTemplate } from "../email-templates";
import { emailEnabled } from "../email";
import type { PlanId } from "../plans";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export interface WebhookResult { status: number; body: { ok: boolean; outcome: string } }

function isEvent(x: unknown): x is ProviderEvent {
  const e = x as ProviderEvent;
  return !!e && typeof e.id === "string" && e.id.length > 0 && e.id.length <= 200 && typeof e.type === "string" && typeof e.created === "number" && typeof e.data === "object" && e.data !== null;
}

/**
 * Verify, de-duplicate and apply one HandyPay webhook delivery. Runs on the OWNER connection (the only writer of
 * subscriptions/payments/billing_events). Everything happens in one transaction: if anything fails we return 500,
 * the event row rolls back with it, and HandyPay's retry processes it again. A repeated event id is a no-op (200).
 */
export async function handleWebhook(rawBody: string, signature: string | null, secret = process.env.HANDYPAY_WEBHOOK_SECRET ?? ""): Promise<WebhookResult> {
  if (!secret) return { status: 503, body: { ok: false, outcome: "webhook secret not configured" } };
  if (!verifySignature(rawBody, signature, secret)) return { status: 401, body: { ok: false, outcome: "bad signature" } };
  let event: unknown;
  try { event = JSON.parse(rawBody); } catch { return { status: 400, body: { ok: false, outcome: "invalid json" } }; }
  if (!isEvent(event)) return { status: 400, body: { ok: false, outcome: "not an event" } };

  const client = await pool.connect();
  let mail: { notify: Notify; userId: string; plan: PlanId; periodEnd: string | null } | null = null;
  let outcome = "";
  try {
    await client.query("begin");
    const ins = await client.query(
      "insert into tradenotes.billing_events (id, type, provider_subscription_id, payload) values ($1, $2, $3, $4) on conflict (id) do nothing returning id",
      [event.id, event.type, subscriptionIdOf(event), rawBody]);
    if (ins.rowCount === 0) { await client.query("commit"); return { status: 200, body: { ok: true, outcome: "duplicate" } }; }

    const userId = await resolveUser(client, event);
    if (!userId) {
      outcome = "ignored:no-matching-user";
    } else {
      await client.query("insert into tradenotes.subscriptions (user_id) values ($1) on conflict do nothing", [userId]);
      const { rows: [row] } = await client.query(
        `select plan, status, current_period_end, cancel_at_period_end, canceled_at, provider_subscription_id, provider_customer_id, last_event_at
         from tradenotes.subscriptions where user_id = $1 for update`, [userId]);
      const cur: SubState = { ...FREE, ...row, status: row.status ?? "active" };
      const out = applyEvent(cur, event);
      if (out.next) {
        const n = out.next;
        await client.query(
          `update tradenotes.subscriptions set plan = $2, status = $3, current_period_end = $4, cancel_at_period_end = $5, canceled_at = $6,
             provider = 'handypay', provider_subscription_id = $7, provider_customer_id = $8, last_event_at = $9, updated_at = now() where user_id = $1`,
          [userId, n.plan, n.status, n.current_period_end, n.cancel_at_period_end, n.canceled_at, n.provider_subscription_id, n.provider_customer_id, n.last_event_at]);
        await client.query("insert into tradenotes.audit_log (user_id, action, detail) values ($1, 'subscription_changed', $2)",
          [userId, JSON.stringify({ event: event.id, type: event.type, from: { plan: cur.plan, status: cur.status }, to: { plan: n.plan, status: n.status } })]);
        if (out.notify) mail = { notify: out.notify, userId, plan: n.plan, periodEnd: n.current_period_end };
      }
      if (out.payment) {
        const p = out.payment;
        await client.query(
          `insert into tradenotes.payments (id, user_id, provider_subscription_id, amount_cents, currency, status, description, receipt_url, occurred_at)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9) on conflict (id) do nothing`,
          [p.id, userId, subscriptionIdOf(event), p.amount_cents, p.currency, p.status, p.description, p.receipt_url, p.occurred_at]);
      }
      outcome = out.note;
    }
    await client.query("update tradenotes.billing_events set user_id = $2, processed_at = now(), outcome = $3 where id = $1", [event.id, userId, outcome]);
    await client.query("commit");
  } catch (e) {
    await client.query("rollback").catch(() => undefined);
    console.error("billing webhook failed", event.type, event.id, e instanceof Error ? e.message : e);
    return { status: 500, body: { ok: false, outcome: "error" } };
  } finally {
    client.release();
  }
  if (mail && emailEnabled()) await notifyUser(mail).catch((e) => console.error("billing email failed", mail?.notify, e instanceof Error ? e.message : e));
  return { status: 200, body: { ok: true, outcome } };
}

type Client = PoolClient;
/** Who the event is for: metadata.user_id (set by our checkout) > the subscription we already track > a VERIFIED account email (legacy static links). */
async function resolveUser(client: Client, e: ProviderEvent): Promise<string | null> {
  const fromMeta = userIdOf(e);
  if (fromMeta && UUID.test(fromMeta)) {
    const r = await client.query("select id from public.tn_user where id = $1", [fromMeta]);
    if (r.rowCount) return fromMeta;
  }
  const subId = subscriptionIdOf(e);
  if (subId) {
    const r = await client.query("select user_id from tradenotes.subscriptions where provider = 'handypay' and provider_subscription_id = $1", [subId]);
    if (r.rowCount) return r.rows[0].user_id;
  }
  const o = objectOf(e);
  const email = [o.customer_email, (o.customer_details as Record<string, unknown> | undefined)?.email].find((x) => typeof x === "string") as string | undefined;
  if (email) {
    const r = await client.query(`select id from public.tn_user where lower(email) = lower($1) and "emailVerified" = true`, [email]);
    if (r.rowCount === 1) return r.rows[0].id;
  }
  return null;
}

async function notifyUser(m: { notify: Notify; userId: string; plan: PlanId; periodEnd: string | null }) {
  if (m.notify === "renewed") return; // receipts come from HandyPay; we don't email every renewal
  const { rows: [u] } = await pool.query("select email from public.tn_user where id = $1", [m.userId]);
  if (u) await sendTemplate(u.email, m.notify, { plan: m.plan, periodEnd: m.periodEnd });
}
