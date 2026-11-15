import Link from "next/link";
import { monthGrid } from "@/lib/analytics";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/** Month P&L calendar heatmap with weekly totals (UTC days by close time). */
export default function PnlCalendar({ days, year, month, cur, nav }: { days: Record<string, { pnl: number; trades: number; wins: number }>; year: number; month: number; cur: string; nav?: { prev: string; next: string } }) {
  const weeks = monthGrid(year, month);
  const vals = Object.entries(days).filter(([d]) => d.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`)).map(([, v]) => Math.abs(v.pnl));
  const max = Math.max(...vals, 1);
  const f = (v: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: cur, notation: Math.abs(v) >= 10000 ? "compact" : "standard", maximumFractionDigits: 0 }).format(v);
  const monthTotal = Object.entries(days).filter(([d]) => d.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`)).reduce((s, [, v]) => s + v.pnl, 0);
  const label = new Date(Date.UTC(year, month, 1)).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {nav && <Link href={nav.prev} className="rounded-md border border-border px-2 py-0.5 text-sm hover:border-accent/50" aria-label="Previous month">‹</Link>}
          <span className="font-semibold">{label}</span>
          {nav && <Link href={nav.next} className="rounded-md border border-border px-2 py-0.5 text-sm hover:border-accent/50" aria-label="Next month">›</Link>}
        </div>
        <span className={`text-sm font-semibold ${monthTotal > 0 ? "text-win" : monthTotal < 0 ? "text-loss" : "text-muted"}`}>{f(monthTotal)}</span>
      </div>
      <div className="grid grid-cols-[repeat(7,minmax(0,1fr))_minmax(0,1.1fr)] gap-1 text-[11px]">
        {DOW.map((d) => <div key={d} className="pb-1 text-center text-muted">{d}</div>)}
        <div className="pb-1 text-center text-muted">Week</div>
        {weeks.map((w, wi) => {
          const wk = w.reduce((s, d) => s + (d && days[d] ? days[d].pnl : 0), 0);
          const wn = w.reduce((s, d) => s + (d && days[d] ? days[d].trades : 0), 0);
          return [
            ...w.map((d, di) => {
              const v = d ? days[d] : undefined;
              const a = v ? 0.15 + 0.6 * (Math.abs(v.pnl) / max) : 0;
              const bg = v ? (v.pnl >= 0 ? `rgba(34,197,94,${a})` : `rgba(244,63,94,${a})`) : undefined;
              return (
                <div key={`${wi}-${di}`} title={v ? `${d}: ${f(v.pnl)} · ${v.trades} trades` : d ?? ""}
                  className={`anim-fade-up flex aspect-square flex-col justify-between rounded-md border p-1 sm:aspect-[4/3] ${d ? "border-border" : "border-transparent"} ${v ? "card-hover" : ""}`}
                  style={{ background: bg, animationDelay: `${(wi * 7 + di) * 12}ms` }}>
                  {d && <span className="text-muted">{Number(d.slice(8))}</span>}
                  {v && <span className="hidden truncate font-semibold sm:block">{f(v.pnl)}</span>}
                  {v && <span className="hidden text-[10px] text-fg/70 md:block">{v.trades} tr</span>}
                </div>
              );
            }),
            <div key={`wk-${wi}`} className="flex flex-col justify-center rounded-md bg-panel-2 p-1 text-center">
              <span className={`font-semibold ${wk > 0 ? "text-win" : wk < 0 ? "text-loss" : "text-muted"}`}>{wn ? f(wk) : "—"}</span>
              {wn > 0 && <span className="text-[10px] text-muted">{wn} tr</span>}
            </div>,
          ];
        })}
      </div>
    </div>
  );
}
