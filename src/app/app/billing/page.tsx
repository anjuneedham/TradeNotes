import { getContext } from "@/lib/app-context";
import { PLANS, CHECKOUT_URLS } from "@/lib/plans";
import { Card, Notice, btnCls } from "@/components/ui";

export const metadata = { title: "Billing — TradeNotes" };

export default async function Billing({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const { user, plan, sub } = await getContext({ requireOnboarded: false });
  const { plan: want } = await searchParams;
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">Billing</h1>
      <Card>
        <p className="text-sm text-muted">Current plan</p>
        <p className="text-xl font-semibold">{PLANS[plan].name}</p>
        {sub && sub.plan !== "free" && <p className="mt-1 text-xs text-muted">Status: {sub.status}{sub.current_period_end ? ` · renews/ends ${new Date(sub.current_period_end).toISOString().slice(0, 10)}` : ""}</p>}
      </Card>
      <Notice>
        Subscribe using the <strong>same email you signed up with ({user.email})</strong>. Your plan is activated once we confirm your payment — this is currently done by hand, usually within a few hours. Your data is never deleted if you stay on or return to Free.
      </Notice>
      <div className="grid gap-3 md:grid-cols-2">
        {(["starter", "pro"] as const).map((id) => (
          <Card key={id} className={want === id ? "border-accent" : ""}>
            <h2 className="font-semibold">{PLANS[id].name} — ${PLANS[id].monthly}/mo</h2>
            <p className="mt-1 text-xs text-muted">{id === "starter" ? "Up to 2,000 trades." : "Unlimited trades. Backtesting is in development and not available yet."}</p>
            {plan === id ? <p className="mt-4 text-sm text-win">Your current plan</p>
              : <a href={CHECKOUT_URLS[id]} target="_blank" rel="noopener noreferrer" className={`${btnCls} mt-4 inline-block`}>Subscribe to {PLANS[id].name}</a>}
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted">Payments are processed by Handypay. To cancel or change plan, manage your subscription from your Handypay receipt email or contact support.</p>
    </div>
  );
}
