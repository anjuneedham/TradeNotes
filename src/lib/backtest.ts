import { summarize, evaluateTrade, type TradeInput, type Summary, type TradeResult } from "./metrics";
import { csvCell } from "./csv-out";
import { defaultMultiplier, exitsOf, plannedRisk, type BacktestForm } from "./trade-schema";

/**
 * Manual backtest log. Hypothetical trades are typed in by hand and live in their own table (tradenotes.backtest_trades). They are NEVER
 * read by the dashboard, analytics, calendar, reviews, comparison, share links or the real-trades CSV export, and real trades are never
 * read here. Statistics use the same engine (metrics.ts) so a number means the same thing in both places.
 *
 * Money convention: price x size x multiplier exactly as entered, with no currency conversion (a hypothetical trade has no account and no FX
 * rate). Pages show it in the user's account currency purely as a label.
 */
export const HYPOTHETICAL = "HYPOTHETICAL: not real trades";
export const HYPOTHETICAL_DETAIL = "These are simulated entries you typed in. They were never placed, filled or paid. They are kept apart from your journal and are not part of any dashboard, analytics, calendar, share link or report.";
export const MAX_BACKTESTS = 2000;
export const MAX_BACKTEST_EXITS = 10;

export interface BacktestRow {
  id: string; symbol: string; asset_class: string | null; side: "long" | "short";
  quantity: string | number; entry_price: string | number; stop_price: string | number | null; target_price: string | number | null;
  multiplier: string | number; fees: string | number; initial_risk: string | number | null;
  opened_at: string; closed_at: string | null; exits: { quantity: number; price: number }[];
  strategy: string | null; timeframe: string | null; session: string | null;
  pre_trade_notes: string | null; post_trade_notes: string | null; lessons: string | null;
}

export function backtestInput(r: BacktestRow): TradeInput {
  return {
    id: r.id, side: r.side, quantity: Number(r.quantity), entryPrice: Number(r.entry_price),
    exits: (r.exits ?? []).map((e) => ({ quantity: Number(e.quantity), price: Number(e.price) })),
    fees: Number(r.fees), multiplier: Number(r.multiplier),
    initialRisk: r.initial_risk === null ? null : Number(r.initial_risk),
    sameCurrencyAsAccount: true, closedAt: r.closed_at,
  };
}
export const summarizeBacktests = (rows: readonly BacktestRow[]): Summary => summarize(rows.map(backtestInput));
/** Per-trade result, or why it is not counted (open / partly closed). */
export const backtestResult = (r: BacktestRow): TradeResult | "open_or_partial" | "missing_fx" | "invalid" => evaluateTrade(backtestInput(r));

/** The database columns for a validated form, in a fixed order. The account fields of a real trade do not exist here. */
export function backtestColumns(d: BacktestForm): [string, unknown][] {
  const exits = exitsOf(d).slice(0, MAX_BACKTEST_EXITS);
  return [
    ["symbol", d.symbol], ["asset_class", d.asset_class], ["side", d.side], ["quantity", d.quantity], ["entry_price", d.entry_price],
    ["stop_price", d.stop_price ?? null], ["target_price", d.target_price ?? null],
    ["multiplier", d.multiplier ?? defaultMultiplier(d.asset_class, d.symbol)], ["fees", d.fees ?? 0], ["initial_risk", plannedRisk(d, 1)],
    ["opened_at", new Date(d.opened_at).toISOString()], ["closed_at", exits.length && d.closed_at ? new Date(d.closed_at).toISOString() : null],
    ["exits", JSON.stringify(exits)],
    ["strategy", d.strategy_name ?? null], ["timeframe", d.timeframe ?? null], ["session", d.session ?? null],
    ["pre_trade_notes", d.pre_trade_notes ?? null], ["post_trade_notes", d.post_trade_notes ?? null], ["lessons", d.lessons ?? null],
  ];
}

const EXPORT_COLS = ["record_type", "opened_at", "closed_at", "symbol", "asset_class", "side", "quantity", "entry_price", "stop_price", "target_price", "exits", "fees", "multiplier",
  "initial_risk", "net_result", "r_multiple", "strategy", "timeframe", "session", "pre_trade_notes", "post_trade_notes", "lessons", "id"] as const;

/**
 * CSV of hypothetical trades. The label is on the first line, in a `record_type` column on every row, and in the file name, so a
 * hypothetical row cannot be mistaken for (or imported as) a real trade.
 */
export function backtestCsv(rows: readonly BacktestRow[]): string {
  const lines = [csvCell(`${HYPOTHETICAL}. Simulated entries; not executed orders.`), EXPORT_COLS.join(",")];
  for (const r of rows) {
    const res = backtestResult(r);
    const counted = typeof res !== "string" ? res : null;
    const rec: Record<string, unknown> = {
      record_type: HYPOTHETICAL, opened_at: r.opened_at, closed_at: r.closed_at, symbol: r.symbol, asset_class: r.asset_class, side: r.side, quantity: r.quantity,
      entry_price: r.entry_price, stop_price: r.stop_price, target_price: r.target_price, exits: (r.exits ?? []).map((e) => `${e.quantity} @ ${e.price}`).join(" | "),
      fees: r.fees, multiplier: r.multiplier, initial_risk: r.initial_risk, net_result: counted ? counted.netPnl : "", r_multiple: counted?.r ?? "",
      strategy: r.strategy, timeframe: r.timeframe, session: r.session, pre_trade_notes: r.pre_trade_notes, post_trade_notes: r.post_trade_notes, lessons: r.lessons, id: r.id,
    };
    lines.push(EXPORT_COLS.map((c) => csvCell(rec[c])).join(","));
  }
  return lines.join("\r\n");
}
