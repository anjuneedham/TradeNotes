import type { Bucket, ScoreAxis } from "@/lib/analytics";

const money = (v: number, cur: string) => new Intl.NumberFormat("en-US", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(v);

/** Animated circular gauge for the 0–100 TradeNotes Score. */
export function ScoreRing({ score, size = 140 }: { score: number; size?: number }) {
  const r = 52, c = 2 * Math.PI * r, off = c * (1 - score / 100);
  const col = score >= 70 ? "var(--win)" : score >= 45 ? "var(--warn)" : "var(--loss)";
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={`Score ${score} out of 100`}>
      <defs><linearGradient id="ring" x1="0" x2="1"><stop offset="0%" stopColor="var(--accent)" /><stop offset="100%" stopColor={col} /></linearGradient></defs>
      <circle cx="60" cy="60" r={r} fill="none" stroke="var(--border)" strokeWidth="10" />
      <circle cx="60" cy="60" r={r} fill="none" stroke="url(#ring)" strokeWidth="10" strokeLinecap="round" transform="rotate(-90 60 60)"
        strokeDasharray={c} strokeDashoffset={off} className="anim-draw" style={{ ["--len" as string]: c }} />
      <text x="60" y="60" textAnchor="middle" dominantBaseline="central" fontSize="30" fontWeight="700" fill="var(--fg)">{score}</text>
      <text x="60" y="84" textAnchor="middle" fontSize="9" fill="var(--muted)">/ 100</text>
    </svg>
  );
}

/** Hexagon radar of the six score axes. */
export function Radar({ axes, size = 260 }: { axes: ScoreAxis[]; size?: number }) {
  const cx = 130, cy = 130, R = 92, n = axes.length;
  const pt = (i: number, v: number) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n; return [cx + Math.cos(a) * R * v, cy + Math.sin(a) * R * v]; };
  const poly = (v: (i: number) => number) => axes.map((_, i) => pt(i, v(i)).map((z) => z.toFixed(1)).join(",")).join(" ");
  return (
    <svg width="100%" viewBox="-35 0 330 260" style={{ maxWidth: size }} role="img" aria-label="Score breakdown radar">
      {[0.25, 0.5, 0.75, 1].map((f) => <polygon key={f} points={poly(() => f)} fill="none" stroke="var(--border)" />)}
      {axes.map((_, i) => { const [x, y] = pt(i, 1); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--border)" />; })}
      <polygon points={poly((i) => axes[i].value / 100)} fill="rgba(109,94,252,.28)" stroke="var(--accent)" strokeWidth="2" className="anim-fade-up" style={{ transformOrigin: "130px 130px" }} />
      {axes.map((a, i) => { const [x, y] = pt(i, 1.2); return <text key={a.key} x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize="9.5" fill="var(--muted)">{a.label}</text>; })}
    </svg>
  );
}

/** Horizontal diverging bars (green right / red left) for P&L by group. */
export function PnlBars({ data, cur }: { data: Bucket[]; cur: string }) {
  if (!data.length) return <p className="text-sm text-muted">Not enough tagged trades yet.</p>;
  const max = Math.max(...data.map((d) => Math.abs(d.pnl)), 1);
  return (
    <ul className="space-y-2 text-xs">
      {data.map((d, i) => (
        <li key={d.label} className="grid grid-cols-[6.5rem_1fr_5rem] items-center gap-2">
          <span className="truncate text-muted" title={d.label}>{d.label}</span>
          <div className="relative h-5 rounded bg-panel-2">
            <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
            <div className={`anim-grow-x absolute inset-y-0.5 rounded ${d.pnl >= 0 ? "left-1/2 bg-win/70" : "right-1/2 bg-loss/70"}`}
              style={{ width: `${(Math.abs(d.pnl) / max) * 50}%`, animationDelay: `${i * 40}ms`, transformOrigin: d.pnl >= 0 ? "left" : "right" }} />
          </div>
          <span className={`text-right font-medium ${d.pnl >= 0 ? "text-win" : "text-loss"}`}>{money(d.pnl, cur)}<span className="ml-1 font-normal text-muted">·{d.trades}</span></span>
        </li>
      ))}
    </ul>
  );
}

/** Vertical bar histogram. */
export function Histogram({ data, colorFor }: { data: { label: string; count: number }[]; colorFor?: (label: string, i: number) => string }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex h-44 items-end gap-2">
      {data.map((d, i) => (
        <div key={d.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
          <span className="text-[11px] text-muted">{d.count || ""}</span>
          <div className="anim-grow-y w-full rounded-t" style={{ height: `${(d.count / max) * 80}%`, minHeight: d.count ? 4 : 0, background: colorFor?.(d.label, i) ?? "var(--accent)", animationDelay: `${i * 50}ms` }} />
          <span className="text-center text-[10px] leading-tight text-muted">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
