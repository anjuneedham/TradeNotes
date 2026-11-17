import { money, signedMoney } from "@/lib/format";
import { SERIES, type CompareColumn } from "@/lib/compare";

/**
 * Overlaid equity curves, one per strategy, on one scale: cumulative net P&L after each closed trade, plotted by trade number
 * (so strategies with different trade counts line up from their first trade). Each series has its own colour AND line style, and the
 * legend states the end value, so nothing depends on colour alone. Static SVG: no script needed.
 */
export default function CompareCurves({ columns, currency, height = 220 }: { columns: CompareColumn[]; currency: string; height?: number }) {
  const drawn = columns.filter((c) => c.curve.length >= 2);
  const W = 1000, H = 100;
  const maxN = Math.max(1, ...drawn.map((c) => c.curve[c.curve.length - 1].n));
  const all = drawn.flatMap((c) => c.curve.map((p) => p.cumulative));
  const min = Math.min(0, ...all), max = Math.max(0, ...all), span = max - min || 1;
  const x = (n: number) => (n / maxN) * W;
  const y = (v: number) => H - ((v - min) / span) * H;
  const note = (c: CompareColumn) => (c.curve.length === 0 ? "no closed trades" : c.curve.length === 1 ? `${signedMoney(c.summary.netPnl, currency)}, one trade: no curve to draw` : signedMoney(c.summary.netPnl, currency));
  const summary = columns.map((c) => `${c.name}: ${note(c)}`).join("; ");
  return (
    <figure>
      {drawn.length === 0 ? <p className="text-sm text-muted">The curves appear once a selected strategy has at least 2 closed trades.</p> : (
        <div className="flex gap-2">
          <div className="fig relative w-16 shrink-0 text-right text-[11px] text-muted sm:w-20" style={{ height }} aria-hidden="true">
            <span className="absolute right-0 top-0 -translate-y-1/2">{money(max, currency)}</span>
            <span className="absolute bottom-0 right-0 translate-y-1/2">{money(min, currency)}</span>
          </div>
          <div className="min-w-0 flex-1" style={{ height }}>
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full overflow-visible" role="img"
              aria-label={`Equity curves of ${columns.length} strategies on one scale (a curve needs at least 2 closed trades), cumulative net P&L by trade number. ${summary}.`} data-testid="compare-curves">
              <line x1="0" x2={W} y1={y(max)} y2={y(max)} stroke="var(--border)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              <line x1="0" x2={W} y1={y(min)} y2={y(min)} stroke="var(--border)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              <line x1="0" x2={W} y1={y(0)} y2={y(0)} stroke="var(--border-strong)" strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
              {columns.map((c, i) => c.curve.length >= 2 && (
                <path key={c.name} d={[{ n: 0, cumulative: 0 }, ...c.curve].map((p, k) => `${k ? "L" : "M"}${x(p.n).toFixed(1)},${y(p.cumulative).toFixed(2)}`).join(" ")}
                  fill="none" stroke={SERIES[i].color} strokeWidth="2.25" strokeDasharray={SERIES[i].dash} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              ))}
            </svg>
          </div>
        </div>
      )}
      <figcaption className="mt-2 flex justify-between pl-[4.5rem] text-[11px] text-muted sm:pl-[5.5rem]"><span>Trade 1</span><span>Trade number →  {maxN}</span></figcaption>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm" aria-label="Legend">
        {columns.map((c, i) => (
          <li key={c.name} className="flex items-center gap-2">
            <svg width="30" height="8" aria-hidden="true"><line x1="0" x2="30" y1="4" y2="4" stroke={SERIES[i].color} strokeWidth="2.5" strokeDasharray={SERIES[i].dash} /></svg>
            <span className="font-medium">{c.name}</span>
            <span className="text-xs text-muted">{c.curve.length >= 2 ? `${SERIES[i].label} · ` : ""}<span className="fig">{note(c)}</span></span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
