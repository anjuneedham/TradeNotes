import Link from "next/link";
import { PLANS, FOUNDING_OFFER } from "@/lib/plans";
import { PLAN_ORDER, PLAN_BLURB, planHeadline, FEATURES_DEV } from "@/lib/plan-features";
import { PlanComparison } from "@/components/PlanComparison";
import { Badge, btnCls, btnGhostCls, linkCls } from "@/components/ui";

export const metadata = { title: "Pricing — TradeNotes" };

const FAQ: [string, string][] = [
  ["What do I get for paying today?", "A higher trade limit. Every journaling and analytics feature that exists today is in the Free plan. Paid plans are early access at launch pricing; features marked “in development” are not available yet and have no promised date."],
  ["How does upgrading work?", "You subscribe through Handypay's hosted checkout using the same email as your TradeNotes account. We confirm the payment and switch your plan on by hand, usually within a few hours and within one business day."],
  ["When am I charged?", "When you subscribe, then automatically each month on the same date until you cancel. Prices are in US dollars; taxes may apply."],
  ["What happens if I cancel or a payment fails?", "You keep paid access until the end of the period you paid for, then your account returns to Free. Nothing is deleted. If you hold more trades than the Free limit you can still view and analyse all of them — you just can't add new ones."],
  ["Can I get a refund?", "See the Terms for the current refund window on your first payment."],
];

export default function Pricing() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Start free. Pay when your journal outgrows it.</h1>
        <p className="mt-3 text-muted">Three plans, billed monthly in US dollars. No card needed for Free. Cancel any time.</p>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {PLAN_ORDER.map((id) => {
          const p = PLANS[id];
          const prev = PLAN_ORDER[PLAN_ORDER.indexOf(id) - 1];
          const dev = FEATURES_DEV.filter((f) => f.cells[id] !== false && (!prev || f.cells[prev] === false)); // only what this tier adds
          return (
            <section key={id} aria-labelledby={`plan-${id}`} className={`flex flex-col rounded-lg border bg-panel p-5 sm:p-6 ${id === "starter" ? "border-fg" : "border-border"}`}>
              <div className="flex items-center justify-between gap-2"><h2 id={`plan-${id}`} className="text-lg font-semibold">{p.name}</h2>{id === "starter" && <Badge tone="neutral">Most traders</Badge>}</div>
              <p className="mt-3"><span className="fig text-4xl font-medium">${p.monthly}</span><span className="text-sm text-muted"> / month</span></p>
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
        <strong className="font-medium">Plain terms:</strong> today the paid plans mainly raise your trade limit. You are buying early access at launch pricing; items marked “in development” are not available yet and have no promised date.
      </p>
      <p className="mt-3 text-sm text-muted">
        <strong className="font-medium text-fg">Founding members:</strong> the first {FOUNDING_OFFER.seats} paying members can get {FOUNDING_OFFER.discountPct}% off for {FOUNDING_OFFER.months} months in exchange for honest feedback. Ask for it after signing up.
      </p>

      <section aria-labelledby="compare" className="mt-16">
        <h2 id="compare" className="text-xl font-semibold tracking-tight">Compare plans</h2>
        <div className="mt-5 rounded-lg border border-border bg-panel p-4 sm:p-6"><PlanComparison /></div>
      </section>

      <section aria-labelledby="faq" className="mt-16 max-w-3xl">
        <h2 id="faq" className="text-xl font-semibold tracking-tight">Billing questions</h2>
        <dl className="mt-4 divide-y divide-border border-y border-border">
          {FAQ.map(([q, a]) => (<div key={q} className="py-4"><dt className="font-medium">{q}</dt><dd className="mt-1.5 text-sm leading-relaxed text-muted">{a}</dd></div>))}
        </dl>
        <p className="mt-4 text-xs text-muted">Prices in USD. Taxes may apply. See <Link href="/legal/terms" className={linkCls}>Terms</Link> for cancellation and refunds.</p>
      </section>
    </div>
  );
}
