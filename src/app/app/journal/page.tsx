import Link from "next/link";
import { getContext } from "@/lib/app-context";
import { evaluateTrade } from "@/lib/metrics";
import { toTradeInputs, type TradeRow, type ExitRow } from "@/lib/trade-schema";
import { deleteTrade } from "./actions";
import { Notice, Badge, PageHeader, EmptyState, inputCls, btnCls, btnGhostCls, linkCls } from "@/components/ui";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { signedMoney, signedR, pnlClass, dateTime, plain } from "@/lib/format";

export const metadata = { title: "Journal — TradeNotes" };
const PAGE = 25;
interface JournalRow extends TradeRow { symbol: string; opened_at: string; mistakes: string[] | null; strategy_name: string | null; exits: ExitRow[] }

export default async function Journal({ searchParams }: { searchParams: Promise<{ q?: string; side?: string; status?: string; page?: string; saved?: string; deleted?: string }> }) {
  const sp = await searchParams;
  const { db, accounts } = await getContext();
  const page = Math.max(1, Number(sp.page) || 1);
  const search = (sp.q ?? "").replace(/[^A-Za-z0-9._-]/g, "").toUpperCase() || null;
  const side = sp.side === "long" || sp.side === "short" ? sp.side : null;
  const status = sp.status === "open" || sp.status === "closed" ? sp.status : null;
  // "Open" matches the metrics engine: exited quantity is less than the position size (so partial exits count as open).
  const exited = "coalesce((select sum(e.quantity) from tradenotes.trade_exits e where e.trade_id = t.id), 0)";
  const where = `where ($1::text is null or t.symbol ilike '%' || $1 || '%') and ($2::text is null or t.side = $2)
    and ($3::text is null or ($3 = 'open' and ${exited} < t.quantity) or ($3 = 'closed' and ${exited} >= t.quantity))`;
  const { rows, count } = await db(async (q) => ({
    rows: await q<JournalRow>(
      `select t.id, t.symbol, t.side, t.quantity, t.entry_price, t.fees, t.multiplier, t.initial_risk, t.currency, t.fx_to_account, t.closed_at, t.opened_at, t.mistakes, s.name as strategy_name,
         coalesce((select json_agg(json_build_object('trade_id', e.trade_id, 'quantity', e.quantity, 'price', e.price)) from tradenotes.trade_exits e where e.trade_id = t.id), '[]'::json) as exits
       from tradenotes.trades t left join tradenotes.strategies s on s.id = t.strategy_id ${where} order by t.opened_at desc limit $4 offset $5`,
      [search, side, status, PAGE, (page - 1) * PAGE]),
    count: (await q<{ n: number }>(`select count(*)::int as n from tradenotes.trades t ${where}`, [search, side, status]))[0].n,
  }));
  const cur = accounts[0]?.currency ?? "USD";
  const inputs = toTradeInputs(rows, rows.flatMap((r) => r.exits), cur);
  const results = new Map(inputs.map((t) => [t.id, evaluateTrade(t)]));
  const pages = Math.max(1, Math.ceil(count / PAGE));
  const filtered = Boolean(sp.q || side || status);
  const link = (p: number) => `/app/journal?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), ...(side ? { side } : {}), ...(status ? { status } : {}), page: String(p) })}`;

  const view = rows.map((r) => {
    const res = results.get(r.id);
    const closed = res && typeof res !== "string" ? res : null;
    return { r, closed, pnlText: closed ? signedMoney(closed.netPnl, cur) : res === "missing_fx" ? "Needs FX rate" : "Open", pnlCls: closed ? pnlClass(closed.netPnl) : "text-muted" };
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Journal" sub={count > 0 ? `${count.toLocaleString("en-US")} trade${count === 1 ? "" : "s"}${filtered ? " match your filters" : ""} · newest first` : undefined}>
        <Link href="/app/journal/new" className={`${btnCls} hidden md:inline-flex`}>+ Log trade</Link>
      </PageHeader>
      {sp.saved && <Notice kind="ok">Trade saved.</Notice>}
      {sp.deleted && <Notice kind="ok">Trade deleted.</Notice>}

      <form className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap" role="search" aria-label="Filter trades">
        <label className="col-span-2 sm:w-52"><span className="sr-only">Search instrument</span><input name="q" defaultValue={sp.q} placeholder="Search instrument…" className={inputCls} /></label>
        <label className="sm:w-40"><span className="sr-only">Direction</span><select name="side" defaultValue={side ?? ""} className={inputCls}><option value="">All directions</option><option value="long">Long</option><option value="short">Short</option></select></label>
        <label className="sm:w-40"><span className="sr-only">Status</span><select name="status" defaultValue={status ?? ""} className={inputCls}><option value="">Open &amp; closed</option><option value="open">Open</option><option value="closed">Closed</option></select></label>
        <button className={`${btnGhostCls} ${filtered ? "" : "col-span-2"}`}>Filter</button>
        {filtered && <Link href="/app/journal" className={`${btnGhostCls} border-transparent text-muted`}>Clear</Link>}
      </form>

      {rows.length === 0 ? (
        <EmptyState title={filtered ? "No trades match those filters." : "No trades yet"}
          action={filtered ? <Link href="/app/journal" className={btnGhostCls}>Clear filters</Link> : <Link href="/app/journal/new" className={btnCls}>Log your first trade</Link>}>
          {filtered ? "Try a different instrument, direction or status." : "Your journal is where patterns start to show. Log your most recent trade — it takes about a minute."}
        </EmptyState>
      ) : (<>
        {/* Mobile and tablet: one card per trade */}
        <ul className="space-y-2 lg:hidden">
          {view.map(({ r, closed, pnlText, pnlCls }) => (
            <li key={r.id}>
              <Link href={`/app/journal/${r.id}`} className="block rounded-lg border border-border bg-panel p-3.5 active:bg-raised">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-medium"><span className="truncate">{r.symbol}</span><Badge>{r.side}</Badge></p>
                    <p className="mt-1 text-xs text-muted">{dateTime(r.opened_at)} UTC · {plain(r.quantity)}{r.strategy_name ? ` · ${r.strategy_name}` : ""}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`fig ${pnlCls}`}>{pnlText}</p>
                    {closed && closed.r !== null && <p className="fig mt-1 text-xs text-muted">{signedR(closed.r)}</p>}
                  </div>
                </div>
                {(r.mistakes ?? []).length > 0 && <p className="mt-2 truncate text-xs text-warn">{(r.mistakes ?? []).join(" · ")}</p>}
              </Link>
            </li>
          ))}
        </ul>

        {/* Desktop: table */}
        <div className="relative hidden overflow-x-auto rounded-lg border border-border lg:block">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-panel text-left text-xs text-muted"><tr>
              <th scope="col" className="px-4 py-2.5 font-normal">Opened (UTC)</th><th scope="col" className="font-normal">Instrument</th><th scope="col" className="font-normal">Side</th>
              <th scope="col" className="pr-4 text-right font-normal">Size</th><th scope="col" className="pr-4 text-right font-normal">Net P&amp;L</th><th scope="col" className="pr-4 text-right font-normal">R</th>
              <th scope="col" className="font-normal">Mistakes</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {view.map(({ r, closed, pnlText, pnlCls }) => (
                <tr key={r.id} className="border-t border-border hover:bg-panel">
                  <td className="fig whitespace-nowrap px-4 py-3 text-muted">{dateTime(r.opened_at)}</td>
                  <td><Link href={`/app/journal/${r.id}`} className="font-medium hover:underline">{r.symbol}</Link>{r.strategy_name && <span className="block max-w-44 truncate text-xs text-muted">{r.strategy_name}</span>}</td>
                  <td><Badge>{r.side}</Badge></td>
                  <td className="fig pr-4 text-right">{plain(r.quantity)}</td>
                  <td className={`fig pr-4 text-right ${pnlCls}`}>{pnlText}</td>
                  <td className="fig pr-4 text-right">{closed && closed.r !== null ? closed.r.toFixed(2) : "—"}</td>
                  <td className="max-w-44 truncate text-xs text-muted" title={(r.mistakes ?? []).join(", ")}>{(r.mistakes ?? []).join(", ")}</td>
                  <td className="whitespace-nowrap px-3 text-right">
                    <form action={deleteTrade} className="inline-flex items-center gap-1">
                      <Link href={`/app/journal/${r.id}`} className={`px-2 py-1.5 text-xs ${linkCls}`}>View</Link>
                      <input type="hidden" name="id" value={r.id} /><ConfirmDelete compact label={`${r.symbol} trade`} />
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>)}

      {pages > 1 && (
        <nav aria-label="Pages" className="flex items-center justify-between text-sm">
          {page > 1 ? <Link href={link(page - 1)} className={btnGhostCls}>← Newer</Link> : <span />}
          <span className="text-muted">Page {page} of {pages}</span>
          {page < pages ? <Link href={link(page + 1)} className={btnGhostCls}>Older →</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
