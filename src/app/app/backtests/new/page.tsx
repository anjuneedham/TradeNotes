import Link from "next/link";
import { getContext } from "@/lib/app-context";
import { PLANS } from "@/lib/plans";
import TradeForm from "@/components/TradeForm";
import { UpgradeNotice } from "@/components/UpgradeNotice";
import { PageHeader, linkCls } from "@/components/ui";

export const metadata = { title: "Log a hypothetical trade — TradeNotes" };
export default async function NewBacktest() {
  const { plan, profile } = await getContext();
  const market = profile?.primary_market === "stocks" ? "stock" : profile?.primary_market === "options" ? "option" : profile?.primary_market === "futures" ? "future" : profile?.primary_market ?? "forex";
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="Log a hypothetical trade" sub={<><Link href="/app/backtests" className={linkCls}>← Backtests</Link> · The same fields as a real trade. It is never counted in your real statistics.</>} />
      {PLANS[plan].backtesting
        ? <TradeForm variant="backtest" accounts={[]} defaultAsset={market} />
        : <UpgradeNotice feature="The manual backtest log" tier="premium">Log hypothetical trades by hand and see the same metrics, kept apart from your real results.</UpgradeNotice>}
    </div>
  );
}
