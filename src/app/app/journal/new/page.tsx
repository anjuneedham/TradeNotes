import { getContext } from "@/lib/app-context";
import TradeForm from "@/components/TradeForm";

export const metadata = { title: "Log a trade — TradeNotes" };
export default async function NewTrade() {
  const { accounts, profile } = await getContext();
  const market = profile?.primary_market === "stocks" ? "stock" : profile?.primary_market === "options" ? "option" : profile?.primary_market ?? "forex";
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-semibold">Log a trade</h1>
      <TradeForm accounts={accounts} defaultAsset={market} />
    </div>
  );
}
