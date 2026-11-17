"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getContext } from "@/lib/app-context";
import { PLANS } from "@/lib/plans";
import { MAX_ACTIVE_ITEMS, MAX_ITEMS_TOTAL, MAX_STRATEGIES } from "@/lib/playbook";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const back = (qs: string) => redirect(`/app/playbook?${qs}`);

/** Every write here is Standard and Premium only, checked on the server (the page hides the forms for Free as a courtesy). */
async function writer() {
  const ctx = await getContext();
  return { ...ctx, allowed: PLANS[ctx.plan].playbook };
}

export async function addStrategy(formData: FormData) {
  const { db, user, allowed } = await writer();
  if (!allowed) back("error=plan");
  const name = z.string().trim().min(1).max(60).safeParse(formData.get("name"));
  if (!name.success) back("error=name");
  const res = await db(async (q) => {
    const [{ n }] = await q<{ n: number }>("select count(*)::int as n from tradenotes.strategies");
    if (n >= MAX_STRATEGIES) return "cap" as const;
    const made = await q("insert into tradenotes.strategies (user_id, name) values ($1, $2) on conflict (user_id, name) do nothing returning id", [user.id, name.data!]);
    return made.length ? ("ok" as const) : ("exists" as const);
  });
  revalidatePath("/app/playbook");
  back(res === "ok" ? "ok=strategy" : res === "exists" ? "error=exists" : "error=strategies");
}

export async function addItem(formData: FormData) {
  const { db, user, allowed } = await writer();
  if (!allowed) back("error=plan");
  const strategyId = String(formData.get("strategy_id") ?? "");
  const text = z.string().trim().min(1).max(200).safeParse(formData.get("text"));
  if (!UUID.test(strategyId) || !text.success) back("error=text");
  const res = await db(async (q) => {
    const [s] = await q<{ id: string }>("select id from tradenotes.strategies where id = $1", [strategyId]); // row-level security: only the user's own
    if (!s) return "missing" as const;
    const [{ n, max }] = await q<{ n: number; max: number }>("select count(*) filter (where not archived)::int as n, coalesce(max(position), 0)::int as max from tradenotes.playbook_items where strategy_id = $1", [strategyId]);
    if (n >= MAX_ACTIVE_ITEMS) return "limit" as const;
    const [{ total }] = await q<{ total: number }>("select count(*)::int as total from tradenotes.playbook_items where strategy_id = $1", [strategyId]);
    if (total >= MAX_ITEMS_TOTAL) return "total" as const; // the database stops at the same number (retired rules count)
    await q("insert into tradenotes.playbook_items (user_id, strategy_id, text, position) values ($1, $2, $3, $4)", [user.id, strategyId, text.data!, max + 1]);
    return "ok" as const;
  });
  revalidatePath("/app/playbook");
  back(res === "ok" ? "ok=item" : res === "limit" ? "error=limit" : res === "total" ? "error=total" : "error=text");
}

export async function setItemArchived(formData: FormData) {
  const { db, allowed } = await writer();
  if (!allowed) back("error=plan");
  const id = String(formData.get("item_id") ?? "");
  const archived = formData.get("archived") === "1";
  if (!UUID.test(id)) back("error=text");
  const res = await db(async (q) => {
    if (!archived) { // restoring must respect the cap of active items
      const [it] = await q<{ strategy_id: string }>("select strategy_id from tradenotes.playbook_items where id = $1", [id]);
      if (!it) return "missing" as const;
      const [{ n }] = await q<{ n: number }>("select count(*)::int as n from tradenotes.playbook_items where strategy_id = $1 and not archived", [it.strategy_id]);
      if (n >= MAX_ACTIVE_ITEMS) return "limit" as const;
    }
    const changed = await q("update tradenotes.playbook_items set archived = $2 where id = $1 returning id", [id, archived]);
    return changed.length ? ("ok" as const) : ("missing" as const);
  });
  revalidatePath("/app/playbook");
  back(res === "limit" ? "error=limit" : res === "missing" ? "error=missing" : "ok=archived");
}

/** Permanently delete a RETIRED rule and its past answers (the only way to free a slot once a strategy holds 80 rules). Allowed on any plan: it is the user's own data. */
export async function deleteItem(formData: FormData) {
  const { db } = await getContext();
  const id = String(formData.get("item_id") ?? "");
  if (!UUID.test(id)) back("error=missing");
  const gone = await db((q) => q("delete from tradenotes.playbook_items where id = $1 and archived returning id", [id]));
  revalidatePath("/app/playbook");
  back(gone.length ? "ok=deleted" : "error=missing");
}

/**
 * Record which checklist items were followed on one trade. The items offered are recomputed here from the trade's own strategy
 * (never trusted from the form): its active items plus any archived item that already has an answer on this trade.
 */
export async function saveTradeChecks(formData: FormData) {
  const { db, user, allowed } = await writer();
  const tradeId = String(formData.get("trade_id") ?? "");
  if (!UUID.test(tradeId)) redirect("/app/journal");
  if (!allowed) redirect(`/app/journal/${tradeId}?checks=plan`);
  const done = new Set(formData.getAll("done").map(String).filter((x) => UUID.test(x)));
  const found = await db(async (q) => {
    const [t] = await q<{ strategy_id: string | null }>("select strategy_id from tradenotes.trades where id = $1", [tradeId]); // another user's id returns nothing
    if (!t) return false;
    if (!t.strategy_id) return true;
    const items = await q<{ id: string; archived: boolean; answered: boolean }>(
      `select i.id, i.archived, exists (select 1 from tradenotes.trade_checks c where c.trade_id = $1 and c.item_id = i.id) as answered from tradenotes.playbook_items i where i.strategy_id = $2`, [tradeId, t.strategy_id]);
    for (const it of items) {
      if (it.archived && !it.answered) continue;
      await q(`insert into tradenotes.trade_checks (trade_id, item_id, user_id, followed) values ($1, $2, $3, $4)
               on conflict (trade_id, item_id) do update set followed = excluded.followed`, [tradeId, it.id, user.id, done.has(it.id)]);
    }
    return true;
  });
  if (!found) redirect("/app/journal");
  revalidatePath(`/app/journal/${tradeId}`);
  redirect(`/app/journal/${tradeId}?checks=1`);
}
