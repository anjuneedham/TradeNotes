import { PLANS, type PlanId } from "./plans";

/**
 * Presentation data for pricing and billing. Limits are read from PLANS (the enforced source of truth);
 * nothing here grants access. `now` rows exist in the product today; `dev` rows are NOT built and must
 * always render under an "In development — not available yet" heading.
 */
export const PLAN_ORDER: PlanId[] = ["free", "starter", "pro"];
const limit = (id: PlanId) => (PLANS[id].tradeLimit === null ? "Unlimited" : PLANS[id].tradeLimit.toLocaleString("en-US"));
type Cell = string | boolean;
export interface FeatureRow { label: string; detail?: string; cells: Record<PlanId, Cell> }
const all = (v: Cell): Record<PlanId, Cell> => ({ free: v, starter: v, pro: v });

export const FEATURES_NOW: FeatureRow[] = [
  { label: "Trades you can store", detail: "Counted across your whole journal.", cells: { free: limit("free"), starter: limit("starter"), pro: limit("pro") } },
  { label: "Manual trade entry", detail: "Long/short, partial exits, fees, forex lots, other quote currencies.", cells: all(true) },
  { label: "Risk plan and R-multiples", detail: "Stop, target, planned risk, reward : risk.", cells: all(true) },
  { label: "Notes, emotion and mistake tags", cells: all(true) },
  { label: "Dashboard", detail: "Eight core metrics, equity curve, what to review.", cells: all(true) },
  { label: "Analytics breakdowns", detail: "By strategy, instrument, session, direction, weekday, mistake and emotion.", cells: all(true) },
  { label: "Plain-English explanations and metric guide", cells: all(true) },
  { label: "CSV import", detail: "From any broker or spreadsheet export; duplicates skipped; roll back any import.", cells: { free: false, starter: true, pro: true } },
  { label: "Export all your trades (CSV)", cells: all(true) },
];
export const FEATURES_DEV: FeatureRow[] = [
  { label: "Trade screenshots", cells: { free: false, starter: true, pro: true } },
  { label: "Calendar view and weekly reviews", cells: { free: false, starter: true, pro: true } },
  { label: "Multiple trading accounts", cells: { free: false, starter: `Up to ${PLANS.starter.accounts}`, pro: `Up to ${PLANS.pro.accounts}` } },
  { label: "Backtesting with historical replay", cells: { free: false, starter: false, pro: true } },
  { label: "Strategy comparison", cells: { free: false, starter: false, pro: true } },
];
export const PLAN_BLURB: Record<PlanId, string> = {
  free: "Everything you need to start journaling and see your numbers.",
  starter: "The full journal with room for an active trader's history.",
  pro: "No trade limit, and first access to backtesting when it is released.",
};
export const planHeadline = (id: PlanId) => (id === "free" ? `Up to ${limit(id)} trades` : id === "starter" ? `Up to ${limit(id)} trades` : "Unlimited trades");
