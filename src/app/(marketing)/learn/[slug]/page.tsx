import { notFound } from "next/navigation";
import { pageMeta } from "@/lib/seo";
import { FunnelPage, H2 } from "@/components/Funnel";
import { GUIDES } from "@/lib/marketing";

export const dynamicParams = false;
export const generateStaticParams = () => GUIDES.map((g) => ({ slug: g.slug }));
const find = (slug: string) => GUIDES.find((g) => g.slug === slug);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const g = find((await params).slug);
  return g ? pageMeta({ title: `${g.title} — TradeNotes`, description: g.description, path: `/learn/${g.slug}` }) : {};
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const g = find((await params).slug);
  if (!g) notFound();
  return (
    <FunnelPage eyebrow="Learn · Prop firm guides" title={g.title} intro={g.description} src={`guide-${g.slug}`} next={g.next} affiliated>
      {g.sections.map(([h, body]) => <section key={h}><h2 className={H2}>{h}</h2><p className="mt-4">{body}</p></section>)}
      <p className="mt-8 text-sm text-muted">Educational only. Prop firm rules differ and change; always check your own firm&apos;s current rules.</p>
    </FunnelPage>
  );
}
