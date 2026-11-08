import { z } from "zod";
import type { TradeInput } from "./metrics";

export const ASSET_CLASSES = ["forex", "futures", "stock", "option", "crypto", "other"] as const;
export const SESSIONS = ["Asia", "London", "London/NY overlap", "New York", "Other"] as const;
export const EMOTIONS = ["Calm", "Confident", "Anxious", "FOMO", "Greedy", "Frustrated", "Revenge", "Bored", "Hesitant"] as const;
export const MISTAKES = ["Entered early", "Entered late", "Moved stop", "No stop loss", "Oversized", "Revenge trade", "Broke rules", "Closed too early", "Held too long", "Chased price"] as const;

/** Default multiplier: forex quantity is in standard lots (1 lot = 100,000 units). */
export const defaultMultiplier = (a: string) => (a === "forex" ? 100000 : 1);

const blank = (v: unknown) => (v === "" || v === null || v === undefined ? undefined : v);
const optNum = (min = 0, strict = true) =>
  z.preprocess(blank, z.coerce.number().refine((n) => (strict ? n > min : n >= min), strict ? "Must be greater than 0" : "Must be 0 or more").optional());
const optText = z.preprocess(blank, z.string().trim().max(5000).optional());
const optDate = z.preprocess(blank, z.string().refine((s) => !isNaN(new Date(s).getTime()), "Invalid date").optional());

export const tradeFormSchema = z
  .object({
    account_id: z.string().uuid(),
    symbol: z.string().trim().min(1, "Instrument is required").max(24).transform((s) => s.toUpperCase().replace(/[\s/]/g, "")),
    asset_class: z.enum(ASSET_CLASSES),
    side: z.enum(["long", "short"]),
    quantity: z.coerce.number().gt(0, "Size must be greater than 0"),
    entry_price: z.coerce.number().gt(0, "Entry price must be greater than 0"),
    stop_price: optNum(),
    target_price: optNum(),
    exit1_qty: optNum(), exit1_price: optNum(),
    exit2_qty: optNum(), exit2_price: optNum(),
    fees: optNum(0, false),
    multiplier: optNum(),
    currency: z.preprocess(blank, z.string().trim().toUpperCase().length(3, "Use a 3-letter currency code").optional()),
    fx_to_account: optNum(),
    opened_at: z.string().refine((s) => !isNaN(new Date(s).getTime()), "Entry time is required"),
    closed_at: optDate,
    timeframe: optText,
    session: optText,
    strategy_name: z.preprocess(blank, z.string().trim().max(60).optional()),
    pre_trade_notes: optText,
    post_trade_notes: optText,
    lessons: optText,
    emotions: z.array(z.string().max(40)).max(12).default([]),
    mistakes: z.array(z.string().max(40)).max(12).default([]),
    followed_plan: z.preprocess((v) => (v === "yes" ? true : v === "no" ? false : undefined), z.boolean().optional()),
    discipline_score: z.preprocess(blank, z.coerce.number().int().min(1).max(5).optional()),
  })
  .superRefine((d, ctx) => {
    const add = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
    for (const n of ["1", "2"] as const) {
      const q = d[`exit${n}_qty` as "exit1_qty"], p = d[`exit${n}_price` as "exit1_price"];
      if ((q === undefined) !== (p === undefined) && !(n === "1" && p !== undefined && q === undefined)) add(`exit${n}_price`, "Enter both exit size and exit price");
    }
    if (d.exit2_price !== undefined && d.exit1_price === undefined) add("exit1_price", "Fill exit 1 before exit 2");
    const exited = exitsOf(d).reduce((s, e) => s + e.quantity, 0);
    if (exited - d.quantity > 1e-9) add("exit1_qty", "Exit sizes add up to more than the position size");
    if (exited > 0 && !d.closed_at) add("closed_at", "Add the exit time");
    if (d.closed_at && new Date(d.closed_at) < new Date(d.opened_at)) add("closed_at", "Exit time is before entry time");
    if (d.stop_price !== undefined) {
      const wrongSide = d.side === "long" ? d.stop_price >= d.entry_price : d.stop_price <= d.entry_price;
      if (wrongSide) add("stop_price", d.side === "long" ? "For a long, the stop must be below entry" : "For a short, the stop must be above entry");
    }
    if (d.target_price !== undefined) {
      const wrongSide = d.side === "long" ? d.target_price <= d.entry_price : d.target_price >= d.entry_price;
      if (wrongSide) add("target_price", d.side === "long" ? "For a long, the target must be above entry" : "For a short, the target must be below entry");
    }
  });
export type TradeForm = z.infer<typeof tradeFormSchema>;

/** Exit 1 with a price but no qty means "closed the whole position". */
export function exitsOf(d: Pick<TradeForm, "quantity" | "exit1_qty" | "exit1_price" | "exit2_qty" | "exit2_price">) {
  const out: { quantity: number; price: number }[] = [];
  if (d.exit1_price !== undefined) out.push({ quantity: d.exit1_qty ?? d.quantity, price: d.exit1_price });
  if (d.exit2_price !== undefined && d.exit2_qty !== undefined) out.push({ quantity: d.exit2_qty, price: d.exit2_price });
  return out;
}

/** Planned risk in ACCOUNT currency = |entry − stop| × size × multiplier × fx. Null when no stop or fx unknown. */
export function plannedRisk(d: Pick<TradeForm, "entry_price" | "stop_price" | "quantity" | "multiplier" | "asset_class">, fx: number | null): number | null {
  if (d.stop_price === undefined || fx === null) return null;
  const m = d.multiplier ?? defaultMultiplier(d.asset_class);
  return Math.round(Math.abs(d.entry_price - d.stop_price) * d.quantity * m * fx * 100) / 100;
}

export interface TradeRow {
  id: string; side: "long" | "short"; quantity: number | string; entry_price: number | string; fees: number | string;
  multiplier: number | string; initial_risk: number | string | null; currency: string | null; fx_to_account: number | string | null; closed_at: string | null;
}
export interface ExitRow { trade_id: string; quantity: number | string; price: number | string }

/** DB rows (numerics arrive as strings from PostgREST) -> metrics engine input. */
export function toTradeInputs(rows: TradeRow[], exits: ExitRow[], accountCurrency: string): TradeInput[] {
  const byTrade = new Map<string, { quantity: number; price: number }[]>();
  for (const e of exits) {
    const l = byTrade.get(e.trade_id) ?? [];
    l.push({ quantity: Number(e.quantity), price: Number(e.price) });
    byTrade.set(e.trade_id, l);
  }
  return rows.map((r) => ({
    id: r.id, side: r.side, quantity: Number(r.quantity), entryPrice: Number(r.entry_price),
    exits: byTrade.get(r.id) ?? [], fees: Number(r.fees), multiplier: Number(r.multiplier),
    initialRisk: r.initial_risk === null ? null : Number(r.initial_risk),
    sameCurrencyAsAccount: !r.currency || r.currency === accountCurrency,
    fxToAccount: r.fx_to_account === null ? null : Number(r.fx_to_account),
    closedAt: r.closed_at,
  }));
}
