import Link from "next/link";
import { getContext } from "@/lib/app-context";
import { PLANS, CHECKOUT_URLS } from "@/lib/plans";
import { PLAN_ORDER, PLAN_BLURB, planHeadline } from "@/lib/plan-features";
import { PlanComparison } from "@/components/PlanComparison";
import { Card, Notice, Badge, Meter, PageHeader, btnCls, btnGhostCls, linkCls } from "@/components/ui";
import { shortDate } from "@/lib/format";
import { LEGAL, isFilled } from "@/lib/legal";
import { foundingSeatsLeft, foundingPriceCents } from "@/lib/founding";
import { FOUNDING_OFFER } from "@/lib/plans";
import { handypayEnabled } from "@/lib/billing/handypay";
import { startCheckout, cancelSubscription, resumeSubscriptionAction, openPortal } from "./actions";

const ERRORS: Record<string, string> = {
  checkout: "We couldn't start checkout just now. Nothing was charged — please try again.",
  "already-subscribed": "You already have an active paid plan, so we didn't start a second subscription.",
  cancel: "We couldn't cancel just now. Nothing changed — please try again.",
  resume: "We couldn't resume your subscription just now. Please try again.",
  portal: "We couldn't open the payment page just now. Please try again.",
  manual: "This subscription was set up by hand, so it is managed by email for now.",
};
interface PaymentRow { id: string; amount_cents: number; currency: string; status: "paid" | "failed" | "refunded"; description: string | null; receipt_url: string | null; occurred_at: string }

export const metadata = { title: "Plan & billing — TradeNotes" };

export default async function Billing({ searchParams }: { searchParams: Promise<{ plan?: string; checkout?: string; error?: string; cancelled?: string; resumed?: string }> }) {
  const { db, user, plan, sub } = await getContext({ requireOnboarded: false });
  const { plan: want, checkout, error, cancelled, resumed } = await searchParams;
  const { used, payments } = await db(async (q) => ({
    used: (await q<{ n: number }>("select count(*)::int as n from tradenotes.trades"))[0].n,
    payments: await q<PaymentRow>("select id, amount_cents, currency, status, description, receipt_url, occurred_at from tradenotes.payments order by occurred_at desc limit 24"),
  }));
  const auto = handypayEnabled();
  const seats = auto && plan === "free" ? await foundingSeatsLeft() : null;
  const offer = seats !== null && seats > 0;
  const managed = auto && Boolean(sub?.provider_subscription_id) && sub?.provider === "handypay";
  const limit = PLANS[plan].tradeLimit;
  const over = limit !== null && used >= limit;
  // A paid subscription row that no longer grants access (cancelled, unpaid or past its period).
  const lapsed = sub && sub.plan !== "free" && sub.plan in PLANS && plan === "free";
  const paid = plan !== "free";
  const end = sub?.current_period_end ? shortDate(sub.current_period_end) : null;
  const support = isFilled(LEGAL.supportEmail) ? LEGAL.supportEmail : null;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader title="Plan & billing" sub={<><Link href="/app/settings" className={linkCls}>Settings</Link> / Plan &amp; billing</>} />

      {checkout === "success" && (plan === "free"
        ? <Notice kind="ok">Payment received by HandyPay. Your plan switches on as soon as they confirm it — usually within a minute. Refresh this page shortly.</Notice>
        : <Notice kind="ok">You&apos;re on {PLANS[plan].name}. Thank you for subscribing.</Notice>)}
      {checkout === "cancelled" && <Notice>Checkout was cancelled. Nothing was charged.</Notice>}
      {error && ERRORS[error] && <Notice kind="error">{ERRORS[error]}</Notice>}
      {cancelled && <Notice kind="ok">Cancellation confirmed. You keep {PLANS[plan].name}{end ? ` until ${end}` : " until the end of the paid period"}; there are no further charges.</Notice>}
      {resumed && <Notice kind="ok">Your subscription will continue to renew as normal.</Notice>}
      {sub?.status === "past_due" && paid && <Notice kind="warn">Your last payment failed. HandyPay will retry your card; you keep {PLANS[plan].name} for a few days while it does. Update your card to avoid moving to Free.</Notice>}
      {lapsed && (
        <Notice kind="warn">
          <p className="font-medium">Your {PLANS[sub.plan as keyof typeof PLANS].name} subscription is no longer active{sub.status && sub.status !== "active" ? ` (${sub.status.replace(/_/g, " ")})` : ""}.</p>
          <p className="mt-1">Your account is on the Free plan. All your trades and statistics are still here; you can&apos;t add new trades while you hold more than {PLANS.free.tradeLimit}. Subscribe again below to restore your limit{support ? `, or email ${support} if you believe this is a mistake` : ""}.</p>
        </Notice>
      )}

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs text-muted">Current plan</p>
            <p className="mt-1 flex items-center gap-2.5 text-2xl font-semibold tracking-tight">{PLANS[plan].name}{paid && (sub?.cancel_at_period_end ? <Badge tone="warn">Ends {end ?? "at period end"}</Badge> : sub?.status === "past_due" ? <Badge tone="warn">Payment failed</Badge> : <Badge tone="win">{sub?.status === "trialing" ? "Trial" : "Active"}</Badge>)}</p>
          </div>
          <div className="text-right">
            <p className="fig text-2xl font-medium">${PLANS[plan].monthly}<span className="font-sans text-sm font-normal text-muted"> / month</span></p>
            <p className="mt-1 text-xs text-muted">{paid ? (sub?.cancel_at_period_end ? `Cancelled. Access until ${end ?? "the end of the paid period"}, then Free.` : end ? `Paid through ${end}. Renews automatically each month unless cancelled.` : "Renews automatically each month unless cancelled.") : "No charge. No card on file."}</p>
          </div>
        </div>
        <div className="mt-5 border-t border-border pt-4">
          <div className="flex items-baseline justify-between text-sm">
            <span>Trades stored</span>
            <span className="fig">{used.toLocaleString("en-US")} <span className="text-muted">of {limit === null ? "unlimited" : limit.toLocaleString("en-US")}</span></span>
          </div>
          {limit !== null && <div className="mt-2"><Meter value={used} max={limit} label="Trades stored against your plan limit" /></div>}
          {over && <p className="mt-2 text-sm text-warn">You&apos;ve reached this plan&apos;s limit. Existing trades stay available; new trades need a higher plan.</p>}
        </div>
      </Card>

      {offer && <Notice kind="ok"><strong className="font-medium">Founding member offer:</strong> {seats} of {FOUNDING_OFFER.seats} seats left. {FOUNDING_OFFER.discountPct}% off for {FOUNDING_OFFER.months} months, applied automatically when you subscribe (Starter ${foundingPriceCents("starter") / 100}/mo, Pro ${foundingPriceCents("pro") / 100}/mo), in exchange for honest feedback.</Notice>}

      <section aria-labelledby="change" className="space-y-3">
        <h2 id="change" className="text-lg font-semibold tracking-tight">{paid ? "Change plan" : "Upgrade"}</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {PLAN_ORDER.map((id) => (
            <Card key={id} className={`flex flex-col ${want === id && plan !== id ? "border-fg" : ""}`}>
              <div className="flex items-center justify-between"><h3 className="font-medium">{PLANS[id].name}</h3>{plan === id && <Badge tone="accent">Your plan</Badge>}</div>
              <p className="fig mt-2 text-2xl font-medium">{offer && id !== "free" && <s className="mr-2 text-base text-muted">${PLANS[id].monthly}</s>}${offer && id !== "free" ? foundingPriceCents(id) / 100 : PLANS[id].monthly}<span className="font-sans text-sm font-normal text-muted"> / month</span></p>
              <p className="mt-2 text-sm font-medium">{planHeadline(id)}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">{PLAN_BLURB[id]}</p>
              <div className="mt-auto pt-4">
                {plan === id ? <p className="text-xs text-muted">This is your current plan.</p>
                  : id === "free" ? <p className="text-xs text-muted">To move to Free, cancel your subscription (see below). You keep paid access until the period you paid for ends.</p>
                  : paid ? <p className="text-xs leading-relaxed text-muted">To switch to {PLANS[id].name}, {support ? `email ${support}` : "contact support"} so we can move your existing subscription. Subscribing again here would start a second one.</p>
                  : auto ? <form action={startCheckout}><input type="hidden" name="plan" value={id} /><button className={`${want === id ? btnCls : btnGhostCls} w-full`}>Subscribe to {PLANS[id].name}</button></form>
                  : <a href={CHECKOUT_URLS[id]} target="_blank" rel="noopener noreferrer" className={`${want === id ? btnCls : btnGhostCls} w-full`}>Subscribe to {PLANS[id].name}<span className="sr-only"> (opens Handypay checkout in a new tab)</span> ↗</a>}
              </div>
            </Card>
          ))}
        </div>
      </section>

      {managed && paid && (
        <Card>
          <h2 className="font-medium">Manage subscription</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <form action={openPortal}><button className={btnGhostCls}>Update card &amp; invoices ↗</button></form>
            {sub?.cancel_at_period_end
              ? <form action={resumeSubscriptionAction}><button className={btnCls}>Resume subscription</button></form>
              : <form action={cancelSubscription}><button className={btnGhostCls}>Cancel subscription</button></form>}
          </div>
          <p className="mt-3 text-xs text-muted">{sub?.cancel_at_period_end ? `No further charges. You keep ${PLANS[plan].name} until ${end ?? "the end of the paid period"}.` : "Cancelling stops the next renewal. You keep your plan until the end of the period you've paid for; nothing is deleted."}</p>
        </Card>
      )}

      {payments.length > 0 && (
        <Card>
          <h2 className="font-medium">Payment history</h2>
          <ul className="mt-3 divide-y divide-border text-sm">
            {payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                <span>{shortDate(p.occurred_at)} · {p.description ?? "Payment"}</span>
                <span className="flex items-baseline gap-3">
                  <span className="fig">{(p.amount_cents / 100).toLocaleString("en-US", { style: "currency", currency: p.currency })}</span>
                  <Badge tone={p.status === "paid" ? "win" : p.status === "failed" ? "warn" : "neutral"}>{p.status}</Badge>
                  {p.receipt_url && /^https:\/\//.test(p.receipt_url) ? <a href={p.receipt_url} target="_blank" rel="noopener noreferrer" className={linkCls}>Receipt</a> : null}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {!auto && <Card>
        <h2 className="font-medium">How subscribing works</h2>
        <ol className="mt-3 space-y-3 text-sm">
          {[
            ["Pay on Handypay", <>The button opens Handypay&apos;s secure checkout in a new tab. Use <strong className="font-medium text-fg">the same email as this account ({user.email})</strong> so we can match the payment to you. We never see your card.</>],
            ["We confirm and activate", <>Activation is done by hand right now, usually within a few hours and within one business day. Until then this page still shows your old plan — that is expected, and you have not been charged twice.</>],
            ["You're charged monthly", <>The same amount on the same date each month, in US dollars, until you cancel. Taxes may apply.</>],
          ].map(([t, d], i) => (
            <li key={i} className="flex gap-3"><span className="fig grid h-6 w-6 shrink-0 place-items-center rounded-full border border-border-strong text-xs text-muted">{i + 1}</span><span className="text-muted"><strong className="font-medium text-fg">{t}</strong> — {d}</span></li>
          ))}
        </ol>
        <p className="mt-4 text-xs text-muted">Paid but not activated after one business day?{support ? ` Email ${support} from your account email with your Handypay receipt.` : " Contact support from your account email with your Handypay receipt."}</p>
      </Card>}

      <Card>
        <h2 className="font-medium">Cancelling, downgrading and failed payments</h2>
        <dl className="mt-3 space-y-3 text-sm">
          <div><dt className="font-medium">To cancel or switch plan</dt><dd className="mt-0.5 text-muted">{managed ? "Use Cancel subscription above, or the" : "Use the"} manage link in your Handypay receipt email{support ? `, or email ${support}` : ", or contact support"}. There is no cancellation fee and no questions to answer first.</dd></div>
          <div><dt className="font-medium">After you cancel</dt><dd className="mt-0.5 text-muted">No further charges. You keep your paid plan until the end of the period you&apos;ve paid for, then move to Free.</dd></div>
          <div><dt className="font-medium">If a payment fails</dt><dd className="mt-0.5 text-muted">HandyPay retries your card. You keep your plan until the paid period ends plus a 3-day grace period; if payment still fails, your account returns to Free. Subscribe again to restore it.</dd></div>
          <div><dt className="font-medium">Your data on Free</dt><dd className="mt-0.5 text-muted">Nothing is deleted. You can view and analyse every trade you&apos;ve logged; you can only add new ones while you are under the Free limit of {PLANS.free.tradeLimit}.</dd></div>
        </dl>
        <p className="mt-4 text-xs text-muted">Receipts are sent to your email by Handypay{auto ? "; payments we've received are listed above" : ""}. Full terms: <Link href="/legal/terms" className={linkCls}>Terms of Service</Link>.</p>
      </Card>

      <details className="rounded-lg border border-border bg-panel p-4 sm:p-5" open={Boolean(want)}>
        <summary className="cursor-pointer font-medium">Compare all plans</summary>
        <div className="mt-4"><PlanComparison current={plan} /></div>
      </details>
    </div>
  );
}
