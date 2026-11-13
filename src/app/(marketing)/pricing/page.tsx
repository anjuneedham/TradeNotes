import Link from "next/link";
import { PLANS, FOUNDING_OFFER, ANNUAL_MONTHS_FREE } from "@/lib/plans";
import { TRIAL_DAYS } from "@/lib/plans";
import { PLAN_ORDER, PLAN_BLURB, planHeadline, featuresDev, paidAddsText } from "@/lib/plan-features";
import { PlanComparison } from "@/components/PlanComparison";
import { pageMeta, jsonLd } from "@/lib/seo";
import { foundingSeatsLeft, foundingPriceCents } from "@/lib/founding";
import { Badge, btnCls, btnGhostCls, linkCls } from "@/components/ui";

export const metadata = pageMeta({ title: "Pricing — TradeNotes", description: `TradeNotes pricing: a free trading journal for ${PLANS.free.tradeLimit} trades, Standard at $${PLANS.starter.monthly}/month and Premium at $${PLANS.pro.monthly}/month. Save 2 months with annual billing.`, path: "/pricing" });
export const revalidate = 60; // seat count refreshes at most once a minute

const faq = (): [string, string][] => [
  ["What do I get for paying today?", `${paidAddsText().charAt(0).toUpperCase()}${paidAddsText().slice(1)}. Every other journaling and analytics feature that exists today is in the Free plan. Paid plans are early access at launch pricing; features marked “in development” are not available yet and have no promised date.`],
  ["Is there a free trial?", `Yes. Every paid plan (Standard and Premium, monthly or annual) starts with a ${TRIAL_DAYS}-day free trial. You enter your card at checkout and are charged when the trial ends; cancel before then and you pay nothing. The limited founding-member price has no trial. The Free plan needs no card and has no time limit.`],
  ["How does upgrading work?", "You subscribe through Handypay's hosted checkout using the same email as your TradeNotes account. We confirm the payment and switch your plan on by hand, usually within a few hours and within one business day."],
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
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {PLAN_ORDER.map((id) => {
          const p = PLANS[id];
          const prev = PLAN_ORDER[PLAN_ORDER.indexOf(id) - 1];
          const dev = featuresDev().filter((f) => f.cells[id] !== false && (!prev || f.cells[prev] === false)); // only what this tier adds
          return (
            <section key={id} aria-labelledby={`plan-${id}`} className={`flex flex-col rounded-lg border bg-panel p-5 sm:p-6 ${id === "starter" ? "border-fg" : "border-border"}`}>
              <div className="flex items-center justify-between gap-2"><h2 id={`plan-${id}`} className="text-lg font-semibold">{p.name}</h2>{id === "starter" && <Badge tone="neutral">Most traders</Badge>}</div>
              <p className="mt-3"><span className="fig text-4xl font-medium">${p.monthly}</span><span className="text-sm text-muted"> / month</span></p>
              {id !== "free" && <p className="mt-1 text-xs text-muted">or ${p.annual} / year ({ANNUAL_MONTHS_FREE} months free)</p>}
              <p className="mt-3 text-sm text-muted">{PLAN_BLURB[id]}</p>
              <ul className="mt-5 space-y-2 text-sm">
                <li className="font-medium">{planHeadline(id)}</li>
                <li className="text-muted">{id === "free" ? "Full journal, dashboard and analytics" : id === "starter" ? "Everything in Free" : "Everything in Standard"}</li>
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

      <p className="mt-5 rounded-md border border-border bg-raised px-4 py-3 text-sm leading-relaxed">
        <strong className="font-medium">Plain terms:</strong> today the paid plans add {paidAddsText()}. You are buying early access at launch pricing; items marked “in development” are not available yet and have no promised date.
      </p>
      <p className="mt-3 text-sm text-muted">
        <strong className="font-medium text-fg">Founding members:</strong> the first {FOUNDING_OFFER.seats} paying members get {FOUNDING_OFFER.discountPct}% off for {FOUNDING_OFFER.months} months (Starter ${foundingPriceCents("starter") / 100}/mo, Pro ${foundingPriceCents("pro") / 100}/mo), applied automatically at checkout, in exchange for honest feedback. After {FOUNDING_OFFER.months} months the normal price applies. {seats === null ? "" : seats > 0 ? `${seats} of ${FOUNDING_OFFER.seats} seats left.` : "All founding seats are taken."}
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
