import Link from "next/link";
import { getContext } from "@/lib/app-context";
import { PLANS } from "@/lib/plans";
import { ImportForm } from "@/components/ImportForm";
import { rollbackImport } from "./actions";
import { Card, Notice, PageHeader, btnCls, linkCls } from "@/components/ui";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { shortDate } from "@/lib/format";

export const metadata = { title: "Import trades — TradeNotes" };
interface Imp { id: string; file_name: string | null; rows_total: number; rows_imported: number; rows_skipped_duplicate: number; rows_failed: number; created_at: string; trades: number }

export default async function ImportPage({ searchParams }: { searchParams: Promise<{ done?: string; rolledback?: string }> }) {
  const { db, accounts, profile, plan } = await getContext();
  const { done, rolledback } = await searchParams;
  const allowed = PLANS[plan].csvImport;
  const { used, imports } = await db(async (q) => ({
    used: (await q<{ n: number }>("select count(*)::int as n from tradenotes.trades"))[0].n,
    imports: await q<Imp>(`select i.*, (select count(*)::int from tradenotes.trades t where t.import_id = i.id) as trades
      from tradenotes.imports i where i.status = 'completed' order by i.created_at desc limit 20`),
  }));
  const limit = PLANS[plan].tradeLimit;
  const last = done ? imports.find((i) => i.id === done) : undefined;
  const market = profile?.primary_market === "stocks" ? "stock" : profile?.primary_market === "options" ? "option" : profile?.primary_market === "futures" ? "future" : profile?.primary_market ?? "forex";

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Import trades" sub={<><Link href="/app/journal" className={linkCls}>Journal</Link> / Import from CSV</>} />
      {last && <Notice kind="ok">Imported {last.rows_imported.toLocaleString("en-US")} trade{last.rows_imported === 1 ? "" : "s"}{last.rows_skipped_duplicate ? `, skipped ${last.rows_skipped_duplicate} duplicate${last.rows_skipped_duplicate === 1 ? "" : "s"}` : ""}{last.rows_failed ? `, ${last.rows_failed} row${last.rows_failed === 1 ? "" : "s"} had problems` : ""}. <Link href="/app/journal" className={linkCls}>View journal</Link></Notice>}
      {rolledback && <Notice kind="ok">Import rolled back. Those trades were removed.</Notice>}

      {!allowed ? (
        <Notice kind="warn">
          <p className="font-medium">CSV import is part of {PLANS.starter.name} and {PLANS.pro.name}</p>
          <p className="mt-1">Bring your history in from a broker export instead of typing it. On Free you can keep logging trades by hand (up to {PLANS.free.tradeLimit}).</p>
          <Link href="/app/billing?plan=starter" className={`${btnCls} mt-3`}>See plans</Link>
        </Notice>
      ) : (
        <ImportForm accounts={accounts} defaultAsset={market} room={limit === null ? null : Math.max(0, limit - used)} />
      )}

      {imports.length > 0 && (
        <Card>
          <h2 className="font-medium">Previous imports</h2>
          <ul className="mt-3 divide-y divide-border text-sm">
            {imports.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <span><span className="font-medium">{i.file_name ?? "CSV import"}</span><span className="text-muted"> · {shortDate(i.created_at)} · {i.trades.toLocaleString("en-US")} trade{i.trades === 1 ? "" : "s"} still in journal</span></span>
                <form action={rollbackImport}><input type="hidden" name="id" value={i.id} /><ConfirmDelete label={`import ${i.file_name ?? ""}`} /></form>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">Deleting an import removes every trade it added (including any you edited since).</p>
        </Card>
      )}
    </div>
  );
}
