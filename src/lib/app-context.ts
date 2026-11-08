import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { effectivePlan } from "@/lib/entitlements";

/** Loads the signed-in user's context. Redirects to login/onboarding as needed. All queries run under RLS. */
export async function getContext({ requireOnboarded = true } = {}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  // First visit: create profile/subscription/default account (idempotent; replaces a trigger on the shared auth.users table).
  let { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (!profile) {
    await supabase.rpc("ensure_user");
    ({ data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle());
  }
  const [{ data: accounts }, { data: sub }] = await Promise.all([
    supabase.from("accounts").select("id,name,currency,starting_balance").order("created_at"),
    supabase.from("subscriptions").select("plan,status,current_period_end").eq("user_id", user.id).maybeSingle(),
  ]);
  if (requireOnboarded && !profile?.onboarding_completed_at) redirect("/app/onboarding");
  return { supabase, user, profile, accounts: accounts ?? [], plan: effectivePlan(sub) };
}
