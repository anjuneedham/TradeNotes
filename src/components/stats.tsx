import Link from "next/link";
import type { Summary } from "@/lib/metrics";
import { signedMoney, pct, num, pnlClass } from "@/lib/format";
import { Card } from "./ui";

/** One headline figure. `hint` + "Learn more" show only when the user keeps explanations on. */
export function Stat({ label, value, hint, slug, cls = "", show }: { label: string; value: string; hint?: string; slug?: string; cls?: string; show: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-panel p-3.5 sm:p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={`fig mt-1.5 text-xl font-medium sm:text-2xl ${cls}`}>{value}</p>
      {show && hint && (
        <p className="mt-2 text-xs leading-snug text-muted">{hint}{slug && <> <Link href={`/learn#${slug}`} className="underline underline-offset-2 hover:text-fg">Learn more</Link></>}</p>
      )}
    </div>
  );
}

/** Group comparison: sorted by net P&L, with a bar scaled to the largest absolute result in the table. */
export function Breakdown({ title, note, groups, cur, id, limit, keepOrder }: { title: string; note?: string; groups: Record<string, Summary>; cur: string; id?: string; limit?: number; keepOrder?: boolean }) {
  let entries = Object.entries(groups).filter(([, s]) => s.tradeCount > 0);
  if (!keepOrder) entries = entries.sort((a, b) => b[1].netPnl - a[1].netPnl);
  if (!entries.length) return null;
  const total = entries.length;
  if (limit && entries.length > limit) entries = entries.slice(0, limit);
  const maxAbs = Math.max(...entries.map(([, s]) => Math.abs(s.netPnl)), 1e-9);
  return (
    <Card id={id} className="scroll-mt-20">
      <h3 className="text-sm font-medium">{title}</h3>
      {note && <p className="mt-0.5 text-xs text-muted">{note}</p>}
      <div className="relative mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted">
            <tr><th scope="col" className="pb-1.5 font-normal">Group</th><th scope="col" className="pb-1.5 text-right font-normal">Trades</th><th scope="col" className="pb-1.5 text-right font-normal">Win rate</th><th scope="col" className="hidden pb-1.5 text-right font-normal sm:table-cell">Avg R</th><th scope="col" className="pb-1.5 text-right font-normal">Net P&amp;L</th></tr>
          </thead>
          <tbody>{entries.map(([k, s]) => (
            <tr key={k} className="border-t border-border">
              <th scope="row" className="max-w-0 w-[42%] py-2 pr-3 text-left font-normal">
                <span className="block truncate">{k}</span>
                <span aria-hidden="true" className="mt-1 block h-1 rounded-full bg-raised"><span className={`block h-1 rounded-full ${s.netPnl >= 0 ? "bg-win" : "bg-loss"}`} style={{ width: `${Math.max((Math.abs(s.netPnl) / maxAbs) * 100, 2)}%` }} /></span>
              </th>
              <td className="fig py-2 text-right">{s.tradeCount}{s.smallSample && <span title="Fewer than 30 trades — treat with caution" className="text-muted">*</span>}</td>
              <td className="fig py-2 text-right">{pct(s.winRate)}</td>
              <td className="fig hidden py-2 text-right sm:table-cell">{s.avgR === null ? "—" : num(s.avgR)}</td>
              <td className={`fig py-2 text-right ${pnlClass(s.netPnl)}`}>{signedMoney(s.netPnl, cur)}</td>
            </tr>))}</tbody>
        </table>
      </div>
      {limit && total > limit && <p className="mt-2 text-xs text-muted">Showing the top {limit} of {total}.</p>}
    </Card>
  );
}
