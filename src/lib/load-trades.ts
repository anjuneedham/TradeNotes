import type { Q } from "./db";
import { toTradeInputs, type TradeRow, type ExitRow } from "./trade-schema";
import type { JournalTrade } from "./analytics";

interface Row extends TradeRow {
  symbol: string; session: string | null; strategy_name: string | null; opened_at: string;
  emotions: string[] | null; mistakes: string[] | null; followed_plan: boolean | null; discipline_score: number | null; exits: ExitRow[];
}
export const TRADE_LIMIT = 10000;

/** Loads the signed-in user's trades (RLS-scoped) with journal context, oldest first. */
export async function loadJournalTrades(db: <T>(fn: (q: Q) => Promise<T>) => Promise<T>, cur: string): Promise<{ trades: JournalTrade[]; truncated: boolean }> {
  const rows = await db((q) => q<Row>(
    `select t.id, t.side, t.quantity, t.entry_price, t.fees, t.multiplier, t.initial_risk, t.currency, t.fx_to_account, t.closed_at, t.opened_at,
       t.symbol, t.session, t.emotions, t.mistakes, t.followed_plan, t.discipline_score, s.name as strategy_name,
       coalesce((select json_agg(json_build_object('trade_id', e.trade_id, 'quantity', e.quantity, 'price', e.price)) from tradenotes.trade_exits e where e.trade_id = t.id), '[]'::json) as exits
     from tradenotes.trades t left join tradenotes.strategies s on s.id = t.strategy_id order by t.opened_at limit ${TRADE_LIMIT + 1}`));
  const truncated = rows.length > TRADE_LIMIT;
  const used = truncated ? rows.slice(0, TRADE_LIMIT) : rows;
  const inputs = toTradeInputs(used, used.flatMap((r) => r.exits), cur);
  return {
    truncated,
    trades: inputs.map((t, i) => ({
      ...t, symbol: used[i].symbol, session: used[i].session, strategy: used[i].strategy_name, openedAt: used[i].opened_at,
      emotions: used[i].emotions ?? [], mistakes: used[i].mistakes ?? [], followedPlan: used[i].followed_plan, discipline: used[i].discipline_score,
    })),
  };
}
