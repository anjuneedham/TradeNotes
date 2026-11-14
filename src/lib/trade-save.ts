import type { Q } from "./db";
import type { getContext } from "./app-context";
import { tradeFormSchema, exitsOf, plannedRisk, defaultMultiplier, type TradeForm } from "./trade-schema";
import { canAddTrade } from "./entitlements";
import type { PlanId } from "./plans";

/**
 * Saving a real trade: validation, the SQL columns, and the "new trade" transaction. Shared by the full form (journal/actions.ts) and the phone
 * quick-log (app/quick/actions.ts) so both apply exactly the same rules. NOT a server-action file on purpose: nothing exported here is callable
 * from the browser; the two action files call it after getContext() has checked the session.
 */

/** `code: "limit"` marks a plan-limit refusal so the form can show an upgrade path instead of a generic error. */
export interface FormState { errors?: Record<string, string>; message?: string; values?: Record<string, string>; code?: "limit" }
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Accounts = Awaited<ReturnType<typeof getContext>>["accounts"];
export type Ok = { ok: true; d: TradeForm; fx: number; foreign: boolean; currency: string; closedAt: string | null };
export type Parsed = Ok | { ok: false; state: FormState };
type Db = <T>(fn: (q: Q) => Promise<T>) => Promise<T>;

/** Shared validation for create and update. */
export function parseTradeForm(formData: FormData, accounts: Accounts): Parsed {
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

export async function strategyId(q: Q, userId: string, name: string | undefined): Promise<string | null> {
  if (!name) return null;
  const [s] = await q<{ id: string }>(
    "insert into tradenotes.strategies (user_id, name) values ($1, $2) on conflict (user_id, name) do update set name = excluded.name returning id", [userId, name]);
  return s.id;
}

export function tradeColumns(p: Ok, stratId: string | null): [string, unknown][] {
  const { d, fx, foreign, currency, closedAt } = p;
  return [
    ["account_id", d.account_id], ["strategy_id", stratId], ["symbol", d.symbol], ["asset_class", d.asset_class], ["side", d.side],
    ["quantity", d.quantity], ["entry_price", d.entry_price], ["stop_price", d.stop_price ?? null], ["target_price", d.target_price ?? null],
    ["multiplier", d.multiplier ?? defaultMultiplier(d.asset_class, d.symbol)], ["fees", d.fees ?? 0], ["initial_risk", plannedRisk(d, fx)],
    ["currency", currency], ["fx_to_account", foreign ? fx : null], ["opened_at", new Date(d.opened_at).toISOString()], ["closed_at", closedAt],
    ["timeframe", d.timeframe ?? null], ["session", d.session ?? null], ["pre_trade_notes", d.pre_trade_notes ?? null],
    ["post_trade_notes", d.post_trade_notes ?? null], ["lessons", d.lessons ?? null], ["emotions", d.emotions], ["mistakes", d.mistakes],
    ["followed_plan", d.followed_plan ?? null], ["discipline_score", d.discipline_score ?? null],
  ];
}

export async function insertExits(q: Q, tradeId: string, userId: string, p: Ok) {
  for (const x of exitsOf(p.d)) {
    await q("insert into tradenotes.trade_exits (trade_id, user_id, quantity, price, exited_at) values ($1, $2, $3, $4, $5)", [tradeId, userId, x.quantity, x.price, p.closedAt]);
  }
}

/** Insert a new real trade and its exits in ONE transaction. Refuses, writing nothing, when the plan's trade limit is reached. */
export async function insertNewTrade(db: Db, userId: string, plan: PlanId, p: Ok): Promise<{ id: string } | { limit: true }> {
  return db(async (q) => {
    const [{ n }] = await q<{ n: number }>("select count(*)::int as n from tradenotes.trades");
    if (!canAddTrade(plan, n)) return { limit: true as const };
    const cols: [string, unknown][] = [["user_id", userId], ...tradeColumns(p, await strategyId(q, userId, p.d.strategy_name))];
    const [t] = await q<{ id: string }>(
      `insert into tradenotes.trades (${cols.map(([c]) => c).join(", ")}) values (${cols.map((_, i) => `$${i + 1}`).join(", ")}) returning id`,
      cols.map(([, v]) => v));
    await insertExits(q, t.id, userId, p);
    return { id: t.id };
  });
}
