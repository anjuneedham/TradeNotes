import { getAuth } from "@/lib/auth";
import { withUser } from "@/lib/db";
import { backtestCsv, type BacktestRow } from "@/lib/backtest";

export const dynamic = "force-dynamic";

/** CSV of the signed-in user's hypothetical trades only. Labelled in the first line, in every row and in the file name. Row-level security scopes the query. */
export async function GET(req: Request) {
  const session = await getAuth().api.getSession({ headers: req.headers });
  if (!session) return new Response("Not signed in", { status: 401 });
  const rows = await withUser(session.user.id, (q) => q<BacktestRow>("select * from tradenotes.backtest_trades order by opened_at, id"));
  return new Response("﻿" + backtestCsv(rows), { headers: {
    "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="tradenotes-HYPOTHETICAL-backtests-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store",
  } });
}
