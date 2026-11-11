import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SiteFooter } from "@/components/SiteFooter";
import { btnCls } from "@/components/ui";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-panel focus:px-3 focus:py-2">Skip to content</a>
      <header className="sticky top-0 z-30 border-b border-border bg-bg/90 backdrop-blur">
        <nav aria-label="Site" className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <Logo />
          <div className="flex items-center gap-1 text-sm sm:gap-2">
            <Link href="/pricing" className="rounded px-2 py-2 text-muted hover:text-fg sm:px-3">Pricing</Link>
            <Link href="/learn" className="hidden rounded px-2 py-2 text-muted hover:text-fg sm:block sm:px-3">Learn</Link>
            <Link href="/login" className="whitespace-nowrap rounded px-2 py-2 text-muted hover:text-fg sm:px-3">Log in</Link>
            <Link href="/signup" className={`${btnCls} !min-h-9 whitespace-nowrap !px-3 !py-1.5`}>Start free</Link>
          </div>
        </nav>
      </header>
      <main id="main">{children}</main>
      <SiteFooter />
    </>
  );
}
