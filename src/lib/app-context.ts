import { cookies, headers } from "next/headers";
import { cleanSrc } from "./db-config";
import { redirect } from "next/navigation";
import { getAuth } from "./auth";
import { withUser, type Q } from "./db";
import { effectivePlan } from "./entitlements";

export interface Profile {
  id: string; experience_level: string | null; primary_market: string | null; show_explanations: boolean;
  onboarding_completed_at: string | null; is_admin: boolean;
}
export interface Account { id: string; name: string; currency: string; starting_balance: string }

/** Validates the session, loads the user's context (under row-level security) and returns a `db` helper bound to that user. */
export async function getContext({ requireOnboarded = true } = {}) {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const user = { id: session.user.id, email: session.user.email };
  const db = <T>(fn: (q: Q) => Promise<T>) => withUser(user.id, fn);
  const srcTag = cleanSrc((await cookies()).get("tn_src")?.value);

  const { profile, accounts, sub } = await db(async (q) => {
    let [profile] = await q<Profile>("select * from tradenotes.profiles where id = $1", [user.id]);
    if (!profile) { // first visit: create profile / free subscription / default account (idempotent)
      await q("select tradenotes.ensure_user()");
      if (srcTag) await q("update tradenotes.profiles set signup_source = $1 where id = $2 and signup_source is null", [srcTag, user.id]);
      [profile] = await q<Profile>("select * from tradenotes.profiles where id = $1", [user.id]);
    }
    const accounts = await q<Account>("select id, name, currency, starting_balance from tradenotes.accounts order by created_at");
    const [sub] = await q<{ plan: string; status: string; current_period_end: string | null }>(
      "select plan, status, current_period_end from tradenotes.subscriptions where user_id = $1", [user.id]);
    return { profile, accounts, sub: sub ?? null };
  });
  if (requireOnboarded && !profile?.onboarding_completed_at) redirect("/app/onboarding");
  return { db, user, profile, accounts, plan: effectivePlan(sub), sub };
}
