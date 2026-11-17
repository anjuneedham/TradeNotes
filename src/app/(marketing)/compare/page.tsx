import Link from "next/link";
import { pageMeta } from "@/lib/seo";
import { FunnelPage } from "@/components/Funnel";
import { COMPETITORS } from "@/lib/marketing";

export const metadata = pageMeta({ title: "TradeNotes compared with other trading journals", description: "Factual, dated comparisons of TradeNotes with TradeZella, TraderSync, Tradervue, Edgewonk and TradesViz.", path: "/compare" });

export default function CompareHub() {
  return (
    <FunnelPage eyebrow="Compare" title="TradeNotes compared" intro="Short, dated notes on how TradeNotes differs. We only state competitor facts we could check on their own site, with the date and a link." src="compare-hub"
      next={[{ href: "/pricing", label: "TradeNotes pricing" }, { href: "/features", label: "All features" }, { href: "/how-it-works", label: "How it works & FAQ" }]}>
      <ul className="grid gap-2 sm:grid-cols-2">
        {COMPETITORS.map((c) => <li key={c.slug}><Link href={`/compare/${c.slug}`} className="block rounded-lg border border-border bg-panel p-4 text-sm hover:border-border-strong">TradeNotes vs {c.name} →</Link></li>)}
      </ul>
    </FunnelPage>
  );
}
