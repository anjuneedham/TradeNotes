"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getContext } from "@/lib/app-context";
import { tradeFormSchema, exitsOf, plannedRisk, defaultMultiplier } from "@/lib/trade-schema";
import { canAddTrade } from "@/lib/entitlements";
import { PLANS } from "@/lib/plans";

export interface FormState { errors?: Record<string, string>; message?: string; values?: Record<string, string> }

export async function createTrade(_prev: FormState, formData: FormData): Promise<FormState> {
  const { db, user, accounts, plan } = await getContext();
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

  const currency = d.currency ?? account.currency;
  const foreign = currency !== account.currency;
  if (foreign && d.fx_to_account === undefined) {
    return { errors: { fx_to_account: `Enter the rate to convert ${currency} into ${account.currency}` }, message: "Please fix the highlighted fields.", values: raw };
  }
  const fx = foreign ? d.fx_to_account! : 1;
  const exits = exitsOf(d);
  const closedAt = exits.length && d.closed_at ? new Date(d.closed_at).toISOString() : null;

  try {
    // One transaction: plan-limit check, strategy upsert, trade, exits. Any failure rolls everything back.
    const result = await db(async (q) => {
      const [{ n }] = await q<{ n: number }>("select count(*)::int as n from tradenotes.trades");
      if (!canAddTrade(plan, n)) return { limit: true as const };
      let strategyId: string | null = null;
      if (d.strategy_name) {
        const [s] = await q<{ id: string }>(
          "insert into tradenotes.strategies (user_id, name) values ($1, $2) on conflict (user_id, name) do update set name = excluded.name returning id",
          [user.id, d.strategy_name]);
        strategyId = s.id;
      }
      const cols: [string, unknown][] = [
        ["user_id", user.id], ["account_id", d.account_id], ["strategy_id", strategyId], ["symbol", d.symbol], ["asset_class", d.asset_class], ["side", d.side],
        ["quantity", d.quantity], ["entry_price", d.entry_price], ["stop_price", d.stop_price ?? null], ["target_price", d.target_price ?? null],
        ["multiplier", d.multiplier ?? defaultMultiplier(d.asset_class)], ["fees", d.fees ?? 0], ["initial_risk", plannedRisk(d, fx)],
        ["currency", currency], ["fx_to_account", foreign ? fx : null], ["opened_at", new Date(d.opened_at).toISOString()], ["closed_at", closedAt],
        ["timeframe", d.timeframe ?? null], ["session", d.session ?? null], ["pre_trade_notes", d.pre_trade_notes ?? null],
        ["post_trade_notes", d.post_trade_notes ?? null], ["lessons", d.lessons ?? null], ["emotions", d.emotions], ["mistakes", d.mistakes],
        ["followed_plan", d.followed_plan ?? null], ["discipline_score", d.discipline_score ?? null],
      ];
      const [t] = await q<{ id: string }>(
        `insert into tradenotes.trades (${cols.map(([c]) => c).join(", ")}) values (${cols.map((_, i) => `$${i + 1}`).join(", ")}) returning id`,
        cols.map(([, v]) => v));
      for (const x of exits) {
        await q("insert into tradenotes.trade_exits (trade_id, user_id, quantity, price, exited_at) values ($1, $2, $3, $4, $5)", [t.id, user.id, x.quantity, x.price, closedAt]);
      }
      return { limit: false as const };
    });
    if (result.limit) return { message: `Your ${PLANS[plan].name} plan allows ${PLANS[plan].tradeLimit} trades. Upgrade to log more.`, values: raw };
  } catch (e) {
    console.error("createTrade failed", e);
    return { message: "Could not save the trade. Nothing was saved — please try again.", values: raw };
  }
  revalidatePath("/app", "layout");
  redirect("/app/journal?saved=1");
}

export async function deleteTrade(formData: FormData) {
  const { db } = await getContext();
  const id = String(formData.get("id") ?? "");
  if (/^[0-9a-f-]{36}$/i.test(id)) await db((q) => q("delete from tradenotes.trades where id = $1", [id])); // RLS: only own rows match
  revalidatePath("/app", "layout");
  redirect("/app/journal?deleted=1");
}
