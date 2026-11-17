import { James } from "@/components/James";
import { GLOSSARY } from "@/lib/glossary";
import { GUIDES, FEATURES } from "@/lib/marketing";
import { Cta, NextSteps } from "@/components/Funnel";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import { Eyebrow, linkCls } from "@/components/ui";

export const metadata = pageMeta({ title: "Trading metrics explained — TradeNotes", description: "Plain-English guide to the trading metrics a journal tracks: win rate, profit factor, expectancy, R-multiple, drawdown and more, with examples.", path: "/learn" });
export default function Learn() {
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 lg:grid-cols-[14rem_minmax(0,1fr)]">
      <nav aria-label="On this page" className="hidden lg:block">
        <div className="sticky top-20">
          <Eyebrow>On this page</Eyebrow>
          <ul className="mt-3 space-y-1.5 text-sm">{GLOSSARY.map((t) => <li key={t.slug}><a href={`#${t.slug}`} className="text-muted hover:text-fg">{t.term}</a></li>)}</ul>
        </div>
      </nav>
      <div className="max-w-3xl">
        <James pose="read" size={80} className="mb-2 text-fg" label="James reading his notes" />
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Trading metrics, explained</h1>
        <p className="mt-3 text-muted">The numbers TradeNotes calculates, how we calculate them, and how to read them honestly.</p>
        <div className="mt-8 rounded-xl border border-border bg-panel p-5">
          <Eyebrow>Guides</Eyebrow>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/learn/r-multiple-prop-firm-challenge" className={linkCls}>R-multiple explained: the number that decides your prop firm challenge (free calculator)</Link></li>
            <li><Link href="/learn/trading-expectancy-formula" className={linkCls}>Trading expectancy formula: is your strategy actually profitable? (free calculator)</Link></li>
            {GUIDES.map((g) => <li key={g.slug}><Link href={`/learn/${g.slug}`} className={linkCls}>{g.title}</Link></li>)}
            <li><Link href="/free" className={linkCls}>Free trading journal template + 30-trade review checklist</Link></li>
          </ul>
          <Eyebrow>Categories</Eyebrow>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <li><a href="#win-rate" className={linkCls}>Metrics glossary</a></li>
            <li><Link href="/prop-firm-traders" className={linkCls}>Prop firm traders</Link></li>
            <li><Link href="/import" className={linkCls}>Broker import</Link></li>
            {FEATURES.slice(0, 3).map((f) => <li key={f.slug}><Link href={`/features/${f.slug}`} className={linkCls}>{f.name}</Link></li>)}
          </ul>
        </div>
        <div className="mt-10 divide-y divide-border border-y border-border">
          {GLOSSARY.map((t) => (
            <section key={t.slug} id={t.slug} className="scroll-mt-20 py-7">
              <h2 className="text-xl font-semibold tracking-tight">{t.term}</h2>
              <p className="mt-1 text-muted">{t.short}</p>
              {t.formula && <p className="fig mt-3 overflow-x-auto rounded-md border border-border bg-panel px-3 py-2 text-sm">{t.formula}</p>}
              <p className="mt-3 text-sm leading-relaxed">{t.body}</p>
            </section>
          ))}
        </div>
        <Cta src="learn" />
        <NextSteps links={[{ href: "/prop-firm-traders", label: "For prop-firm traders" }, { href: "/features/analytics", label: "Analytics in R" }, { href: "/how-it-works", label: "How it works & FAQ" }]} />
      </div>
    </div>
  );
}
