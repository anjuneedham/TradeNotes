import Link from "next/link";
import { notFound } from "next/navigation";
import { getContext } from "@/lib/app-context";
import { PLANS } from "@/lib/plans";
import { defaultMultiplier } from "@/lib/trade-schema";
import TradeForm, { type TradeInitial } from "@/components/TradeForm";
import { UpgradeNotice } from "@/components/UpgradeNotice";
import { PageHeader, linkCls } from "@/components/ui";
import type { BacktestRow } from "@/lib/backtest";

export const metadata = { title: "Edit hypothetical trade — TradeNotes" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const local = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : "");
const num = (v: unknown) => (v === null || v === undefined ? "" : String(Number(v)));

export default async function EditBacktest({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { db, plan } = await getContext();
  if (!PLANS[plan].backtesting) {
    return <div className="mx-auto max-w-2xl"><UpgradeNotice feature="Editing hypothetical trades" tier="premium">Your entries stay readable.</UpgradeNotice></div>;
  }
  const [t] = await db((q) => q<BacktestRow>("select * from tradenotes.backtest_trades where id = $1", [id])); // row-level security: another user's id returns nothing
  if (!t) notFound();
  const qty = Number(t.quantity);
  const [x1, x2] = t.exits;
  const asset = String(t.asset_class ?? "other");
  const values: Record<string, string> = {
    asset_class: asset, side: t.side, symbol: t.symbol,
    multiplier: asset === "future" || asset === "option" || Number(t.multiplier) !== defaultMultiplier(asset, t.symbol) ? num(t.multiplier) : "",
    quantity: num(t.quantity), entry_price: num(t.entry_price), stop_price: num(t.stop_price), target_price: num(t.target_price),
    fees: Number(t.fees) ? num(t.fees) : "", opened_at: local(t.opened_at), closed_at: local(t.closed_at),
    exit1_price: x1 ? num(x1.price) : "", exit1_qty: x1 && !(t.exits.length === 1 && Number(x1.quantity) === qty) ? num(x1.quantity) : "",
    exit2_price: x2 ? num(x2.price) : "", exit2_qty: x2 ? num(x2.quantity) : "",
    strategy_name: t.strategy ?? "", timeframe: t.timeframe ?? "", session: t.session ?? "",
    pre_trade_notes: t.pre_trade_notes ?? "", post_trade_notes: t.post_trade_notes ?? "", lessons: t.lessons ?? "",
  };
  const edit: TradeInitial = { id, values, emotions: [], mistakes: [] };
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title={`Edit hypothetical ${t.symbol} trade`} sub={<Link href={`/app/backtests/${id}`} className={linkCls}>← Back</Link>} />
      <TradeForm variant="backtest" accounts={[]} defaultAsset={asset} edit={edit} />
    </div>
  );
}
