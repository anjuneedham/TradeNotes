/** Cumulative net P&L as an animated area chart. Pure SVG + CSS (no client JS). */
export default function EquityCurve({ points, currency, labels }: { points: number[]; currency: string; labels?: string[] }) {
  if (points.length < 2) return <p className="text-sm text-muted">The equity curve appears once you have at least 2 closed trades.</p>;
  const w = 800, h = 240, pad = 10;
  const all = [0, ...points];
  const min = Math.min(...all), max = Math.max(...all), span = max - min || 1;
  const x = (i: number) => pad + (i / (all.length - 1)) * (w - 2 * pad);
  const y = (v: number) => h - pad - ((v - min) / span) * (h - 2 * pad);
  const line = all.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(all.length - 1).toFixed(1)},${y(min).toFixed(1)} L${x(0).toFixed(1)},${y(min).toFixed(1)} Z`;
  const last = points[points.length - 1];
  const col = last >= 0 ? "var(--win)" : "var(--loss)";
  const fmt = (v: number) => new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(v);
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label={`Equity curve of cumulative net P&L in ${currency}, ending at ${last.toFixed(2)}`}>
        <defs>
          <linearGradient id="eq-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={col} stopOpacity=".35" /><stop offset="100%" stopColor={col} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => <line key={f} x1={pad} x2={w - pad} y1={pad + f * (h - 2 * pad)} y2={pad + f * (h - 2 * pad)} stroke="var(--border)" strokeOpacity=".5" />)}
        <line x1={pad} x2={w - pad} y1={y(0)} y2={y(0)} stroke="var(--muted)" strokeOpacity=".5" strokeDasharray="4 4" />
        <path d={area} fill="url(#eq-fill)" className="anim-fade-up" style={{ animationDelay: ".6s" }} />
        <path d={line} fill="none" stroke={col} strokeWidth="2.5" strokeLinejoin="round" className="anim-draw" style={{ ["--len" as string]: 4000 }} />
        <circle cx={x(all.length - 1)} cy={y(last)} r="4" fill={col} className="anim-fade-up" style={{ animationDelay: "1.3s" }} />
      </svg>
      <div className="pointer-events-none absolute right-2 top-1 text-xs text-muted">peak {fmt(max)}</div>
      {labels && labels.length > 1 && <div className="mt-1 flex justify-between text-[11px] text-muted"><span>{labels[0]}</span><span>{labels[labels.length - 1]}</span></div>}
    </div>
  );
}
