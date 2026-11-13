"use server";
import { revalidatePath } from "next/cache";
import { getContext } from "@/lib/app-context";
import { PLANS } from "@/lib/plans";
import { parseTradeForm, insertNewTrade } from "@/lib/trade-save";
import { quickToFormData, inferAssetClass, type QuickState } from "@/lib/quick";

/**
 * Save a trade from the six-field phone form. The account is the last trade's account when it still exists, else the one the switcher shows,
 * else the first; the market comes from the same symbol's last trade or is inferred. Then it is validated and inserted exactly like the full form.
 */
export async function quickLog(prev: QuickState, formData: FormData): Promise<QuickState> {
  const { db, user, accounts, plan, profile, scope } = await getContext();
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const symbol = (raw.symbol ?? "").trim().toUpperCase().replace(/[\s/]/g, "");
  const values = { symbol: raw.symbol ?? "", side: raw.side === "short" ? "short" : "long", quantity: raw.quantity ?? "", entry_price: raw.entry_price ?? "", exit_price: raw.exit_price ?? "", stop_price: raw.stop_price ?? "" };
  // One transaction for both lookups (the same symbol's last market, and the last trade's account).
  const { prevTrade, last } = await db(async (q) => ({
    prevTrade: symbol ? (await q<{ asset_class: string | null }>("select asset_class from tradenotes.trades where symbol = $1 order by opened_at desc limit 1", [symbol]))[0] ?? null : null,
    last: (await q<{ account_id: string }>("select account_id from tradenotes.trades order by opened_at desc limit 1"))[0] ?? null,
  }));
  const accountId = [scope.accountIds?.length === 1 ? scope.accountIds[0] : null, last?.account_id, accounts[0]?.id].find((id) => id && accounts.some((a) => a.id === id));
  if (!accountId) return { message: "Add a trading account first.", values };
  const fd = quickToFormData(values, { accountId, assetClass: inferAssetClass(symbol, prevTrade?.asset_class ?? null, profile?.primary_market ?? null) });
  const p = parseTradeForm(fd, accounts);
  if (!p.ok) {
    // Only the six fields exist on this form: map any other complaint (e.g. an unknown futures contract) onto a visible message.
    const six = new Set(["symbol", "side", "quantity", "entry_price", "exit_price", "stop_price"]);
    const errors: Record<string, string> = {};
    let other: string | undefined;
    for (const [k, v] of Object.entries(p.state.errors ?? {})) { const f = k === "exit1_price" ? "exit_price" : k; if (six.has(f)) errors[f] = v; else other ??= v; }
    return { errors, message: other ?? "Please fix the highlighted fields.", values };
  }
  try {
    const r = await insertNewTrade(db, user.id, plan, p);
    if ("limit" in r) return { message: `Your ${PLANS[plan].name} plan allows ${PLANS[plan].tradeLimit} trades. Upgrade to log more.`, values, code: "limit" };
    revalidatePath("/app", "layout");
    return { savedId: r.id, savedLabel: `${p.d.symbol} ${p.d.side}`, values: { symbol: values.symbol, side: values.side, quantity: values.quantity }, n: (prev.n ?? 0) + 1 };
  } catch (e) {
    console.error("quickLog failed", e instanceof Error ? e.message : e);
    return { message: "Could not save the trade. Nothing was saved. Please try again.", values };
  }
}
