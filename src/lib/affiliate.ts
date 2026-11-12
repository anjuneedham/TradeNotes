import type { PoolClient } from "pg";
import { pool } from "./db";

/** Program rules in one place. Change here, then update docs/AFFILIATE_PROGRAM.md and /partners (rendered from this). */
export const AFFILIATE = {
  defaultPct: 30,        // % of cash actually collected from the referred customer
  months: 12,            // commission window, counted from the customer's first paid payment
  holdDays: 30,          // a commission becomes payable this long after the customer's payment (covers the refund window)
  minPayoutCents: 2500,  // below this, the balance rolls over
  cookieDays: 30,
} as const;

/** A ?ref= code: 3-24 lowercase letters/digits. Anything else is ignored. */
export const cleanRef = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim().toLowerCase() : "";
  return /^[a-z0-9]{3,24}$/.test(s) ? s : null;
};

const DAY = 86400000;
/**
 * Commission for one paid payment, or null if none is earned. Pure so it is unit-tested.
 * Earned only inside the 12-month window that starts at the customer's FIRST paid payment (so an annual plan pays once).
 */
export function commissionFor(o: { amountCents: number; pct: number; paymentAt: Date; firstPaidAt: Date }): { commissionCents: number; payableAfter: Date } | null {
  if (!(o.amountCents > 0) || o.pct <= 0) return null;
  const end = new Date(o.firstPaidAt); end.setUTCMonth(end.getUTCMonth() + AFFILIATE.months);
  if (o.paymentAt >= end) return null;
  const commissionCents = Math.round((o.amountCents * o.pct) / 100);
  if (commissionCents < 1) return null;
  return { commissionCents, payableAfter: new Date(o.paymentAt.getTime() + AFFILIATE.holdDays * DAY) };
}

/** Link a new user to the affiliate whose code they arrived with. First referral wins; self-referral is ignored. */
export async function attachReferral(userId: string, userEmail: string, code: string): Promise<void> {
  const { rows: [a] } = await pool.query("select id, email from tradenotes.affiliates where code = $1 and status = 'active'", [code]);
  if (!a || a.email.trim().toLowerCase() === userEmail.trim().toLowerCase()) return;
  await pool.query("insert into tradenotes.referrals (user_id, affiliate_id) values ($1, $2) on conflict (user_id) do nothing", [userId, a.id]);
}

/** Called inside the webhook transaction after a NEW payment row is stored. Idempotent via commissions.payment_id (unique). */
export async function accrueCommission(client: PoolClient, userId: string, p: { id: string; amount_cents: number; occurred_at: string }): Promise<void> {
  const { rows: [r] } = await client.query(
    "select a.id, a.commission_pct from tradenotes.referrals r join tradenotes.affiliates a on a.id = r.affiliate_id where r.user_id = $1 and a.status = 'active'", [userId]);
  if (!r) return;
  const { rows: [f] } = await client.query("select min(occurred_at) as first from tradenotes.payments where user_id = $1 and status = 'paid'", [userId]);
  if (!f?.first) return;
  const c = commissionFor({ amountCents: p.amount_cents, pct: r.commission_pct, paymentAt: new Date(p.occurred_at), firstPaidAt: new Date(f.first) });
  if (!c) return;
  await client.query(
    `insert into tradenotes.commissions (affiliate_id, user_id, payment_id, base_cents, commission_cents, payable_after)
     values ($1, $2, $3, $4, $5, $6) on conflict (payment_id) do nothing`, [r.id, userId, p.id, p.amount_cents, c.commissionCents, c.payableAfter]);
}

/** A refund cancels commissions that have not been paid out yet (recent ones only). Already-paid ones are deducted by hand from the next payout. */
export async function voidUnpaidCommissions(client: PoolClient, userId: string): Promise<void> {
  await client.query("update tradenotes.commissions set status = 'void' where user_id = $1 and status = 'pending' and created_at > now() - interval '60 days'", [userId]);
}
