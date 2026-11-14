"use client";
import { useState } from "react";
import { money, signedMoney, shortDate } from "@/lib/format";

/** `n` = 1-based position of the trade in the full series (set when a long series was thinned for display). */
export interface EquityPoint { cumulative: number; closedAt: string | null; n?: number }

/**
 * Cumulative net P&L after each closed trade. One series, so no legend: the card title names it.
 * The line is drawn in the neutral accent ink; green/red are reserved for results in text.
 */
export default function EquityCurve({ points, currency, height = 200, total, values = true }: { points: EquityPoint[]; currency: string; height?: number; total?: number; /** false: show the shape only (no axis amounts, no amounts in the tooltip or the accessible name). Used by share links whose owner hides money. */ values?: boolean }) {
  const [hover, setHover] = useState<number | null>(null);
  if (points.length < 2) return <p className="text-sm text-muted">The equity curve appears once you have at least 2 closed trades.</p>;

  const vals = [0, ...points.map((p) => p.cumulative)];
  const min = Math.min(...vals), max = Math.max(...vals), span = max - min || 1;
  const n = vals.length - 1;
  const all = total ?? n; // trades in the whole series (the points may be a thinned view of it)
  const W = 1000, H = 100; // drawing units; the SVG stretches, strokes stay 2px
  const ord = (i: number) => (i <= 0 ? 0 : points[i - 1].n ?? i); // trade number of point i (0 = the start)
  const ords = vals.map((_, i) => ord(i));
  const x = (i: number) => (ords[i] / all) * W; // spaced by trade number, so a thinned series keeps its true shape
  const y = (v: number) => H - ((v - min) / span) * H;
  const d = vals.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(2)}`).join(" ");
  const last = vals[n];
  const pctY = (v: number) => `${(y(v) / H) * 100}%`;
  const h = hover !== null ? { i: hover, v: vals[hover], step: hover > 0 ? vals[hover] - vals[hover - 1] : 0, at: hover > 0 ? points[hover - 1].closedAt : null, gap: ord(hover) - ord(hover - 1) } : null;

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const target = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * all;
    let lo = 0, hi = n; // nearest point by trade number (ords is increasing)
    while (lo < hi) { const mid = (lo + hi) >> 1; if (ords[mid] < target) lo = mid + 1; else hi = mid; }
    setHover(lo > 0 && target - ords[lo - 1] <= ords[lo] - target ? lo - 1 : lo);
  };

  return (
    <figure>
      <div className="flex gap-2">
        <div className="fig relative w-16 shrink-0 text-right text-[11px] text-muted sm:w-20" style={{ height }} aria-hidden="true">
          {values && <>
            <span className="absolute right-0 top-0 -translate-y-1/2">{money(max, currency)}</span>
            {min < 0 && max > 0 && Math.abs(y(0) - 0) > 14 && Math.abs(y(0) - H) > 14 && <span className="absolute right-0 -translate-y-1/2" style={{ top: pctY(0) }}>{money(0, currency)}</span>}
            <span className="absolute bottom-0 right-0 translate-y-1/2">{money(min, currency)}</span>
          </>}
        </div>
        <div className="relative min-w-0 flex-1 touch-pan-y" style={{ height }} onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)}>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full overflow-visible" role="img"
            aria-label={values ? `Equity curve: cumulative net P&L over ${all} closed trades, ending at ${signedMoney(last, currency)}. Lowest point ${money(min, currency)}, highest ${money(max, currency)}.` : `Shape of the equity curve over ${all} closed trades. Money amounts are hidden by the owner.`}>
            <line x1="0" x2={W} y1={y(max)} y2={y(max)} stroke="var(--border)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            <line x1="0" x2={W} y1={y(min)} y2={y(min)} stroke="var(--border)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            <line x1="0" x2={W} y1={y(0)} y2={y(0)} stroke="var(--border-strong)" strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
            <path d={d} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            {h && <line x1={x(h.i)} x2={x(h.i)} y1="0" y2={H} stroke="var(--border-strong)" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
          </svg>
          {/* end marker / hover marker (HTML so it stays round while the SVG stretches) */}
          <span className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-panel bg-accent"
            style={{ left: `${(ords[h ? h.i : n] / all) * 100}%`, top: pctY(h ? h.v : last) }} />
          {h && (
            <div className="pointer-events-none absolute top-0 z-10 w-max max-w-[14rem] rounded-md border border-border-strong bg-raised px-2.5 py-1.5 text-xs shadow-lg"
              style={ords[h.i] / all > 0.5 ? { right: `${(1 - ords[h.i] / all) * 100}%`, marginRight: 10 } : { left: `${(ords[h.i] / all) * 100}%`, marginLeft: 10 }}>
              <p className="text-muted">{h.i === 0 ? "Start" : `Trade ${ord(h.i)} of ${all}${h.at ? ` · ${shortDate(h.at)}` : ""}`}</p>
              {values && <p className="fig mt-0.5 font-medium text-fg">{signedMoney(h.v, currency)} <span className="font-sans font-normal text-muted">cumulative</span></p>}
              {values && h.i > 0 && <p className="fig text-muted">{signedMoney(h.step, currency)} <span className="font-sans">{h.gap === 1 ? "this trade" : `over the last ${h.gap} trades`}</span></p>}
            </div>
          )}
        </div>
      </div>
      <figcaption className="mt-2 flex justify-between pl-[4.5rem] text-[11px] text-muted sm:pl-[5.5rem]">
        <span>First closed trade</span><span>Trade {all}</span>
      </figcaption>
    </figure>
  );
}
