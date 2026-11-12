"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getContext, ACCOUNT_COOKIE } from "@/lib/app-context";
import { PLANS } from "@/lib/plans";
import { removeObjects } from "@/lib/storage/cleanup";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const accountSchema = z.object({
  name: z.string().trim().min(1, "Give the account a name").max(60),
  broker: z.string().trim().max(60).optional().transform((v) => v || null),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Use a 3-letter currency code, e.g. USD"),
  starting_balance: z.preprocess((v) => (v === "" || v === undefined ? 0 : v), z.coerce.number().min(0).max(1e12)),
});
export interface AccountState { message?: string; code?: "limit"; ok?: boolean }

/**
 * Create a trading account. Plan limit (Free 1, Standard 2, Premium 10) is checked inside the same transaction as the insert,
 * under row-level security, so it cannot be bypassed from the UI. After a downgrade, existing accounts stay readable.
 */
export async function createAccount(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const { db, user, plan } = await getContext();
  const p = accountSchema.safeParse(Object.fromEntries(formData));
  if (!p.success) return { message: p.error.issues[0].message };
  const max = PLANS[plan].accounts;
  const out = await db(async (q) => {
    await q("select pg_advisory_xact_lock(hashtext('tn_accounts:' || $1))", [user.id]); // two tabs cannot both slip under the limit
    const [{ n }] = await q<{ n: number }>("select count(*)::int as n from tradenotes.accounts");
    if (n >= max) return { limit: true as const };
    const [a] = await q<{ id: string }>("insert into tradenotes.accounts (user_id, name, broker, currency, starting_balance) values ($1, $2, $3, $4, $5) returning id",
      [user.id, p.data.name, p.data.broker, p.data.currency, p.data.starting_balance]);
    return { limit: false as const, id: a.id };
  });
  if (out.limit) return { code: "limit", message: `Your ${PLANS[plan].name} plan includes ${max} trading account${max === 1 ? "" : "s"}.` };
  revalidatePath("/app", "layout");
  redirect("/app/accounts?created=1");
}

export async function updateAccount(formData: FormData) {
  const { db } = await getContext();
  const id = String(formData.get("id") ?? "");
  const p = accountSchema.safeParse(Object.fromEntries(formData));
  if (!UUID.test(id) || !p.success) redirect("/app/accounts?error=invalid");
  await db((q) => q("update tradenotes.accounts set name = $2, broker = $3, currency = $4, starting_balance = $5 where id = $1", [id, p.data.name, p.data.broker, p.data.currency, p.data.starting_balance]));
  revalidatePath("/app", "layout");
  redirect("/app/accounts?saved=1");
}

/** Delete a trading account and every trade in it (cascade). The last account cannot be deleted. Screenshot files are removed too. */
export async function deleteAccountRecord(formData: FormData) {
  const { db } = await getContext();
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) redirect("/app/accounts");
  if (String(formData.get("confirm_name") ?? "").trim() !== String(formData.get("expected_name") ?? "").trim()) redirect("/app/accounts?error=confirm");
  const res = await db(async (q) => {
    const [{ n }] = await q<{ n: number }>("select count(*)::int as n from tradenotes.accounts");
    if (n <= 1) return { last: true as const, paths: [] as string[] };
    const paths = (await q<{ storage_path: string }>("select s.storage_path from tradenotes.trade_screenshots s join tradenotes.trades t on t.id = s.trade_id where t.account_id = $1", [id])).map((r) => r.storage_path);
    await q("delete from tradenotes.accounts where id = $1", [id]);
    return { last: false as const, paths };
  });
  if (res.last) redirect("/app/accounts?error=last");
  await removeObjects(res.paths);
  const jar = await cookies();
  if (jar.get(ACCOUNT_COOKIE)?.value === id) jar.delete(ACCOUNT_COOKIE);
  revalidatePath("/app", "layout");
  redirect("/app/accounts?deleted=1");
}

/** Switch the account shown across the app ("all" = combined). Only the user's own account ids are accepted. */
export async function selectAccount(formData: FormData) {
  const { accounts } = await getContext();
  const id = String(formData.get("account") ?? "");
  const jar = await cookies();
  if (id === "all" || accounts.some((a) => a.id === id)) jar.set(ACCOUNT_COOKIE, id, { path: "/", sameSite: "lax", httpOnly: true, maxAge: 60 * 60 * 24 * 365 });
  const back = String(formData.get("back") ?? "/app");
  revalidatePath("/app", "layout");
  redirect(back.startsWith("/app") && !back.startsWith("//") ? back : "/app");
}
