"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS: [string, string][] = [["/", "Today"], ["/outreach", "Outreach"], ["/customers", "Customers"], ["/content", "Content"], ["/social", "Social & ads"], ["/nurture", "Nurture"], ["/feedback", "Feedback"], ["/reports", "Reports"], ["/launch", "Launch"], ["/settings", "Settings"]];
export default function Nav({ logout }: { logout: () => Promise<void> }) {
  const path = usePathname();
  const on = (h: string) => (h === "/" ? path === "/" : path.startsWith(h));
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2">
        <Link href="/" className="mr-2 text-sm font-bold tracking-wide"><span className="text-accent">TradeNotes</span> HQ</Link>
        <nav className="flex flex-1 flex-wrap gap-1" aria-label="Main">
          {ITEMS.map(([h, l]) => <Link key={h} href={h} className={`rounded px-2.5 py-1 text-sm ${on(h) ? "bg-panel text-accent" : "text-muted hover:text-fg"}`}>{l}</Link>)}
        </nav>
        <form action={logout}><button className="text-xs text-muted hover:text-fg cursor-pointer">Log out</button></form>
      </div>
    </header>
  );
}
