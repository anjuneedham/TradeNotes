"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  ["Dashboard", "/app", "◧"], ["Journal", "/app/journal", "☰"], ["Calendar", "/app/calendar", "▦"],
  ["Reports", "/app/reports", "◔"], ["AI Coach", "/app/coach", "✦"], ["Billing", "/app/billing", "◇"], ["Learn", "/learn", "?"],
] as const;

export default function NavLinks({ vertical = false }: { vertical?: boolean }) {
  const path = usePathname();
  return (
    <nav className={vertical ? "flex flex-col gap-0.5" : "flex flex-wrap gap-1"}>
      {links.map(([l, h, icon]) => {
        const active = h === "/app" ? path === "/app" : path.startsWith(h);
        return (
          <Link key={h} href={h} className={`flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition ${active ? "bg-accent/15 text-fg" : "text-muted hover:bg-panel-2 hover:text-fg"}`}>
            {vertical && <span className={`w-4 text-center ${active ? "text-indigo-300" : ""}`}>{icon}</span>}
            {l}
            {l === "AI Coach" && <span className="ml-auto rounded bg-gradient-to-r from-accent to-accent-2 px-1.5 text-[10px] font-semibold text-white">PRO</span>}
          </Link>
        );
      })}
    </nav>
  );
}
