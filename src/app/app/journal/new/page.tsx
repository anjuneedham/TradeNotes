import Link from "next/link";
import { getContext } from "@/lib/app-context";
import { canAddTrade } from "@/lib/entitlements";
import { PLANS } from "@/lib/plans";
import TradeForm from "@/components/TradeForm";
import { Notice, PageHeader, btnCls, btnGhostCls, linkCls } from "@/components/ui";

export const metadata = { title: "Log a trade — TradeNotes" };
export default async function NewTrade() {
  const { db, accounts, profile, plan, scope } = await getContext();
  const market = profile?.primary_market === "stocks" ? "stock" : profile?.primary_market === "options" ? "option" : profile?.primary_market === "futures" ? "future" : profile?.primary_market ?? "forex";
  // Presentation only: the limit itself is enforced inside the createTrade transaction.
  const limit = PLANS[plan].tradeLimit;
  const used = limit === null ? 0 : (await db((q) => q<{ n: number }>("select count(*)::int as n from tradenotes.trades")))[0].n;
  const left = limit === null ? null : limit - used;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="Log a trade" sub="About a minute. You can leave the trade open and anything optional blank." />
      {limit !== null && !canAddTrade(plan, used) ? (
        <Notice kind="warn">
          <p className="font-medium">You&apos;ve used all {limit.toLocaleString("en-US")} trades on the {PLANS[plan].name} plan</p>
          <p className="mt-1">Everything you&apos;ve logged stays available, and your statistics keep working. To log more trades, move to a plan with a higher limit.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/app/billing" className={btnCls}>See plans</Link>
            <Link href="/app/journal" className={btnGhostCls}>Back to journal</Link>
          </div>
        </Notice>
      ) : (<>
        {left !== null && limit !== null && left <= Math.max(5, Math.round(limit * 0.1)) && (
          <Notice>{left} of {limit.toLocaleString("en-US")} trades left on the {PLANS[plan].name} plan. <Link href="/app/billing" className={linkCls}>See plans</Link></Notice>
        )}
        <TradeForm defaultAccount={scope.id === "all" ? undefined : scope.id} accounts={accounts} defaultAsset={market} />
      </>)}
    </div>
  );
}
