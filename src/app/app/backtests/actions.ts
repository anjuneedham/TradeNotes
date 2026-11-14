"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getContext } from "@/lib/app-context";
import { backtestFormSchema } from "@/lib/trade-schema";
import { backtestColumns, MAX_BACKTESTS } from "@/lib/backtest";
import { PLANS } from "@/lib/plans";
import { removeObjects } from "@/lib/storage/cleanup";
import { UUID, type FormState } from "@/lib/trade-save";

const PLAN_MSG = `The backtest log is part of ${PLANS.pro.name}. Nothing was saved.`;

function parse(formData: FormData) {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const parsed = backtestFormSchema.safeParse({ ...raw, emotions: [], mistakes: [] });
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { ok: false as const, state: { errors, message: "Please fix the highlighted fields.", values: raw } satisfies FormState };
  }
  return { ok: true as const, d: parsed.data, raw };
}

/** Add a hypothetical trade. Premium only, checked here on the server (the form is not the gate). Never writes to the real trades table. */
export async function createBacktest(_prev: FormState, formData: FormData): Promise<FormState> {
  const { db, user, plan } = await getContext();
  const p = parse(formData);
  if (!p.ok) return p.state;
  if (!PLANS[plan].backtesting) return { message: PLAN_MSG, values: p.raw, code: "limit" };
  try {
    const cols: [string, unknown][] = [["user_id", user.id], ...backtestColumns(p.d)];
    await db(async (q) => {
      const [{ n }] = await q<{ n: number }>("select count(*)::int as n from tradenotes.backtest_trades");
      if (n >= MAX_BACKTESTS) throw new Error("limit");
      await q(`insert into tradenotes.backtest_trades (${cols.map(([c]) => c).join(", ")}) values (${cols.map(([c], i) => (c === "exits" ? `$${i + 1}::jsonb` : `$${i + 1}`)).join(", ")})`, cols.map(([, v]) => v));
    });
  } catch (e) {
    if (e instanceof Error && (e.message === "limit" || /backtest trade limit reached/.test(e.message))) return { message: `You can keep up to ${MAX_BACKTESTS.toLocaleString("en-US")} hypothetical trades. Delete some to add more.`, values: p.raw };
    console.error("createBacktest failed", e instanceof Error ? e.message : e);
    return { message: "Could not save the hypothetical trade. Nothing was saved — please try again.", values: p.raw };
  }
  revalidatePath("/app/backtests");
  redirect("/app/backtests?saved=1");
}

/** Edit one. Premium only; another user's id matches no row (row-level security) and reports "not found". */
export async function updateBacktest(_prev: FormState, formData: FormData): Promise<FormState> {
  const { db, plan } = await getContext();
  const id = String(formData.get("trade_id") ?? "");
  formData.delete("trade_id");
  const p = parse(formData);
  if (!p.ok) return p.state;
  if (!UUID.test(id)) return { message: "Hypothetical trade not found.", values: p.raw };
  if (!PLANS[plan].backtesting) return { message: PLAN_MSG, values: p.raw, code: "limit" };
  let found = false;
  try {
    const cols: [string, unknown][] = [...backtestColumns(p.d), ["updated_at", new Date().toISOString()]];
    found = await db(async (q) => (await q(
      `update tradenotes.backtest_trades set ${cols.map(([c], i) => `${c} = ${c === "exits" ? `$${i + 2}::jsonb` : `$${i + 2}`}`).join(", ")} where id = $1 returning id`,
      [id, ...cols.map(([, v]) => v)])).length > 0);
  } catch (e) {
    console.error("updateBacktest failed", e instanceof Error ? e.message : e);
    return { message: "Could not save your changes. Nothing was changed — please try again.", values: p.raw };
  }
  if (!found) return { message: "Hypothetical trade not found.", values: p.raw };
  revalidatePath("/app/backtests");
  redirect(`/app/backtests/${id}?saved=1`);
}

/** Delete one (any plan: removing your own data is never blocked). Its screenshots go with it, files included. */
export async function deleteBacktest(formData: FormData) {
  const { db } = await getContext();
  const id = String(formData.get("id") ?? "");
  const paths = UUID.test(id) ? await db(async (q) => {
    const p = (await q<{ storage_path: string }>("select storage_path from tradenotes.backtest_screenshots where backtest_id = $1", [id])).map((r) => r.storage_path);
    await q("delete from tradenotes.backtest_trades where id = $1", [id]);
    return p;
  }) : [];
  await removeObjects(paths);
  revalidatePath("/app/backtests");
  redirect("/app/backtests?deleted=1");
}
