import Link from "next/link";
import { pageMeta } from "@/lib/seo";
import { FunnelPage } from "@/components/Funnel";
import { PLATFORMS } from "@/lib/marketing";

export const metadata = pageMeta({ title: "Import trades from your broker or platform — TradeNotes", description: "Import MT4, MT5, cTrader, TradingView, Tradovate, NinjaTrader, Thinkorswim, Interactive Brokers, Webull, Binance and Bybit exports into TradeNotes.", path: "/import" });

export default function ImportHub() {
  return (
    <FunnelPage eyebrow="Broker import" title="Import your trades" intro="Upload an export file from your platform, or map any CSV yourself. Import is on paid plans; Free logs trades by hand." src="import-hub" affiliated
      next={[{ href: "/features/broker-import", label: "How import works" }, { href: "/features/analytics", label: "What you see after importing" }, { href: "/pricing", label: "Plans" }]}>
      <ul className="grid gap-2 sm:grid-cols-3">
        {PLATFORMS.map((p) => <li key={p.slug}><Link href={`/import/${p.slug}`} className="block rounded-lg border border-border bg-panel p-4 text-sm hover:border-border-strong">{p.name} →</Link></li>)}
      </ul>
    </FunnelPage>
  );
}
