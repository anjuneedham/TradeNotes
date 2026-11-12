"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getContext } from "@/lib/app-context";
import { tradeFormSchema, exitsOf, plannedRisk, defaultMultiplier, type TradeForm } from "@/lib/trade-schema";
import { canAddTrade } from "@/lib/entitlements";
import { PLANS } from "@/lib/plans";
import type { Q } from "@/lib/db";

/** `code: "limit"` marks a plan-limit refusal so the form can show an upgrade path instead of a generic error. */
export interface FormState { errors?: Record<string, string>; message?: string; values?: Record<string, string>; code?: "limit" }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Accounts = Awaited<ReturnType<typeof getContext>>["accounts"];
type Ok = { ok: true; d: TradeForm; fx: number; foreign: boolean; currency: string; closedAt: string | null };
type Parsed = Ok | { ok: false; state: FormState };

/** Shared validation for create and update. */
function parse(formData: FormData, accounts: Accounts): Parsed {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const parsed = tradeFormSchema.safeParse({ ...raw, emotions: formData.getAll("emotions"), mistakes: formData.getAll("mistakes") });
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { ok: false, state: { errors, message: "Please fix the highlighted fields.", values: raw } };
  }
  const d = parsed.data;
  const account = accounts.find((a) => a.id === d.account_id);
  if (!account) return { ok: false, state: { message: "Account not found.", values: raw } };
  const currency = d.currency ?? account.currency;
  const foreign = currency !== account.currency;
  if (foreign && d.fx_to_account === undefined) {
    return { ok: false, state: { errors: { fx_to_account: `Enter the rate to convert ${currency} into ${account.currency}` }, message: "Please fix the highlighted fields.", values: raw } };
  }
  const closedAt = exitsOf(d).length && d.closed_at ? new Date(d.closed_at).toISOString() : null;
  return { ok: true, d, fx: foreign ? d.fx_to_account! : 1, foreign, currency, closedAt };
}

async function strategyId(q: Q, userId: string, name: string | undefined): Promise<string | null> {
  if (!name) return null;
  const [s] = await q<{ id: string }>(
    "insert into tradenotes.strategies (user_id, name) values ($1, $2) on conflict (user_id, name) do update set name = excluded.name returning id", [userId, name]);
  return s.id;
}

function columns(p: Ok, stratId: string | null): [string, unknown][] {
  const { d, fx, foreign, currency, closedAt } = p;
  return [
    ["account_id", d.account_id], ["strategy_id", stratId], ["symbol", d.symbol], ["asset_class", d.asset_class], ["side", d.side],
    ["quantity", d.quantity], ["entry_price", d.entry_price], ["stop_price", d.stop_price ?? null], ["target_price", d.target_price ?? null],
    ["multiplier", d.multiplier ?? defaultMultiplier(d.asset_class)], ["fees", d.fees ?? 0], ["initial_risk", plannedRisk(d, fx)],
    ["currency", currency], ["fx_to_account", foreign ? fx : null], ["opened_at", new Date(d.opened_at).toISOString()], ["closed_at", closedAt],
    ["timeframe", d.timeframe ?? null], ["session", d.session ?? null], ["pre_trade_notes", d.pre_trade_notes ?? null],
    ["post_trade_notes", d.post_trade_notes ?? null], ["lessons", d.lessons ?? null], ["emotions", d.emotions], ["mistakes", d.mistakes],
    ["followed_plan", d.followed_plan ?? null], ["discipline_score", d.discipline_score ?? null],
  ];
}

async function insertExits(q: Q, tradeId: string, userId: string, p: Ok) {
  for (const x of exitsOf(p.d)) {
    await q("insert into tradenotes.trade_exits (trade_id, user_id, quantity, price, exited_at) values ($1, $2, $3, $4, $5)", [tradeId, userId, x.quantity, x.price, p.closedAt]);
  }
}

export async function createTrade(_prev: FormState, formData: FormData): Promise<FormState> {
  const { db, user, accounts, plan } = await getContext();
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const p = parse(formData, accounts);
  if (!p.ok) return p.state;
  try {
    // One transaction: plan-limit check, strategy upsert, trade, exits. Any failure rolls everything back.
    const result = await db(async (q) => {
      const [{ n }] = await q<{ n: number }>("select count(*)::int as n from tradenotes.trades");
      if (!canAddTrade(plan, n)) return { limit: true as const };
      const cols: [string, unknown][] = [["user_id", user.id], ...columns(p, await strategyId(q, user.id, p.d.strategy_name))];
      const [t] = await q<{ id: string }>(
        `insert into tradenotes.trades (${cols.map(([c]) => c).join(", ")}) values (${cols.map((_, i) => `$${i + 1}`).join(", ")}) returning id`,
        cols.map(([, v]) => v));
      await insertExits(q, t.id, user.id, p);
      return { limit: false as const };
    });
    if (result.limit) return { message: `Your ${PLANS[plan].name} plan allows ${PLANS[plan].tradeLimit} trades. Upgrade to log more.`, values: raw, code: "limit" };
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
  const p = parse(formData, accounts);
  if (!p.ok) return p.state;
  let found = false;
  try {
    found = await db(async (q) => {
      const cols: [string, unknown][] = [...columns(p, await strategyId(q, user.id, p.d.strategy_name)), ["updated_at", new Date().toISOString()]];
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
  if (UUID.test(id)) await db((q) => q("delete from tradenotes.trades where id = $1", [id])); // RLS: only own rows match
  revalidatePath("/app", "layout");
  redirect("/app/journal?deleted=1");
}
