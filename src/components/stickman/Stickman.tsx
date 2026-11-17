// Pencil-drawn stick figure. Pure SVG, no dependencies. Poses are small variations of the same body
// so the character stays recognisable from scene to scene (the way it does in the videos).
export type Pose = "stand" | "point" | "think" | "win" | "lose" | "shrug";

const ARMS: Record<Pose, string> = {
  stand: "M50 62 L30 88 M50 62 L70 88",
  point: "M50 62 L28 84 M50 62 L88 56",
  think: "M50 62 L30 88 M50 62 L58 44",
  win: "M50 62 L26 30 M50 62 L74 30",
  lose: "M50 62 L34 96 M50 62 L66 96",
  shrug: "M50 62 L24 70 M50 62 L76 70",
};
const MOUTH: Record<Pose, string> = {
  stand: "M43 36 Q50 40 57 36",
  point: "M43 36 Q50 41 57 35",
  think: "M44 38 L56 38",
  win: "M42 34 Q50 46 58 34",
  lose: "M43 40 Q50 33 57 40",
  shrug: "M44 38 L56 38",
};

export function Stickman({ pose = "stand", className = "", label }: { pose?: Pose; className?: string; label?: string }) {
  return (
    <svg viewBox="0 0 100 150" className={`sm-pencil ${className}`} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="50" cy="28" r="17" />
      <circle cx="44" cy="25" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="56" cy="25" r="1.6" fill="currentColor" stroke="none" />
      <path d={MOUTH[pose]} strokeWidth="3" />
      <path d="M50 45 L50 104" />
      <path className="sm-arms" d={ARMS[pose]} />
      <path d="M50 104 L32 142 M50 104 L68 142" />
    </svg>
  );
}

/** A trade drawn as a doodle chip, as in Part 1: green "+$20" wins and red "-$80" losses. */
export function Chip({ kind, text, delay = 0 }: { kind: "win" | "loss"; text: string; delay?: number }) {
  return (
    <span className={`sm-chip sm-chip-${kind}`} style={{ animationDelay: `${delay}s` }}>
      {text}
    </span>
  );
}
