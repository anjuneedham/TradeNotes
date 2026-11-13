"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getContext } from "@/lib/app-context";
import { getAuth } from "@/lib/auth";
import { pool } from "@/lib/db";
import { handypayEnabled, cancelAtPeriodEnd } from "@/lib/billing/handypay";
import { isValidTimeZone } from "@/lib/timezone";
import { getStore } from "@/lib/storage";
import { PLANS } from "@/lib/plans";
import { remindersLive } from "@/lib/reminders";

/** Preferences: explanation toggle (profiles.show_explanations, own row under RLS) and a per-device appearance cookie. */
export async function savePreferences(formData: FormData) {
  const { db, user, plan } = await getContext();
  const show = formData.get("show_explanations") === "on";
  // The reminder is opt-in, needs a plan with reviews (checked here, on the server) and only exists where the scheduler is configured.
  const reminders = formData.get("review_reminders") === "on" && PLANS[plan].reviews && remindersLive();
  const tzRaw = String(formData.get("timezone") ?? "UTC");
  const tz = isValidTimeZone(tzRaw) ? tzRaw : "UTC";
  await db((q) => q("update tradenotes.profiles set show_explanations = $1, timezone = $3, review_reminders = case when $5::boolean then $4::boolean else review_reminders end where id = $2", [show, user.id, tz, reminders, formData.get("reminders_shown") === "1"]));
  const theme = String(formData.get("theme") ?? "system");
  const jar = await cookies();
  if (theme === "light" || theme === "dark") jar.set("tn_theme", theme, { maxAge: 60 * 60 * 24 * 365, path: "/", sameSite: "lax", httpOnly: true });
  else jar.delete("tn_theme");
  revalidatePath("/app", "layout");
  redirect("/app/settings?saved=1");
}

/**
 * Permanently delete the signed-in user's account and all their data (every TradeNotes table cascades from tn_user).
 * Requires typing DELETE and the current password (verified by Better Auth). A live HandyPay subscription is cancelled first,
 * so a deleted user is never charged again; if that cancellation fails, nothing is deleted.
 */
export async function deleteAccount(formData: FormData) {
  const { user, sub, plan } = await getContext({ requireOnboarded: false });
  if (String(formData.get("confirm") ?? "").trim() !== "DELETE") redirect("/app/settings?delete_error=confirm#data");
  const password = String(formData.get("password") ?? "");
  if (!password) redirect("/app/settings?delete_error=password#data");
  // Check the password before anything irreversible (subscription cancel, file purge).
  let verified = false;
  try { await getAuth().api.verifyPassword({ body: { password }, headers: await headers() }); verified = true; } catch { /* wrong password */ }
  if (!verified) redirect("/app/settings?delete_error=password#data");
  if (plan !== "free" && sub?.provider_subscription_id && !sub.cancel_at_period_end) {
    if (!handypayEnabled()) redirect("/app/settings?delete_error=subscription#data");
    try { await cancelAtPeriodEnd(sub.provider_subscription_id); }
    catch (e) { console.error("delete: cancel failed", e instanceof Error ? e.message : e); redirect("/app/settings?delete_error=subscription#data"); }
  }
  // Screenshots live outside the database: delete every object under "<user_id>/" before the rows;
  // if that fails, nothing else is deleted (the user can retry), so no files are left behind without an owner.
  const store = getStore();
  if (store) {
    try { await store.deletePrefix(user.id); }
    catch (e) { console.error("delete: screenshot purge failed", e instanceof Error ? e.message : e); redirect("/app/settings?delete_error=files#data"); }
  }
  try {
    await pool.query("insert into tradenotes.audit_log (user_id, action, detail) values (null, 'account_deleted', $1)", [JSON.stringify({ at: new Date().toISOString() })]);
    await getAuth().api.deleteUser({ body: { password }, headers: await headers() });
  } catch (e) {
    console.error("delete account failed", e instanceof Error ? e.message : e);
    redirect("/app/settings?delete_error=password#data");
  }
  const jar = await cookies();
  for (const c of jar.getAll()) if (c.name.includes("better-auth")) jar.delete(c.name);
  redirect("/?deleted=1");
}
