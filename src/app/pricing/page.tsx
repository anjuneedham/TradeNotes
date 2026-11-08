import Link from "next/link";
import { PLANS, FOUNDING_OFFER } from "@/lib/plans";

const features: Record<string, string[]> = {
  free: ["Up to 50 trades", "Manual trade entry", "Core metrics with explanations", "Beginner guides"],
  starter: ["Up to 2,000 trades", "CSV import with duplicate detection", "Full journal: notes, emotions, mistakes, screenshots", "Calendar, daily & weekly reviews", "Strategy / session / weekday breakdowns"],
  pro: ["Unlimited trades", "Everything in Starter", "Backtesting with candle replay", "Strategy comparison", "Up to 10 accounts"],
};

export const metadata = { title: "Pricing — TradeNotes" };

export default function Pricing() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-center text-4xl font-semibold">Simple pricing</h1>
      <p className="mt-3 text-center text-muted">Start free. Upgrade when you need more. Cancel any time.</p>
      <div className="mx-auto mt-6 max-w-2xl rounded-lg border border-accent/50 bg-accent/10 p-4 text-center text-sm">
        <strong>Founding members:</strong> the first {FOUNDING_OFFER.seats} paying members can get {FOUNDING_OFFER.discountPct}% off for {FOUNDING_OFFER.months} months in exchange for honest feedback. Ask for it after signing up.
      </div>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {(Object.keys(PLANS) as (keyof typeof PLANS)[]).map((id) => {
          const p = PLANS[id];
          return (
            <div key={id} className={`rounded-lg border bg-panel p-6 ${id === "pro" ? "border-accent" : "border-border"}`}>
              <h2 className="text-lg font-semibold">{p.name}</h2>
              <p className="mt-2 text-3xl font-semibold">${p.monthly}<span className="text-base font-normal text-muted">/mo</span></p>
              {p.annual > 0 && <p className="text-xs text-muted">Billed monthly. Annual billing coming soon.</p>}
              <ul className="mt-6 space-y-2 text-sm">
                {features[id].map((f) => <li key={f}>✓ {f}</li>)}
              </ul>
              <Link href={id === "free" ? "/signup" : `/app/billing?plan=${id}`} className="mt-6 block rounded-md bg-accent py-2 text-center font-medium text-white">
                {id === "free" ? "Start free" : `Choose ${p.name}`}
              </Link>
            </div>
          );
        })}
      </div>
      <p className="mt-8 text-center text-xs text-muted">Prices in USD. Taxes may apply. See <Link href="/legal/terms" className="underline">Terms</Link> for cancellation and refunds.</p>
    </div>
  );
}
