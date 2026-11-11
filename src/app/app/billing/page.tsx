import Link from "next/link";
import { getContext } from "@/lib/app-context";
import { PLANS, CHECKOUT_URLS } from "@/lib/plans";
import { PLAN_ORDER, PLAN_BLURB, planHeadline } from "@/lib/plan-features";
import { PlanComparison } from "@/components/PlanComparison";
import { Card, Notice, Badge, Meter, PageHeader, btnCls, btnGhostCls, linkCls } from "@/components/ui";
import { shortDate } from "@/lib/format";
import { LEGAL, isFilled } from "@/lib/legal";

export const metadata = { title: "Plan & billing — TradeNotes" };

export default async function Billing({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const { db, user, plan, sub } = await getContext({ requireOnboarded: false });
  const { plan: want } = await searchParams;
  const used = (await db((q) => q<{ n: number }>("select count(*)::int as n from tradenotes.trades")))[0].n;
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
            <p className="mt-1 flex items-center gap-2.5 text-2xl font-semibold tracking-tight">{PLANS[plan].name}{paid && <Badge tone="win">{sub?.status === "trialing" ? "Trial" : "Active"}</Badge>}</p>
          </div>
          <div className="text-right">
            <p className="fig text-2xl font-medium">${PLANS[plan].monthly}<span className="font-sans text-sm font-normal text-muted"> / month</span></p>
            <p className="mt-1 text-xs text-muted">{paid ? (end ? `Paid through ${end}. Renews automatically each month unless cancelled.` : "Renews automatically each month unless cancelled.") : "No charge. No card on file."}</p>
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

      <section aria-labelledby="change" className="space-y-3">
        <h2 id="change" className="text-lg font-semibold tracking-tight">{paid ? "Change plan" : "Upgrade"}</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {PLAN_ORDER.map((id) => (
            <Card key={id} className={`flex flex-col ${want === id && plan !== id ? "border-fg" : ""}`}>
              <div className="flex items-center justify-between"><h3 className="font-medium">{PLANS[id].name}</h3>{plan === id && <Badge tone="accent">Your plan</Badge>}</div>
              <p className="fig mt-2 text-2xl font-medium">${PLANS[id].monthly}<span className="font-sans text-sm font-normal text-muted"> / month</span></p>
              <p className="mt-2 text-sm font-medium">{planHeadline(id)}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">{PLAN_BLURB[id]}</p>
              <div className="mt-auto pt-4">
                {plan === id ? <p className="text-xs text-muted">This is your current plan.</p>
                  : id === "free" ? <p className="text-xs text-muted">To move to Free, cancel your subscription (see below). You keep paid access until the period you paid for ends.</p>
                  : <a href={CHECKOUT_URLS[id]} target="_blank" rel="noopener noreferrer" className={`${want === id ? btnCls : btnGhostCls} w-full`}>Subscribe to {PLANS[id].name}<span className="sr-only"> (opens Handypay checkout in a new tab)</span> ↗</a>}
              </div>
            </Card>
          ))}
        </div>
      </section>

      <Card>
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
      </Card>

      <Card>
        <h2 className="font-medium">Cancelling, downgrading and failed payments</h2>
        <dl className="mt-3 space-y-3 text-sm">
          <div><dt className="font-medium">To cancel or switch plan</dt><dd className="mt-0.5 text-muted">Use the manage link in your Handypay receipt email{support ? `, or email ${support}` : ", or contact support"}. There is no cancellation fee and no questions to answer first.</dd></div>
          <div><dt className="font-medium">After you cancel</dt><dd className="mt-0.5 text-muted">No further charges. You keep your paid plan until the end of the period you&apos;ve paid for, then move to Free.</dd></div>
          <div><dt className="font-medium">If a payment fails</dt><dd className="mt-0.5 text-muted">Your account returns to Free when the paid period ends. Subscribe again to restore it.</dd></div>
          <div><dt className="font-medium">Your data on Free</dt><dd className="mt-0.5 text-muted">Nothing is deleted. You can view and analyse every trade you&apos;ve logged; you can only add new ones while you are under the Free limit of {PLANS.free.tradeLimit}.</dd></div>
        </dl>
        <p className="mt-4 text-xs text-muted">Receipts and payment history are kept by Handypay and sent to your email; they aren&apos;t shown here yet. Full terms: <Link href="/legal/terms" className={linkCls}>Terms of Service</Link>.</p>
      </Card>

      <details className="rounded-lg border border-border bg-panel p-4 sm:p-5" open={Boolean(want)}>
        <summary className="cursor-pointer font-medium">Compare all plans</summary>
        <div className="mt-4"><PlanComparison current={plan} /></div>
      </details>
    </div>
  );
}
