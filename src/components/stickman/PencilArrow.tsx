// Hand-drawn call-to-action arrow. The path "draws itself" (stroke-dashoffset) when it scrolls
// into view / loads, like the arrows in the videos. `dir` picks which way it curves.
type Dir = "down-right" | "down-left" | "right" | "left" | "up-right";

const PATHS: Record<Dir, { d: string; head: string; vb: string }> = {
  "down-right": { vb: "0 0 140 110", d: "M8 10 C 20 70, 70 90, 122 92", head: "M104 78 L124 92 L102 104" },
  "down-left": { vb: "0 0 140 110", d: "M132 10 C 120 70, 70 90, 18 92", head: "M36 78 L16 92 L38 104" },
  right: { vb: "0 0 150 60", d: "M6 34 C 40 14, 90 52, 138 30", head: "M120 14 L140 30 L118 44" },
  left: { vb: "0 0 150 60", d: "M144 34 C 110 14, 60 52, 12 30", head: "M30 14 L10 30 L32 44" },
  "up-right": { vb: "0 0 140 110", d: "M8 100 C 20 40, 70 20, 122 18", head: "M104 4 L124 18 L102 30" },
};

export function PencilArrow({ dir = "down-right", label, className = "", delay = 0 }: { dir?: Dir; label?: string; className?: string; delay?: number }) {
  const p = PATHS[dir];
  return (
    <span className={`sm-only sm-arrow ${className}`} style={{ ["--d" as string]: `${delay}s` }} aria-hidden="true">
      {label && <span className="sm-note">{label}</span>}
      <svg viewBox={p.vb} className="sm-pencil" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <path className="sm-draw" pathLength={1} d={p.d} />
        <path className="sm-draw sm-draw-head" pathLength={1} d={p.head} />
      </svg>
    </span>
  );
}

/** Hand-drawn wobbly underline for headings. */
export function PencilUnderline({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 16" preserveAspectRatio="none" className={`sm-only sm-underline sm-pencil ${className}`} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round">
      <path className="sm-draw" pathLength={1} d="M4 9 C 50 2, 90 14, 150 7 S 250 12, 296 6" />
    </svg>
  );
}
