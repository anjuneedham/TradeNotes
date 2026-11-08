import Link from "next/link";
import { getContext } from "@/lib/app-context";
import { evaluateTrade } from "@/lib/metrics";
import { toTradeInputs } from "@/lib/trade-schema";
import { deleteTrade } from "./actions";
import { Card, Notice, inputCls, btnCls, btnGhostCls } from "@/components/ui";
import { money, pnlClass, num } from "@/lib/format";

export const metadata = { title: "Journal — TradeNotes" };
const PAGE = 25;

export default async function Journal({ searchParams }: { searchParams: Promise<{ q?: string; side?: string; page?: string; saved?: string; deleted?: string }> }) {
  const sp = await searchParams;
  const { supabase, accounts } = await getContext();
  const page = Math.max(1, Number(sp.page) || 1);
  let query = supabase.from("trades")
    .select("id,symbol,side,quantity,entry_price,fees,multiplier,initial_risk,currency,fx_to_account,closed_at,opened_at,mistakes,trade_exits(trade_id,quantity,price)", { count: "exact" })
    .order("opened_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
  if (sp.q) query = query.ilike("symbol", `%${sp.q.replace(/[%_,]/g, "").toUpperCase()}%`);
  if (sp.side === "long" || sp.side === "short") query = query.eq("side", sp.side);
  const { data: rows, count } = await query;
  const cur = accounts[0]?.currency ?? "USD";
  const exits = (rows ?? []).flatMap((r) => r.trade_exits ?? []);
  const inputs = toTradeInputs(rows ?? [], exits, cur);
  const results = new Map(inputs.map((t) => [t.id, evaluateTrade(t)]));
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));
  const link = (p: number) => `/app/journal?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), ...(sp.side ? { side: sp.side } : {}), page: String(p) })}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-semibold">Journal</h1><Link href="/app/journal/new" className={btnCls}>+ Log trade</Link></div>
      {sp.saved && <Notice kind="ok">Trade saved.</Notice>}
      {sp.deleted && <Notice kind="ok">Trade deleted.</Notice>}
      <form className="flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Search instrument…" className={`${inputCls} max-w-48`} />
        <select name="side" defaultValue={sp.side ?? ""} className={`${inputCls} max-w-36`}><option value="">All directions</option><option value="long">Long</option><option value="short">Short</option></select>
        <button className={btnGhostCls}>Filter</button>
      </form>
      {(rows ?? []).length === 0 ? (
        <Card className="text-center">
          <p className="font-medium">{sp.q || sp.side ? "No trades match those filters." : "No trades yet"}</p>
          <p className="mt-1 text-sm text-muted">Your journal is where patterns start to show. Log your most recent trade — it takes about a minute.</p>
          <Link href="/app/journal/new" className={`${btnCls} mt-4 inline-block`}>Log your first trade</Link>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-panel text-left text-xs text-muted"><tr>
              <th className="p-3">Date</th><th>Instrument</th><th>Side</th><th>Size</th><th>Net P&amp;L</th><th>R</th><th>Mistakes</th><th /></tr></thead>
            <tbody>
              {(rows ?? []).map((r) => {
                const res = results.get(r.id);
                const closed = res && typeof res !== "string";
                return (
                  <tr key={r.id} className="border-t border-border">
                    <td className="p-3 whitespace-nowrap">{new Date(r.opened_at).toISOString().slice(0, 16).replace("T", " ")}</td>
                    <td className="font-medium">{r.symbol}</td>
                    <td className="capitalize">{r.side}</td>
                    <td>{Number(r.quantity)}</td>
                    <td className={closed ? pnlClass(res.netPnl) : "text-muted"}>
                      {closed ? money(res.netPnl, cur) : res === "missing_fx" ? "Needs FX rate" : "Open"}
                    </td>
                    <td>{closed ? num(res.r) : "—"}</td>
                    <td className="max-w-40 truncate text-xs text-muted">{(r.mistakes ?? []).join(", ")}</td>
                    <td className="p-3 text-right">
                      <form action={deleteTrade}><input type="hidden" name="id" value={r.id} /><button className="text-xs text-muted hover:text-loss" aria-label={`Delete ${r.symbol} trade`}>Delete</button></form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          {page > 1 ? <Link href={link(page - 1)} className={btnGhostCls}>← Newer</Link> : <span />}
          <span className="text-muted">Page {page} of {pages}</span>
          {page < pages ? <Link href={link(page + 1)} className={btnGhostCls}>Older →</Link> : <span />}
        </div>
      )}
    </div>
  );
}
