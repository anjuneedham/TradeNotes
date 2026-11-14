/** Mirror of the customer app's pricing (src/lib/plans.ts). A drift test (plans.test.ts) fails if they diverge. */
export const PRICES = { free: 0, starter: 12, pro: 24 } as const;
export type PlanId = keyof typeof PRICES;
export const FOUNDING = { seats: 10, discountPct: 50, months: 12 } as const;
export const PLAN_IDS = ["free", "starter", "pro"] as const;
export const SUB_PERIOD_DAYS = 35;   // DEPLOYMENT.md: extend ~35 days per confirmed monthly payment

export type Sub = { plan: string; status: string; current_period_end: string | null; is_founding_member?: boolean };

/** Same rule as the customer app's effectivePlan(): paid features only while active/trialing and inside the period. */
export function effectivePlan(sub: Sub | null, now = new Date()): PlanId {
  if (!sub || sub.plan === "free" || !(sub.plan in PRICES)) return "free";
  if (!["active", "trialing"].includes(sub.status)) return "free";
  if (sub.current_period_end && new Date(sub.current_period_end) < now) return "free";
  return sub.plan as PlanId;
}
/** Monthly revenue this subscription represents (founding members pay 50% for their first 12 months). */
export function monthlyValue(sub: Sub, now = new Date()): number {
  const p = effectivePlan(sub, now);
  if (p === "free") return 0;
  return sub.is_founding_member ? PRICES[p] * (1 - FOUNDING.discountPct / 100) : PRICES[p];
}
export const mrr = (subs: Sub[], now = new Date()) => Math.round(subs.reduce((a, s) => a + monthlyValue(s, now), 0) * 100) / 100;
export const isPaying = (s: Sub, now = new Date()) => effectivePlan(s, now) !== "free";
/** Days until a paid plan lapses back to Free (null = no end date / not paid). Negative = already lapsed. */
export function daysLeft(sub: Sub, now = new Date()): number | null {
  if (sub.plan === "free" || !sub.current_period_end) return null;
  return Math.ceil((new Date(sub.current_period_end).getTime() - now.getTime()) / 86_400_000);
}
export function extendedEnd(current: string | null, now = new Date(), days = SUB_PERIOD_DAYS): string {
  const base = current && new Date(current) > now ? new Date(current) : now;   // never shorten a running period
  return new Date(base.getTime() + days * 86_400_000).toISOString();
}

export type ChangeInput = { to: PlanId; founding: boolean; foundingUsed: number; wasFounding: boolean; trades: number; confirmNoTrades: boolean };
/** Validates an owner plan change. Returns an error string or null. */
export function validatePlanChange(c: ChangeInput): string | null {
  if (!(c.to in PRICES)) return "Unknown plan.";
  if (c.founding && c.to === "free") return "A free account cannot be a founding member.";
  if (c.founding && !c.wasFounding && c.foundingUsed >= FOUNDING.seats) return `All ${FOUNDING.seats} founding seats are taken.`;
  if (c.founding && !c.wasFounding && c.trades === 0 && !c.confirmNoTrades) return "Playbook rule: offer founding spots only after someone has logged trades. Tick the confirmation box if you really want to.";
  return null;
}
