import { notFound } from "next/navigation";
import { pageMeta } from "@/lib/seo";
import { FunnelPage, H2, Bullets } from "@/components/Funnel";
import { FEATURES } from "@/lib/marketing";

export const dynamicParams = false;
export const generateStaticParams = () => FEATURES.map((f) => ({ slug: f.slug }));
const find = (slug: string) => FEATURES.find((f) => f.slug === slug);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const f = find((await params).slug);
  return f ? pageMeta({ title: `${f.title} — TradeNotes`, description: f.description, path: `/features/${f.slug}` }) : {};
}

export default async function FeaturePage({ params }: { params: Promise<{ slug: string }> }) {
  const f = find((await params).slug);
  if (!f) notFound();
  return (
    <FunnelPage eyebrow={`Feature · ${f.name}`} title={f.title} intro={f.description} src={`feature-${f.slug}`} next={f.next} affiliated={f.slug === "broker-import"}>
      <p className="text-sm text-muted">Available on: {f.plan}</p>
      <h2 className={H2}>What it does</h2>
      <Bullets items={f.points} />
    </FunnelPage>
  );
}
