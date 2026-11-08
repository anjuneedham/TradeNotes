import { GLOSSARY } from "@/lib/glossary";
export const metadata = { title: "Learn — TradeNotes" };
export default function Learn() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-4xl font-semibold">Trading metrics, explained</h1>
      <p className="mt-3 text-muted">The numbers TradeNotes calculates, how we calculate them, and how to read them honestly.</p>
      <div className="mt-10 space-y-6">
        {GLOSSARY.map((t) => (
          <section key={t.slug} id={t.slug} className="rounded-lg border border-border bg-panel p-6">
            <h2 className="text-xl font-semibold">{t.term}</h2>
            <p className="mt-1 text-muted">{t.short}</p>
            {t.formula && <p className="mt-3 rounded bg-bg px-3 py-2 font-mono text-sm">{t.formula}</p>}
            <p className="mt-3 text-sm leading-relaxed">{t.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
