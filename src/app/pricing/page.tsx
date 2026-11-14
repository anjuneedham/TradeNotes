import Link from "next/link";
import { PLANS } from "@/lib/plans";

const features: Record<string, string[]> = {
  free: ["Up to 50 trades", "Manual trade entry, incl. partial exits and forex lots", "Dashboard with plain-English explanations", "Breakdowns by strategy, session, instrument and weekday", "Beginner guides"],
  starter: ["Up to 2,000 trades", "Everything in Free"],
  pro: ["Unlimited trades", "Everything in Starter"],
};

const soon: Record<string, string[]> = {
  free: [],
  starter: ["CSV import", "Trade screenshots", "Calendar view and weekly reviews"],
  pro: ["Backtesting with historical replay", "Strategy comparison", "Multiple accounts"],
};

export const metadata = { title: "Pricing — TradeNotes" };

export default function Pricing() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-center text-4xl font-semibold">Simple pricing</h1>
      <p className="mt-3 text-center text-muted">Start free. Upgrade when you need more. Cancel any time.</p>
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
              {soon[id].length > 0 && (
                <div className="mt-4 border-t border-border pt-3 text-xs text-muted">
                  <p className="font-medium">In development — not available yet:</p>
                  <ul className="mt-1 space-y-1">{soon[id].map((f) => <li key={f}>○ {f}</li>)}</ul>
                </div>
              )}
              <Link href={id === "free" ? "/signup" : `/app/billing?plan=${id}`} className="mt-6 block rounded-md bg-accent py-2 text-center font-medium text-white">
                {id === "free" ? "Start free" : `Choose ${p.name}`}
              </Link>
            </div>
          );
        })}
      </div>
      <p className="mx-auto mt-8 max-w-2xl text-center text-xs text-muted">Today the paid plans mainly raise your trade limit. You are buying early access at launch pricing; items marked “in development” are not available yet and have no promised date. </p>
      <p className="mt-3 text-center text-xs text-muted">Prices in USD. Taxes may apply. See <Link href="/legal/terms" className="underline">Terms</Link> for cancellation and refunds.</p>
    </div>
  );
}
