import Link from "next/link";
import { notFound } from "next/navigation";
import { getContext } from "@/lib/app-context";
import TradeForm, { type TradeInitial } from "@/components/TradeForm";
import { PageHeader, linkCls } from "@/components/ui";

export const metadata = { title: "Edit trade — TradeNotes" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Row = Record<string, string | number | boolean | string[] | null> & { id: string; emotions: string[] | null; mistakes: string[] | null };
type Exit = { quantity: string; price: string };

/** datetime-local value in UTC, matching how the form's values are parsed and stored. */
const local = (iso: unknown) => (typeof iso === "string" ? new Date(iso).toISOString().slice(0, 16) : "");
const num = (v: unknown) => (v === null || v === undefined ? "" : String(Number(v)));

export default async function EditTrade({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { db, accounts } = await getContext();
  const data = await db(async (q) => {
    // Row-level security: another user's id returns no row -> 404.
    const [t] = await q<Row>(
      `select t.*, s.name as strategy_name, a.currency as account_currency
       from tradenotes.trades t left join tradenotes.strategies s on s.id = t.strategy_id join tradenotes.accounts a on a.id = t.account_id where t.id = $1`, [id]);
    if (!t) return null;
    const exits = await q<Exit>("select quantity, price from tradenotes.trade_exits where trade_id = $1 order by exited_at nulls last, id", [id]);
    return { t, exits };
  });
  if (!data) notFound();
  const { t, exits } = data;
  const qty = Number(t.quantity);
  const [x1, x2] = exits;
  const values: Record<string, string> = {
    account_id: String(t.account_id), asset_class: String(t.asset_class ?? "other"), side: String(t.side), symbol: String(t.symbol),
    quantity: num(t.quantity), entry_price: num(t.entry_price), stop_price: num(t.stop_price), target_price: num(t.target_price),
    fees: Number(t.fees) ? num(t.fees) : "", opened_at: local(t.opened_at), closed_at: local(t.closed_at),
    exit1_price: x1 ? num(x1.price) : "", exit1_qty: x1 && !(exits.length === 1 && Number(x1.quantity) === qty) ? num(x1.quantity) : "",
    exit2_price: x2 ? num(x2.price) : "", exit2_qty: x2 ? num(x2.quantity) : "",
    currency: t.currency && t.currency !== t.account_currency ? String(t.currency) : "", fx_to_account: num(t.fx_to_account),
    strategy_name: String(t.strategy_name ?? ""), timeframe: String(t.timeframe ?? ""), session: String(t.session ?? ""),
    pre_trade_notes: String(t.pre_trade_notes ?? ""), post_trade_notes: String(t.post_trade_notes ?? ""), lessons: String(t.lessons ?? ""),
    followed_plan: t.followed_plan === null ? "" : t.followed_plan ? "yes" : "no", discipline_score: t.discipline_score === null ? "" : String(t.discipline_score),
  };
  const edit: TradeInitial = { id, values, emotions: t.emotions ?? [], mistakes: t.mistakes ?? [] };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title={`Edit ${t.symbol} trade`} sub={<><Link href={`/app/journal/${id}`} className={linkCls}>← Back to the trade</Link> · Statistics update as soon as you save.</>} />
      <TradeForm accounts={accounts} defaultAsset={values.asset_class} edit={edit} />
    </div>
  );
}
