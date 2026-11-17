/**
 * James, the stickman who writes his notes: TradeNotes' mascot, narrator and newsletter host.
 * One drawing, a few poses. Strokes use currentColor (set text colour to change him); the notebook and pencil use the accent.
 */
export type JamesPose = "wave" | "write" | "think" | "read";

export function James({ pose = "write", size = 120, className = "", label = "James, the stickman" }: { pose?: JamesPose; size?: number; className?: string; label?: string }) {
  return (
    <svg role="img" aria-label={label} viewBox="0 0 120 140" width={size} height={size * (140 / 120)} className={className} fill="none" stroke="currentColor" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
      {/* head */}
      <circle cx="60" cy="26" r="17" fill="var(--bg)" />
      {/* face: eyes look at the notebook when writing/reading, else at you */}
      <circle cx={pose === "write" || pose === "read" ? 55 : 54} cy={pose === "write" || pose === "read" ? 28 : 24} r="1.8" fill="currentColor" stroke="none" />
      <circle cx={pose === "write" || pose === "read" ? 66 : 66} cy={pose === "write" || pose === "read" ? 28 : 24} r="1.8" fill="currentColor" stroke="none" />
      {pose === "think" ? <path d="M54 34h12" strokeWidth={3} /> : <path d="M53 32q7 6 14 0" strokeWidth={3} />}
      {/* body + legs */}
      <path d="M60 43v44M60 87l-17 33M60 87l17 33" />
      {pose === "wave" && (
        <>
          <path d="M60 56L40 76" />
          <path d="M60 56L84 38" />
          <path d="M84 38l5-7M84 38l9-1M84 38l6 6" strokeWidth={3} />
        </>
      )}
      {pose === "think" && (
        <>
          <path d="M60 56L40 76" />
          <path d="M60 56L72 64L64 48" />
          <circle cx="93" cy="14" r="2.5" fill="currentColor" stroke="none" />
          <circle cx="100" cy="8" r="3.5" fill="currentColor" stroke="none" />
          <text x="94" y="30" fontSize="18" fontWeight="700" stroke="none" fill="var(--accent)">?</text>
        </>
      )}
      {(pose === "write" || pose === "read") && (
        <>
          {/* notebook held in front */}
          <rect x="44" y="64" width="34" height="26" rx="3" fill="var(--accent)" stroke="var(--accent)" />
          <path d="M61 64v26" stroke="var(--bg)" strokeWidth={2} />
          <path d="M60 56L50 70M60 56L76 70" />
        </>
      )}
      {pose === "write" && <path d="M82 58l-12 12" stroke="var(--fg)" strokeWidth={3} />}
    </svg>
  );
}

/** Small head-and-notebook mark for the header. */
export function JamesMark({ size = 28 }: { size?: number }) {
  return (
    <svg role="img" aria-label="James" viewBox="0 0 40 40" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round">
      <circle cx="20" cy="14" r="9" />
      <circle cx="17" cy="13" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="23" cy="13" r="1.3" fill="currentColor" stroke="none" />
      <path d="M16.5 17.5q3.5 3 7 0" strokeWidth={2} />
      <rect x="9" y="27" width="22" height="10" rx="2" fill="var(--accent)" stroke="var(--accent)" />
    </svg>
  );
}
