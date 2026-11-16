import { notFound } from "next/navigation";
import { pageMeta } from "@/lib/seo";
import { FunnelPage, H2, Bullets } from "@/components/Funnel";
import { COMPETITORS, OFFER } from "@/lib/marketing";
import { linkCls } from "@/components/ui";

export const dynamicParams = false;
export const generateStaticParams = () => COMPETITORS.map((c) => ({ slug: c.slug }));
const find = (slug: string) => COMPETITORS.find((c) => c.slug === slug);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const c = find((await params).slug);
  return c ? pageMeta({ title: `TradeNotes vs ${c.name} — trading journal comparison`, description: `A factual, dated comparison of TradeNotes and ${c.name}: pricing checked on ${c.checked}, and what TradeNotes includes.`, path: `/compare/${c.slug}` }) : {};
}

export default async function ComparePage({ params }: { params: Promise<{ slug: string }> }) {
  const c = find((await params).slug);
  if (!c) notFound();
  return (
    <FunnelPage eyebrow="Compare" title={`TradeNotes vs ${c.name}`} intro={`${c.name} is an established trading journal. This page sets out what we could verify about it and what TradeNotes offers, so you can decide for yourself.`} src={`compare-${c.slug}`} affiliated
      next={[{ href: "/pricing", label: "TradeNotes pricing" }, { href: "/features", label: "All TradeNotes features" }, { href: "/compare", label: "Other comparisons" }]}>
      <h2 className={H2}>{c.name} pricing</h2>
      {c.pricing
        ? <p className="mt-4">{c.pricing.text} <span className="text-sm text-muted">(Checked {c.checked}; <a href={c.pricing.source} rel="nofollow noopener" target="_blank" className={linkCls}>source</a>. Prices change; check their site.)</span></p>
        : <p className="mt-4">We could not read {c.name}&apos;s pricing page on {c.checked}, so we do not state it here. See <a href={c.site} rel="nofollow noopener" target="_blank" className={linkCls}>{c.name}&apos;s website</a> for current plans.</p>}
      <h2 className={H2}>TradeNotes</h2>
      <p className="mt-4">{OFFER.free} {OFFER.paid}</p>
      <Bullets items={["Analytics in R after fees, with sample-size warnings", "Broker import from 11 platforms on paid plans (built from sample files; report problems)", "Calendar, reviews and a playbook with rule-adherence results", "An AI Coach that answers with your own numbers", "Public demo with sample data, no signup needed"]} />
      <p className="mt-6 text-sm text-muted">We have not tested {c.name} feature by feature, so we make no claims about what it does or does not include.</p>
    </FunnelPage>
  );
}
