import type { Metadata } from "next";
import Link from "next/link";
import { Caveat } from "next/font/google";
import "./globals.css";
import { ThemeToggle, themeInitScript } from "@/components/stickman/ThemeToggle";
import { Stickman } from "@/components/stickman/Stickman";

const hand = Caveat({ subsets: ["latin"], variable: "--font-hand", display: "swap" });

export const metadata: Metadata = {
  title: "TradeNotes — Trading Journal & Backtesting",
  description: "Know your trades. Understand your patterns. Improve your process.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={hand.variable} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeInitScript }} /></head>
      <body className="min-h-screen antialiased">
        {/* Shared pencil-wobble filter used by every doodle (stickman theme). */}
        <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute" }}>
          <filter id="sm-wobble"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="4" result="n" /><feDisplacementMap in="SourceGraphic" in2="n" scale="3" /></filter>
        </svg>
        <header className="border-b border-border">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight sm-wordmark"><Stickman pose="point" className="sm-only h-7 w-5" />TradeNotes</Link>
            <div className="flex items-center gap-4 text-sm text-muted">
              <Link href="/pricing" className="hover:text-fg">Pricing</Link>
              <Link href="/learn" className="hover:text-fg">Learn</Link>
              <ThemeToggle />
            </div>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="mt-24 border-t border-border">
          <div className="mx-auto flex max-w-6xl flex-wrap gap-4 px-4 py-6 text-xs text-muted">
            <span>© 2026 TradeNotes</span>
            <Link href="/legal/terms">Terms</Link>
            <Link href="/legal/privacy">Privacy</Link>
            <Link href="/legal/disclaimer">Risk disclaimer</Link>
            <span className="w-full">TradeNotes is a journaling and analytics tool. It does not provide financial advice. Trading involves substantial risk of loss; past performance does not guarantee future results.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
