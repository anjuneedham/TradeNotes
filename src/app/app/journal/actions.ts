"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getContext } from "@/lib/app-context";
import { tradeFormSchema, exitsOf, plannedRisk, defaultMultiplier } from "@/lib/trade-schema";
import { canAddTrade } from "@/lib/entitlements";
import { PLANS } from "@/lib/plans";

export interface FormState { errors?: Record<string, string>; message?: string; values?: Record<string, string> }

export async function createTrade(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user, accounts, plan } = await getContext();
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const parsed = tradeFormSchema.safeParse({ ...raw, emotions: formData.getAll("emotions"), mistakes: formData.getAll("mistakes") });
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { errors, message: "Please fix the highlighted fields.", values: raw };
  }
  const d = parsed.data;
  const account = accounts.find((a) => a.id === d.account_id);
  if (!account) return { message: "Account not found.", values: raw };

  // Plan limit enforced server-side.
  const { count } = await supabase.from("trades").select("id", { count: "exact", head: true });
  if (!canAddTrade(plan, count ?? 0)) {
    return { message: `Your ${PLANS[plan].name} plan allows ${PLANS[plan].tradeLimit} trades. Upgrade to log more.`, values: raw };
  }

  const currency = d.currency ?? account.currency;
  const foreign = currency !== account.currency;
  if (foreign && d.fx_to_account === undefined) {
    return { errors: { fx_to_account: `Enter the rate to convert ${currency} into ${account.currency}` }, message: "Please fix the highlighted fields.", values: raw };
  }
  const fx = foreign ? d.fx_to_account! : 1;

  let strategyId: string | null = null;
  if (d.strategy_name) {
    const { data: s } = await supabase.from("strategies").upsert({ user_id: user.id, name: d.strategy_name }, { onConflict: "user_id,name" }).select("id").single();
    strategyId = s?.id ?? null;
  }
  const exits = exitsOf(d);
  const { data: trade, error } = await supabase.from("trades").insert({
    user_id: user.id, account_id: d.account_id, strategy_id: strategyId, symbol: d.symbol, asset_class: d.asset_class, side: d.side,
    quantity: d.quantity, entry_price: d.entry_price, stop_price: d.stop_price ?? null, target_price: d.target_price ?? null,
    multiplier: d.multiplier ?? defaultMultiplier(d.asset_class), fees: d.fees ?? 0, initial_risk: plannedRisk(d, fx),
    currency, fx_to_account: foreign ? fx : null, opened_at: new Date(d.opened_at).toISOString(),
    closed_at: exits.length && d.closed_at ? new Date(d.closed_at).toISOString() : null,
    timeframe: d.timeframe ?? null, session: d.session ?? null, pre_trade_notes: d.pre_trade_notes ?? null,
    post_trade_notes: d.post_trade_notes ?? null, lessons: d.lessons ?? null, emotions: d.emotions, mistakes: d.mistakes,
    followed_plan: d.followed_plan ?? null, discipline_score: d.discipline_score ?? null,
  }).select("id").single();
  if (error || !trade) return { message: "Could not save the trade. Please try again.", values: raw };

  if (exits.length) {
    const { error: e2 } = await supabase.from("trade_exits").insert(exits.map((x) => ({
      trade_id: trade.id, user_id: user.id, quantity: x.quantity, price: x.price, exited_at: new Date(d.closed_at!).toISOString(),
    })));
    if (e2) { await supabase.from("trades").delete().eq("id", trade.id); return { message: "Could not save the trade exits. Nothing was saved — please try again.", values: raw }; }
  }
  revalidatePath("/app", "layout");
  redirect("/app/journal?saved=1");
}

export async function deleteTrade(formData: FormData) {
  const { supabase } = await getContext();
  const id = String(formData.get("id") ?? "");
  if (/^[0-9a-f-]{36}$/i.test(id)) await supabase.from("trades").delete().eq("id", id); // RLS: only own rows match
  revalidatePath("/app", "layout");
  redirect("/app/journal?deleted=1");
}
