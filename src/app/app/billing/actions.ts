"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getContext } from "@/lib/app-context";
import { pool } from "@/lib/db";
import { CHECKOUT_URLS, type PlanId } from "@/lib/plans";
import { emailEnabled } from "@/lib/email";
import { sendTemplate } from "@/lib/email-templates";
import { claimFoundingSeat, foundingPriceCents } from "@/lib/founding";
import { safeUrl, handypayEnabled, createSubscriptionCheckout, cancelAtPeriodEnd, resumeSubscription, portalUrl } from "@/lib/billing/handypay";

const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

/**
 * Start checkout for a paid plan. With the API configured, the session carries the user id in metadata so the webhook
 * activates the right account automatically. Without it, falls back to the static HandyPay link (manual activation).
 * Refuses a second checkout while a paid subscription is active (prevents double billing).
 */
export async function startCheckout(formData: FormData) {
  const { user, plan } = await getContext({ requireOnboarded: false });
  const want = String(formData.get("plan"));
  if (want !== "starter" && want !== "pro") redirect("/app/billing");
  if (plan !== "free") redirect("/app/billing?error=already-subscribed");
  if (!handypayEnabled()) redirect(CHECKOUT_URLS[want]);
  let url: string;
  try {
    // Founding offer: reserve a seat (race-safe, max 10) and charge the discounted price; otherwise the normal price.
    const founding = (await claimFoundingSeat(user.id)) ? { amountCents: foundingPriceCents(want) } : undefined;
    url = await createSubscriptionCheckout({ plan: want, userId: user.id, email: user.email, siteUrl: site(), founding });
  } catch (e) {
    console.error("checkout failed", e instanceof Error ? e.message : e);
    redirect("/app/billing?error=checkout");
  }
  redirect(url);
}

/** Owner-connection write of the "cancellation requested" flag, so the UI reflects it before the webhook arrives. */
async function setCancelFlag(userId: string, on: boolean) {
  await pool.query("update tradenotes.subscriptions set cancel_at_period_end = $2, canceled_at = case when $2 then coalesce(canceled_at, now()) else null end, updated_at = now() where user_id = $1", [userId, on]);
  await pool.query("insert into tradenotes.audit_log (user_id, action, detail) values ($1, $2, '{}'::jsonb)", [userId, on ? "cancel_requested" : "resume_requested"]);
}

export async function cancelSubscription() {
  const { user, sub, plan } = await getContext({ requireOnboarded: false });
  if (!sub?.provider_subscription_id || !handypayEnabled()) redirect("/app/billing?error=manual");
  try { await cancelAtPeriodEnd(sub.provider_subscription_id); await setCancelFlag(user.id, true); }
  catch (e) { console.error("cancel failed", e instanceof Error ? e.message : e); redirect("/app/billing?error=cancel"); }
  // The webhook won't email again: it only notifies when the flag wasn't already set.
  if (emailEnabled()) await sendTemplate(user.email, "cancellation_scheduled", { plan: plan as PlanId, periodEnd: sub.current_period_end }).catch((e) => console.error("cancel email failed", e instanceof Error ? e.message : e));
  revalidatePath("/app", "layout");
  redirect("/app/billing?cancelled=1");
}

export async function resumeSubscriptionAction() {
  const { user, sub } = await getContext({ requireOnboarded: false });
  if (!sub?.provider_subscription_id || !handypayEnabled()) redirect("/app/billing?error=manual");
  try { await resumeSubscription(sub.provider_subscription_id); await setCancelFlag(user.id, false); }
  catch (e) { console.error("resume failed", e instanceof Error ? e.message : e); redirect("/app/billing?error=resume"); }
  revalidatePath("/app", "layout");
  redirect("/app/billing?resumed=1");
}

/** Signed HandyPay management link (update card, view invoices) for the user's own subscription only. */
export async function openPortal() {
  const { sub } = await getContext({ requireOnboarded: false });
  if (!sub?.provider_subscription_id || !handypayEnabled()) redirect("/app/billing?error=manual");
  let url: string | null = null;
  try { url = await portalUrl(sub.provider_subscription_id); } catch (e) { console.error("portal failed", e instanceof Error ? e.message : e); }
  redirect(url && safeUrl(url) ? url : "/app/billing?error=portal");
}
