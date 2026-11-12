import { PLANS, type PlanId } from "./plans";

/** Days a paid plan keeps working after a failed renewal while the provider retries the card. */
export const GRACE_DAYS = 3;

/**
 * Effective plan. Paid features unlock only for:
 * - active / trialing, within the paid period (a cancelled-at-period-end subscription stays active until then);
 * - past_due (renewal failed, provider retrying), until the paid period end + GRACE_DAYS.
 * Everything else (canceled, unpaid, incomplete, pending, expired, unknown plan) is Free. Data is never removed.
 */
export function effectivePlan(sub: { plan: string; status: string; current_period_end: string | null } | null, now = new Date()): PlanId {
  if (!sub || sub.plan === "free") return "free";
  if (!(sub.plan in PLANS)) return "free";
  const end = sub.current_period_end ? new Date(sub.current_period_end).getTime() : null;
  if (sub.status === "active" || sub.status === "trialing") return end !== null && end < now.getTime() ? "free" : (sub.plan as PlanId);
  if (sub.status === "past_due") return end !== null && end + GRACE_DAYS * 86400000 >= now.getTime() ? (sub.plan as PlanId) : "free";
  return "free";
}
export function canAddTrade(plan: PlanId, currentCount: number): boolean {
  const limit = PLANS[plan].tradeLimit;
  return limit === null || currentCount < limit;
}
