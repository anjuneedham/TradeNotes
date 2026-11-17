import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { JamesMark } from "@/components/James";
import { SubscribeForm } from "@/components/SubscribeForm";

export const metadata: Metadata = {
  title: "TradeNotes — Trading Journal & Backtesting",
  description: "Know your trades. Understand your patterns. Improve your process.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="border-b border-border">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight"><JamesMark /> TradeNotes</Link>
            <div className="flex gap-4 text-sm text-muted">
              <Link href="/pricing" className="hover:text-fg">Pricing</Link>
              <Link href="/learn" className="hover:text-fg">Learn</Link>
              <Link href="/notes" className="hover:text-fg">James&apos;s Notes</Link>
            </div>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="mt-24 border-t border-border">
          <div className="mx-auto max-w-6xl px-4 pt-8">
            <p className="mb-2 text-sm font-medium">James&apos;s Daily Notes <span className="font-normal text-muted">· a short article or story every day, by email</span></p>
            <SubscribeForm source="footer" compact />
          </div>
          <div className="mx-auto flex max-w-6xl flex-wrap gap-4 px-4 py-6 text-xs text-muted">
            <span>© 2026 TradeNotes</span>
            <Link href="/legal/terms">Terms</Link>
            <Link href="/legal/privacy">Privacy</Link>
            <Link href="/legal/disclaimer">Risk disclaimer</Link>
            <Link href="/notes">Notes</Link>
            <span className="w-full">TradeNotes is a journaling and analytics tool. It does not provide financial advice. Trading involves substantial risk of loss; past performance does not guarantee future results.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
