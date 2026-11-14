import Link from "next/link";
import { Badge, btnCls, btnGhostCls } from "@/components/ui";
import { demoTrades } from "@/lib/demo-data";

/** Wrapper for every /demo page: the SAMPLE DATA banner is here, so no demo page can be shown without it. */
export default function DemoLayout({ children }: { children: React.ReactNode }) {
  const first = demoTrades()[demoTrades().length - 1]; // the most recent sample trade
  return (
    <div className="mx-auto max-w-6xl px-4 py-5 sm:py-8">
      <div role="note" aria-label="Sample data" data-testid="sample-banner" className="mb-5 rounded-lg border border-warn/60 bg-warn/10 px-4 py-3 text-sm leading-relaxed">
        <p className="flex flex-wrap items-center gap-2 font-semibold"><Badge tone="warn">Sample data</Badge>SAMPLE DATA: a fictional journal, not real trades</p>
        <p className="mt-1 text-muted">Everything on these pages is made up to show you how TradeNotes looks and what its numbers mean. It is read-only, needs no account, and is not a performance claim or financial advice.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/signup" className={`${btnCls} !min-h-10`}>Start free with your own trades</Link>
          <Link href="/pricing" className={`${btnGhostCls} !min-h-10`}>See pricing</Link>
        </div>
      </div>
      <nav aria-label="Demo pages" className="mb-5 flex flex-wrap gap-2 text-sm">
        <Link href="/demo" className={`${btnGhostCls} !min-h-10`}>Dashboard</Link>
        <Link href="/demo/analytics" className={`${btnGhostCls} !min-h-10`}>Analytics</Link>
        <Link href={`/demo/trades/${first.id}`} className={`${btnGhostCls} !min-h-10`}>A sample trade</Link>
      </nav>
      {children}
    </div>
  );
}
