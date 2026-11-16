import Link from "next/link";
import { pageMeta } from "@/lib/seo";
import { FunnelPage } from "@/components/Funnel";
import { FEATURES } from "@/lib/marketing";

export const metadata = pageMeta({ title: "Features — TradeNotes trading journal", description: "Broker import, analytics in R, calendar and reviews, playbook, AI Coach, multiple accounts and share links.", path: "/features" });

export default function Features() {
  return (
    <FunnelPage eyebrow="Features" title="What TradeNotes does today" intro="Every feature listed here is built and available. Things that are not built yet are on the changelog, marked as such." src="features"
      next={[{ href: "/prop-firm-traders", label: "For prop-firm traders" }, { href: "/how-it-works", label: "How it works & FAQ" }, { href: "/changelog", label: "Changelog and what is not built yet" }]}>
      <ul className="grid gap-3 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <li key={f.slug}><Link href={`/features/${f.slug}`} className="block h-full rounded-lg border border-border bg-panel p-5 hover:border-border-strong"><p className="font-medium">{f.name}</p><p className="mt-1 text-sm text-muted">{f.description}</p></Link></li>
        ))}
      </ul>
    </FunnelPage>
  );
}
