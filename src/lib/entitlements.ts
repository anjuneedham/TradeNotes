import { PLANS, type PlanId } from "./plans";

/** Effective plan: only an active/trialing paid subscription within its period unlocks paid features. */
export function effectivePlan(sub: { plan: string; status: string; current_period_end: string | null } | null, now = new Date()): PlanId {
  if (!sub || sub.plan === "free") return "free";
  if (!(sub.plan in PLANS)) return "free";
  if (!["active", "trialing"].includes(sub.status)) return "free";
  if (sub.current_period_end && new Date(sub.current_period_end) < now) return "free";
  return sub.plan as PlanId;
}
export function canAddTrade(plan: PlanId, currentCount: number): boolean {
  const limit = PLANS[plan].tradeLimit;
  return limit === null || currentCount < limit;
}
