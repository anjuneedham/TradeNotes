import Link from "next/link";

/** Wordmark + mark (a ruled notebook line crossed by a rising stroke). */
export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 font-semibold tracking-tight text-fg" aria-label="TradeNotes home">
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
        <rect x="1" y="1" width="20" height="20" rx="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5.5 14.5l3.5-4 3 2.5 4.5-6" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>TradeNotes</span>
    </Link>
  );
}
