export default function EquityCurve({ points, currency }: { points: number[]; currency: string }) {
  if (points.length < 2) return <p className="text-sm text-muted">The equity curve appears once you have at least 2 closed trades.</p>;
  const w = 600, h = 180, pad = 8;
  const all = [0, ...points];
  const min = Math.min(...all), max = Math.max(...all), span = max - min || 1;
  const x = (i: number) => pad + (i / (all.length - 1)) * (w - 2 * pad);
  const y = (v: number) => h - pad - ((v - min) / span) * (h - 2 * pad);
  const d = all.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label={`Equity curve of cumulative net P&L in ${currency}, ending at ${last.toFixed(2)}`}>
      <line x1={pad} x2={w - pad} y1={y(0)} y2={y(0)} stroke="var(--border)" strokeDasharray="4 4" />
      <path d={d} fill="none" stroke={last >= 0 ? "var(--win)" : "var(--loss)"} strokeWidth="2" />
    </svg>
  );
}
