import { pageMeta } from "@/lib/seo";
import { FunnelPage, H2, Bullets } from "@/components/Funnel";
import { SHIPPED, NOT_YET } from "@/lib/marketing";

export const metadata = pageMeta({ title: "Changelog and roadmap — TradeNotes", description: "What TradeNotes has shipped, and what is not available yet.", path: "/changelog" });

export default function Changelog() {
  return (
    <FunnelPage eyebrow="Changelog" title="Shipped, and not available yet" intro="An honest list. Items under “not available yet” are not built and have no promised date." src="changelog" free={false}
      next={[{ href: "/features", label: "Features" }, { href: "/how-it-works", label: "How it works & FAQ" }, { href: "/partners", label: "Partner program" }]}>
      <h2 className={H2}>Shipped</h2>
      <Bullets items={SHIPPED} />
      <h2 className={H2}>Not available yet</h2>
      <Bullets items={NOT_YET} />
    </FunnelPage>
  );
}
