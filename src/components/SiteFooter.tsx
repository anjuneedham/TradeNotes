import Link from "next/link";

export function SiteFooter({ compact = false }: { compact?: boolean }) {
  return (
    <footer className={`border-t border-border ${compact ? "mt-10" : "mt-24"}`}>
      <div className="mx-auto flex max-w-6xl flex-wrap gap-x-5 gap-y-2 px-4 py-6 text-xs text-muted">
        <span>© 2026 TradeNotes</span>
        <Link href="/learn" className="hover:text-fg">Metric guide</Link>
        <Link href="/legal/terms" className="hover:text-fg">Terms</Link>
        <Link href="/legal/privacy" className="hover:text-fg">Privacy</Link>
        <Link href="/legal/disclaimer" className="hover:text-fg">Risk disclaimer</Link>
        <span className="w-full leading-relaxed">TradeNotes is a journaling and analytics tool. It does not provide financial advice. Trading involves substantial risk of loss; past performance does not guarantee future results.</span>
      </div>
    </footer>
  );
}
