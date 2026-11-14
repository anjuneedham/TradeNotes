import "server-only";
import { q } from "./db";
import { effectivePlan, daysLeft, isPaying, mrr, type Sub } from "./plans";

export type Customer = {
  id: string; email: string; name: string | null; verified: boolean; created_at: string; signup_source: string | null; onboarded: boolean;
  plan: string; status: string; current_period_end: string | null; is_founding_member: boolean; trades: number; last_trade: string | null;
  email_ok: boolean; email_opt_out: boolean; notes: string | null; testimonial: string; founding_call_at: string | null;
};
export const isTestEmail = (e: string) => /@(e2e\.test|verify\.invalid|example\.(com|org|net)|test\.local)$/i.test(e) || /^smoke\d+@/.test(e);

const BASE = `select u.id, u.email, u.name, u."emailVerified" as verified, u."createdAt" as created_at, p.signup_source, (p.onboarding_completed_at is not null) as onboarded,
  coalesce(s.plan,'free') as plan, coalesce(s.status,'active') as status, s.current_period_end, coalesce(s.is_founding_member,false) as is_founding_member,
  (select count(*)::int from tradenotes.trades t where t.user_id = u.id) as trades, (select max(t.opened_at) from tradenotes.trades t where t.user_id = u.id) as last_trade,
  coalesce(m.email_ok,false) as email_ok, coalesce(m.email_opt_out,false) as email_opt_out, m.notes, coalesce(m.testimonial,'none') as testimonial, m.founding_call_at
  from public.tn_user u left join tradenotes.profiles p on p.id = u.id left join tradenotes.subscriptions s on s.user_id = u.id left join hq.customer_meta m on m.user_id = u.id`;

export async function listCustomers(showTest = false): Promise<Customer[]> {
  const rows = await q<Customer>(`${BASE} order by u."createdAt" desc limit 2000`);
  return showTest ? rows : rows.filter((c) => !isTestEmail(c.email));
}
export async function getCustomer(id: string): Promise<Customer | null> { return (await q<Customer>(`${BASE} where u.id = $1`, [id]))[0] ?? null; }
export async function findCustomerByEmail(email: string): Promise<Customer | null> { return (await q<Customer>(`${BASE} where lower(u.email) = lower($1)`, [email.trim()]))[0] ?? null; }

export const subOf = (c: Customer): Sub => ({ plan: c.plan, status: c.status, current_period_end: c.current_period_end, is_founding_member: c.is_founding_member });
export const effPlan = (c: Customer, now = new Date()) => effectivePlan(subOf(c), now);
export const paying = (c: Customer, now = new Date()) => isPaying(subOf(c), now);
export const left = (c: Customer, now = new Date()) => daysLeft(subOf(c), now);

export function summarize(cs: Customer[], now = new Date()) {
  const payers = cs.filter((c) => paying(c, now));
  return { total: cs.length, activated: cs.filter((c) => c.trades > 0).length, paying: payers.length, mrr: mrr(cs.map(subOf), now), foundingUsed: cs.filter((c) => c.is_founding_member && paying(c, now)).length,
    expiring: payers.filter((c) => { const d = left(c, now); return d !== null && d <= 7; }), lapsed: cs.filter((c) => c.plan !== "free" && !paying(c, now)) };
}
export async function foundingSeatsUsed(): Promise<number> {
  return (await q<{ n: number }>(`select count(*)::int n from tradenotes.subscriptions where is_founding_member and plan <> 'free'`))[0].n;
}
export async function audit(userId: string) {
  return q<{ at: string; action: string; detail: Record<string, unknown> | null }>(`select created_at as at, action, detail from tradenotes.audit_log where user_id = $1 and action like 'hq.%' order by id desc limit 20`, [userId]);
}
