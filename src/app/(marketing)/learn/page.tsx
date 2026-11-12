import { GLOSSARY } from "@/lib/glossary";
import { pageMeta } from "@/lib/seo";
import { Eyebrow } from "@/components/ui";

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
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Trading metrics, explained</h1>
        <p className="mt-3 text-muted">The numbers TradeNotes calculates, how we calculate them, and how to read them honestly.</p>
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
      </div>
    </div>
  );
}
