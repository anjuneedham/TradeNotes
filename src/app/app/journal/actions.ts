"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getContext } from "@/lib/app-context";
import { PLANS } from "@/lib/plans";
import { parseTradeForm, insertNewTrade, strategyId, tradeColumns, insertExits, UUID, type FormState } from "@/lib/trade-save";
import { removeObjects } from "@/lib/storage/cleanup";

// The shape of the form state lives in lib/trade-save.ts (a "use server" file may only export async functions).
export type { FormState };

export async function createTrade(_prev: FormState, formData: FormData): Promise<FormState> {
  const { db, user, accounts, plan } = await getContext();
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const p = parseTradeForm(formData, accounts);
  if (!p.ok) return p.state;
  try {
    // One transaction: plan-limit check, strategy upsert, trade, exits. Any failure rolls everything back.
    const result = await insertNewTrade(db, user.id, plan, p);
    if ("limit" in result) return { message: `Your ${PLANS[plan].name} plan allows ${PLANS[plan].tradeLimit} trades. Upgrade to log more.`, values: raw, code: "limit" };
  } catch (e) {
    console.error("createTrade failed", e);
    return { message: "Could not save the trade. Nothing was saved — please try again.", values: raw };
  }
  revalidatePath("/app", "layout");
  redirect("/app/journal?saved=1");
}

/**
 * Edit a trade. No plan-limit check (editing never adds a trade).
 * Row-level security means another user's id matches no row, so it reports "not found" and changes nothing.
 */
export async function updateTrade(_prev: FormState, formData: FormData): Promise<FormState> {
  const { db, user, accounts } = await getContext();
  const id = String(formData.get("trade_id") ?? "");
  formData.delete("trade_id");
  const raw = Object.fromEntries(formData) as Record<string, string>;
  if (!UUID.test(id)) return { message: "Trade not found.", values: raw };
  const p = parseTradeForm(formData, accounts);
  if (!p.ok) return p.state;
  let found = false;
  try {
    found = await db(async (q) => {
      const cols: [string, unknown][] = [...tradeColumns(p, await strategyId(q, user.id, p.d.strategy_name)), ["updated_at", new Date().toISOString()]];
      const rows = await q<{ id: string }>(
        `update tradenotes.trades set ${cols.map(([c], i) => `${c} = $${i + 2}`).join(", ")} where id = $1 returning id`,
        [id, ...cols.map(([, v]) => v)]);
      if (!rows.length) return false;
      await q("delete from tradenotes.trade_exits where trade_id = $1", [id]);
      await insertExits(q, id, user.id, p);
      return true;
    });
  } catch (e) {
    console.error("updateTrade failed", e);
    return { message: "Could not save your changes. Nothing was changed — please try again.", values: raw };
  }
  if (!found) return { message: "Trade not found.", values: raw };
  revalidatePath("/app", "layout");
  redirect(`/app/journal/${id}?saved=1`);
}

export async function deleteTrade(formData: FormData) {
  const { db } = await getContext();
  const id = String(formData.get("id") ?? "");
  // RLS: only own rows match. Screenshot rows cascade; their files are then removed from storage.
  const paths = UUID.test(id) ? await db(async (q) => {
    const p = (await q<{ storage_path: string }>("select storage_path from tradenotes.trade_screenshots where trade_id = $1", [id])).map((r) => r.storage_path);
    await q("delete from tradenotes.trades where id = $1", [id]);
    return p;
  }) : [];
  await removeObjects(paths);
  revalidatePath("/app", "layout");
  redirect("/app/journal?deleted=1");
}
