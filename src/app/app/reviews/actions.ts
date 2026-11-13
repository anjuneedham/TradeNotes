"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getContext } from "@/lib/app-context";
import { PLANS } from "@/lib/plans";
import { NO_FILTERS } from "@/lib/filters";
import { loadResults } from "@/lib/trades-data";
import { isPeriod, normalizeStart, periodWindow, reviewSchema, buildStats } from "@/lib/reviews";

export interface ReviewState { message?: string; code?: "plan"; errors?: Record<string, string> }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Save (create or update) the review for one period. Standard and Premium only, checked here on the server (the page's own
 * check is only a courtesy). The auto-filled stats are recomputed on the server from the user's trades, never read from the form.
 */
export async function saveReview(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  const { db, user, plan, tz, scope } = await getContext();
  if (!PLANS[plan].reviews) return { code: "plan", message: `Reviews are part of ${PLANS.starter.name} and ${PLANS.pro.name}. Your existing reviews stay readable.` };
  const period = formData.get("period");
  const start = isPeriod(period) ? normalizeStart(period, String(formData.get("start") ?? "")) : null;
  if (!isPeriod(period) || !start) return { message: "That period is not valid." };
  const parsed = reviewSchema.safeParse(Object.fromEntries(["went_well", "to_repeat", "to_improve", "rule_breaks", "focus_next"].map((k) => [k, formData.get(k) ?? undefined])));
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { message: "Please fix the highlighted boxes.", errors };
  }
  const d = parsed.data;
  try {
    const { rows } = await loadResults(db, scope.accountIds, scope.currency, NO_FILTERS, tz, { window: periodWindow(period, start, tz) });
    const stats = buildStats(rows, scope.currency, scope.label);
    await db((q) => q(
      `insert into tradenotes.reviews (user_id, period, period_start, went_well, to_repeat, to_improve, rule_breaks, focus_next, stats)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
       on conflict (user_id, period, period_start) do update set went_well = excluded.went_well, to_repeat = excluded.to_repeat, to_improve = excluded.to_improve,
         rule_breaks = excluded.rule_breaks, focus_next = excluded.focus_next, stats = excluded.stats`,
      [user.id, period, start, d.went_well, d.to_repeat, d.to_improve, d.rule_breaks, d.focus_next, JSON.stringify(stats)]));
  } catch (e) {
    if (e instanceof Error && /review limit reached/.test(e.message)) return { message: "You have reached the limit of 2,000 saved reviews. Delete old ones to add more." };
    console.error("save review failed", e instanceof Error ? e.message : e);
    return { message: "We couldn't save that just now. Please try again. Nothing was lost." };
  }
  revalidatePath("/app/reviews");
  redirect("/app/reviews?saved=1");
}

/** Deleting your own review is always allowed (on any plan). Row-level security scopes it to the signed-in user. */
export async function deleteReview(formData: FormData) {
  const { db } = await getContext();
  const id = String(formData.get("id") ?? "");
  if (UUID.test(id)) await db((q) => q("delete from tradenotes.reviews where id = $1", [id]));
  revalidatePath("/app/reviews");
  redirect("/app/reviews?deleted=1");
}
