import Link from "next/link";
import { HUB_LINKS } from "@/lib/marketing";
import { SubscribeForm } from "./SubscribeForm";

export function SiteFooter({ compact = false }: { compact?: boolean }) {
  return (
    <footer className={`border-t border-border ${compact ? "mt-10" : "mt-24"}`}>
      <div className="mx-auto max-w-6xl px-4 pt-8">
        <p className="mb-2 text-sm font-medium">James&apos;s Daily Notes <span className="font-normal text-muted">· a short article or story every day, by email</span></p>
        <SubscribeForm source="footer" compact />
      </div>
      <div className="mx-auto flex max-w-6xl flex-wrap gap-x-5 gap-y-2 px-4 py-6 text-xs text-muted">
        <nav aria-label="Explore" className="flex w-full flex-wrap gap-x-5 gap-y-2 pb-2 text-sm">{HUB_LINKS.map((l) => <Link key={l.href} href={l.href} className="hover:text-fg">{l.label}</Link>)}</nav>
        <span>© 2026 TradeNotes</span>
        <Link href="/learn" className="hover:text-fg">Metric guide</Link>
        <Link href="/legal/terms" className="hover:text-fg">Terms</Link>
        <Link href="/legal/privacy" className="hover:text-fg">Privacy</Link>
        <Link href="/legal/subscription" className="hover:text-fg">Subscriptions</Link>
        <Link href="/legal/disclaimer" className="hover:text-fg">Risk disclaimer</Link>
        <span className="w-full leading-relaxed">TradeNotes is a journaling and analytics tool. It does not provide financial advice. Trading involves substantial risk of loss; past performance does not guarantee future results.</span>
      </div>
    </footer>
  );
}
