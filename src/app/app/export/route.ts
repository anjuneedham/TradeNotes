import { getAuth } from "@/lib/auth";
import { withUser } from "@/lib/db";

export const dynamic = "force-dynamic";

const cell = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  let s = Array.isArray(v) ? v.join("; ") : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // neutralise spreadsheet formula injection
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV export of the signed-in user's own trades (one row per trade, exits flattened). Row-level security scopes every query. */
export async function GET(req: Request) {
  const session = await getAuth().api.getSession({ headers: req.headers });
  if (!session) return new Response("Not signed in", { status: 401 });
  const rows = await withUser(session.user.id, (q) => q(
    `select t.opened_at, t.closed_at, a.name as account, t.symbol, t.asset_class, t.side, t.quantity, t.entry_price, t.stop_price, t.target_price,
       (select string_agg(e.quantity::text || ' @ ' || e.price::text, ' | ' order by e.exited_at nulls last, e.id) from tradenotes.trade_exits e where e.trade_id = t.id) as exits,
       t.fees, t.multiplier, t.currency, t.fx_to_account, t.initial_risk, s.name as strategy, t.timeframe, t.session,
       t.pre_trade_notes, t.post_trade_notes, t.lessons, t.emotions, t.mistakes, t.followed_plan, t.discipline_score, t.id
     from tradenotes.trades t join tradenotes.accounts a on a.id = t.account_id left join tradenotes.strategies s on s.id = t.strategy_id
     order by t.opened_at`));
  const cols = ["opened_at", "closed_at", "account", "symbol", "asset_class", "side", "quantity", "entry_price", "stop_price", "target_price", "exits", "fees", "multiplier",
    "currency", "fx_to_account", "initial_risk", "strategy", "timeframe", "session", "pre_trade_notes", "post_trade_notes", "lessons", "emotions", "mistakes", "followed_plan", "discipline_score", "id"];
  const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => cell((r as Record<string, unknown>)[c])).join(","))].join("\r\n");
  return new Response("﻿" + csv, { headers: {
    "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="tradenotes-trades-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store",
  } });
}
