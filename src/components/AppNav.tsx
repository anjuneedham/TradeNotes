"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Logo } from "./Logo";

const I = ({ d }: { d: string }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);
const NAV = [
  { href: "/app", label: "Dashboard", icon: "M3 10.5 10 4l7 6.5M5 9v7h10V9" },
  { href: "/app/journal", label: "Journal", icon: "M5 3h9a2 2 0 0 1 2 2v12H6a2 2 0 0 1-2-2V4a1 1 0 0 1 1-1ZM8 7h5M8 10.5h5" },
  { href: "/app/analytics", label: "Analytics", icon: "M4 16V9m4 7V4m4 12v-5m4 5V7" },
  { href: "/app/settings", label: "Settings", icon: "M4 6h8m3 0h1M4 14h1m3 0h8M13.5 4v4M6.5 12v4" },
] as const;
const isActive = (path: string, href: string) => (href === "/app" ? path === "/app" : path === href || path.startsWith(href + "/"));

/** App chrome: sidebar on desktop, top bar + bottom tab bar on mobile. Hidden during onboarding so nothing competes with setup. */
export function AppNav({ logout, switcher, children }: { logout: ReactNode; switcher?: ReactNode; children: ReactNode }) {
  const path = usePathname();
  const onboarding = path.startsWith("/app/onboarding");
  // Billing lives under Settings in the IA, so it highlights Settings.
  const active = (href: string) => isActive(path, href) || (href === "/app/settings" && path.startsWith("/app/billing")) ;
  const onNew = path === "/app/journal/new";

  if (onboarding) {
    return (
      <div className="min-h-screen">
        <header className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4"><Logo href="/app" />{logout}</header>
        <main id="main" className="mx-auto max-w-6xl px-4 pb-16 pt-4">{children}</main>
      </div>
    );
  }
  return (
    <div className="min-h-screen md:grid md:grid-cols-[13.5rem_minmax(0,1fr)]">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-panel focus:px-3 focus:py-2">Skip to content</a>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-border bg-panel px-3 py-4 md:flex">
        <div className="px-2"><Logo href="/app" /></div>
        {switcher && <div className="mt-4 px-1">{switcher}</div>}
        <Link href="/app/journal/new" className="mt-5 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md bg-fg px-3 text-sm font-medium text-bg hover:opacity-90">
          <span aria-hidden="true">+</span> Log trade
        </Link>
        <nav aria-label="App" className="mt-5 flex flex-col gap-0.5 text-sm">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={active(n.href) ? "page" : undefined}
              className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 ${active(n.href) ? "bg-raised font-medium text-fg" : "text-muted hover:bg-raised/60 hover:text-fg"}`}>
              <I d={n.icon} />{n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-0.5 border-t border-border pt-3 text-sm">
          <Link href="/app/accounts" aria-current={active("/app/accounts") ? "page" : undefined} className="rounded-md px-2.5 py-2 text-muted hover:bg-raised/60 hover:text-fg">Accounts</Link>
          <Link href="/learn" className="rounded-md px-2.5 py-2 text-muted hover:bg-raised/60 hover:text-fg">Metric guide</Link>
          {logout}
        </div>
      </aside>

      <div className="min-w-0">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-13 items-center justify-between border-b border-border bg-bg/95 px-4 py-2.5 backdrop-blur md:hidden">
          <Logo href="/app" />
          {switcher ?? <Link href="/learn" className="rounded px-2 py-1.5 text-sm text-muted hover:text-fg">Metric guide</Link>}
        </header>

        <main id="main" className="mx-auto max-w-6xl px-4 pb-28 pt-5 md:px-8 md:pb-16 md:pt-8">{children}</main>
      </div>

      {/* Mobile bottom tab bar: four destinations + a central Log action */}
      <nav aria-label="App" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-panel pb-[env(safe-area-inset-bottom)] text-[11px] md:hidden">
        {NAV.slice(0, 2).map((n) => <Tab key={n.href} {...n} on={active(n.href)} />)}
        <Link href="/app/journal/new" aria-current={onNew ? "page" : undefined} className="flex flex-col items-center justify-center gap-0.5 py-1.5 font-medium text-fg">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-fg text-xl leading-none text-bg" aria-hidden="true">+</span>
          <span className="sr-only">Log trade</span>
        </Link>
        {NAV.slice(2).map((n) => <Tab key={n.href} {...n} on={active(n.href)} />)}
      </nav>
    </div>
  );
}

function Tab({ href, label, icon, on }: { href: string; label: string; icon: string; on: boolean }) {
  return (
    <Link href={href} aria-current={on ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-0.5 ${on ? "text-fg" : "text-muted"}`}>
      <I d={icon} />
      <span className={on ? "font-medium" : ""}>{label}</span>
    </Link>
  );
}
