import Link from "next/link";
import { PLANS, FOUNDING_OFFER, ANNUAL_MONTHS_FREE, aiQuestions } from "@/lib/plans";
import { TRIAL_DAYS } from "@/lib/plans";
import { PLAN_ORDER, PLAN_BLURB, PLAN_HIGHLIGHTS, planHeadline, featuresDev, paidAddsText, premiumAddsText } from "@/lib/plan-features";
import { PlanComparison } from "@/components/PlanComparison";
import { pageMeta, jsonLd } from "@/lib/seo";
import { foundingSeatsLeft, foundingPriceCents } from "@/lib/founding";
import { Badge, btnCls, btnGhostCls, linkCls } from "@/components/ui";

export const metadata = pageMeta({ title: "Pricing — TradeNotes", description: `TradeNotes pricing: a free trading journal for ${PLANS.free.tradeLimit} trades, Standard at $${PLANS.starter.monthly}/month and Premium at $${PLANS.pro.monthly}/month. Save 2 months with annual billing.`, path: "/pricing" });
export const revalidate = 60; // seat count refreshes at most once a minute

const faq = (): [string, string][] => [
  ["What do I get for paying?", `${paidAddsText().charAt(0).toUpperCase()}${paidAddsText().slice(1)}. Premium adds ${premiumAddsText()}.`],
  ["How many AI Coach questions do I get?", `Free: ${aiQuestions("free")} a month to try it. Standard: about ${aiQuestions("starter")} a month. Premium: about ${aiQuestions("pro")} a month, double Standard. The coach page shows how many you have left and when it refills (the 1st of each month). Long questions that need several lookups use more of your allowance than short ones, which is why the numbers are approximate. The coach analyses your own recorded trades and does not give financial advice.`],
  ["Is there a free trial?", `Yes. Every paid plan (Standard and Premium, monthly or annual) starts with a ${TRIAL_DAYS}-day free trial. You enter your card at checkout and are charged when the trial ends; cancel before then and you pay nothing. The limited founding-member price has no trial. The Free plan needs no card and has no time limit.`],
  ["How does upgrading work?", "Choose a plan, pay on Handypay's secure checkout, and you come back to TradeNotes with your new plan switched on automatically, usually within a minute. We never see your card."],
  ["When am I charged?", "When your 14-day free trial ends (the founding-member price is charged when you subscribe), then automatically each month (or each year, if you choose annual and get 2 months free) on the same date until you cancel. Prices are in US dollars; taxes may apply."],
  ["What happens if I cancel or a payment fails?", "You keep paid access until the end of the period you paid for, then your account returns to Free. Nothing is deleted. If you hold more trades than the Free limit you can still view and analyse all of them — you just can't add new ones."],
  ["Can I get a refund?", "See the Terms for the current refund window on your first payment."],
];

export default async function Pricing() {
  const seats = await foundingSeatsLeft();
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq().map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) }) }} />
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Start free. Pay when your journal outgrows it.</h1>
        <p className="mt-3 text-muted">Three plans, billed monthly or yearly in US dollars. Pay yearly and get 2 months free. No card needed for Free. Cancel any time.</p>
        <p className="mt-3 text-sm text-muted">Want to look first? <Link href="/demo" className={linkCls}>Open the demo</Link>: a fictional sample journal with the real dashboard, analytics and trade pages. No account needed.</p>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {PLAN_ORDER.map((id) => {
          const p = PLANS[id];
          const prev = PLAN_ORDER[PLAN_ORDER.indexOf(id) - 1];
          const dev = featuresDev().filter((f) => f.cells[id] !== false && (!prev || f.cells[prev] === false)); // only what this tier adds
          return (
            <section key={id} aria-labelledby={`plan-${id}`} className={`tn-lift flex flex-col rounded-lg border bg-panel p-5 sm:p-6 ${id === "starter" ? "border-fg" : "border-border"}`}>
              <div className="flex items-center justify-between gap-2"><h2 id={`plan-${id}`} className="text-lg font-semibold">{p.name}</h2>{id === "starter" && <Badge tone="neutral">Most traders</Badge>}</div>
              <p className="mt-3"><span className="fig text-4xl font-medium">${p.monthly}</span><span className="text-sm text-muted"> / month</span></p>
              {id !== "free" && <p className="mt-1 text-xs text-muted">or ${p.annual} / year ({ANNUAL_MONTHS_FREE} months free)</p>}
              <p className="mt-3 text-sm text-muted">{PLAN_BLURB[id]}</p>
              <p className="mt-5 text-sm font-medium">{planHeadline(id)}{id !== "free" && <span className="font-normal text-muted"> · everything in {id === "starter" ? "Free" : PLANS.starter.name}, plus:</span>}</p>
              <ul className="tn-stagger mt-3 space-y-3 text-sm">
                {PLAN_HIGHLIGHTS[id].map(([t, d]) => (
                  <li key={t} className="flex gap-2.5">
                    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="mt-0.5 shrink-0 text-win"><path d="M3 8.5 6.5 12 13 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    <span><span className="font-medium">{t}</span><span className="block text-xs text-muted">{d}</span></span>
                  </li>
                ))}
              </ul>
              {dev.length > 0 && (
                <div className="mt-5 border-t border-border pt-4 text-xs text-muted">
                  <p className="font-medium text-warn">In development — not available yet</p>
                  <ul className="mt-1.5 space-y-1">{dev.map((f) => <li key={f.label}>{f.label}</li>)}</ul>
                </div>
              )}
              <div className="mt-auto pt-6">
                <Link href={id === "free" ? "/signup" : `/app/billing?plan=${id}`} className={`${id === "starter" ? btnCls : btnGhostCls} w-full`}>
                  {id === "free" ? "Start free" : `Choose ${p.name}`}
                </Link>
                {id !== "free" && <p className="mt-2 text-center text-xs text-muted">You&apos;ll create a free account first.</p>}
              </div>
            </section>
          );
        })}
      </div>

      <p className="mt-6 text-sm text-muted">
        <strong className="font-medium text-fg">Founding members:</strong> the first {FOUNDING_OFFER.seats} paying members get {FOUNDING_OFFER.discountPct}% off for {FOUNDING_OFFER.months} months ({PLANS.starter.name} ${foundingPriceCents("starter") / 100}/mo, {PLANS.pro.name} ${foundingPriceCents("pro") / 100}/mo), applied automatically at checkout, in exchange for honest feedback. After {FOUNDING_OFFER.months} months the normal price applies. {seats === null ? "" : seats > 0 ? `${seats} of ${FOUNDING_OFFER.seats} seats left.` : "All founding seats are taken."}
      </p>

      <section aria-labelledby="compare" className="mt-16">
        <h2 id="compare" className="text-xl font-semibold tracking-tight">Compare plans</h2>
        <div className="mt-5 rounded-lg border border-border bg-panel p-4 sm:p-6"><PlanComparison /></div>
      </section>

      <section aria-labelledby="faq" className="mt-16 max-w-3xl">
        <h2 id="faq" className="text-xl font-semibold tracking-tight">Billing questions</h2>
        <dl className="mt-4 divide-y divide-border border-y border-border">
          {faq().map(([q, a]) => (<div key={q} className="py-4"><dt className="font-medium">{q}</dt><dd className="mt-1.5 text-sm leading-relaxed text-muted">{a}</dd></div>))}
        </dl>
        <p className="mt-4 text-xs text-muted">Prices in USD. Taxes may apply. See <Link href="/legal/terms" className={linkCls}>Terms</Link> for cancellation and refunds.</p>
      </section>
    </div>
  );
}
