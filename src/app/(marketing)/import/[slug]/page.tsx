import { notFound } from "next/navigation";
import { pageMeta } from "@/lib/seo";
import { FunnelPage, H2 } from "@/components/Funnel";
import { PLATFORMS } from "@/lib/marketing";
import { PRESETS } from "@/lib/broker-import";
import { PLANS } from "@/lib/plans";
import { LEGAL } from "@/lib/legal";

export const dynamicParams = false;
export const generateStaticParams = () => PLATFORMS.map((p) => ({ slug: p.slug }));
const find = (slug: string) => PLATFORMS.find((p) => p.slug === slug);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const p = find((await params).slug);
  return p ? pageMeta({ title: `Import ${p.name} trades into TradeNotes`, description: `How to export your ${p.name} trade history and import it into the TradeNotes trading journal: fills grouped into trades, duplicates skipped, roll back any import.`, path: `/import/${p.slug}` }) : {};
}

export default async function ImportPlatform({ params }: { params: Promise<{ slug: string }> }) {
  const p = find((await params).slug);
  if (!p) notFound();
  const presets = PRESETS.filter((x) => p.presetIds.includes(x.id));
  const others = PLATFORMS.filter((o) => o.slug !== p.slug).slice(0, 1);
  return (
    <FunnelPage eyebrow="Broker import" title={`Import ${p.name} trades into TradeNotes`} intro={`Export your history from ${p.name}, upload the file, check the preview, import. ${p.note ?? ""}`} src={`import-${p.slug}`} affiliated
      next={[{ href: "/features/analytics", label: "What you see after importing" }, { href: "/import", label: "All supported platforms" }, ...others.map((o) => ({ href: `/import/${o.slug}`, label: `Import ${o.name}` }))]}>
      <h2 className={H2}>Supported export{presets.length > 1 ? "s" : ""}</h2>
      {presets.map((x) => (
        <div key={x.id} className="mt-4 rounded-lg border border-border bg-panel p-4 text-sm">
          <p className="font-medium">{x.name}</p>
          <p className="mt-1">{x.formats}</p>
          <p className="mt-1 text-muted">Where to find it: {x.help}</p>
        </div>
      ))}
      <h2 className={H2}>What happens on import</h2>
      <p className="mt-4">Fills are grouped into trades, times are converted to your time zone, trades already in your journal are skipped, and you can roll back the whole import. Import is included on {PLANS.starter.name} and {PLANS.pro.name}.</p>
      <h2 className={H2}>Please tell us if it breaks</h2>
      <p className="mt-4">This import format was built from sample files laid out like the platform&apos;s export, not from every real account. Platforms change their exports. If your file does not import cleanly or the totals differ from {p.name}&apos;s own report, email {LEGAL.supportEmail} with the problem (remove anything private) and we will fix it. You can always map columns yourself with the generic CSV option.</p>
    </FunnelPage>
  );
}
