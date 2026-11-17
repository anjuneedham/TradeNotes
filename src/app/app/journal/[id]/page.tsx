import Link from "next/link";
import { notFound } from "next/navigation";
import { getContext } from "@/lib/app-context";
import { evaluateTrade } from "@/lib/metrics";
import { toTradeInputs, type ExitRow } from "@/lib/trade-schema";
import { TradeView, type TradeDetail as Detail } from "@/components/TradeView";
import { deleteTrade } from "../actions";
import { Notice, btnGhostCls, linkCls } from "@/components/ui";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { ScreenshotGallery, type Shot } from "@/components/ScreenshotGallery";
import { getStore } from "@/lib/storage";
import { quotaBytes, MAX_SCREENSHOTS_PER_TRADE } from "@/lib/screenshots";
import { PLANS } from "@/lib/plans";
import { PlaybookChecklist, type ChecklistItem } from "@/components/PlaybookChecklist";

export const metadata = { title: "Trade — TradeNotes" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function TradeDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; checks?: string }> }) {
  const { id } = await params;
  const { saved, checks } = await searchParams;
  if (!UUID.test(id)) notFound();
  const { db, plan } = await getContext();
  const { t, exits, newer, older, shots, checklist } = await db(async (q) => {
    // Row-level security: another user's id simply returns no row.
    const [t] = await q<Detail>(
      `select t.*, s.name as strategy_name, a.name as account_name, a.currency as account_currency
       from tradenotes.trades t left join tradenotes.strategies s on s.id = t.strategy_id join tradenotes.accounts a on a.id = t.account_id where t.id = $1`, [id]);
    if (!t) return { t: null, exits: [], newer: null, older: null, shots: [] as Shot[], checklist: [] as ChecklistItem[] };
    const exits = await q<ExitRow & { exited_at: string | null }>("select trade_id, quantity, price, exited_at from tradenotes.trade_exits where trade_id = $1 order by exited_at nulls last, id", [id]);
    const [newer] = await q<{ id: string }>("select id from tradenotes.trades where opened_at > $1 order by opened_at asc limit 1", [t.opened_at]);
    const [older] = await q<{ id: string }>("select id from tradenotes.trades where opened_at < $1 order by opened_at desc limit 1", [t.opened_at]);
    const shots = await q<Shot>("select id, caption, size_bytes from tradenotes.trade_screenshots where trade_id = $1 order by created_at", [id]);
    const checklist = t.strategy_id ? await q<ChecklistItem>(
      `select i.id, i.text, i.archived, c.followed from tradenotes.playbook_items i left join tradenotes.trade_checks c on c.item_id = i.id and c.trade_id = $1
       where i.strategy_id = $2 and (not i.archived or c.item_id is not null) order by i.position, i.created_at`, [id, t.strategy_id]) : [];
    return { t, exits, newer: newer ?? null, older: older ?? null, shots, checklist };
  });
  if (!t) notFound();

  const cur = t.account_currency;
  const res = evaluateTrade(toTradeInputs([t], exits, cur)[0]);

  return (
    <TradeView t={t} exits={exits} res={res} cur={cur}
      nav={
        <nav aria-label="Trade navigation" className="flex items-center justify-between text-sm">
          <Link href="/app/journal" className={linkCls}>← Journal</Link>
          <span className="flex gap-2">
            {newer ? <Link href={`/app/journal/${newer.id}`} className={`${btnGhostCls} !min-h-9 !px-3`}>← Newer</Link> : null}
            {older ? <Link href={`/app/journal/${older.id}`} className={`${btnGhostCls} !min-h-9 !px-3`}>Older →</Link> : null}
          </span>
        </nav>}
      notices={<>
        {saved && <Notice kind="ok">Changes saved.</Notice>}
        {checks === "1" && <Notice kind="ok">Checklist saved.</Notice>}
        {checks === "plan" && <Notice kind="warn">Recording checklists is part of Standard and Premium.</Notice>}
      </>}
      between={<>
        <PlaybookChecklist tradeId={t.id} strategy={t.strategy_name} items={checklist} writable={PLANS[plan].playbook} />
        <ScreenshotGallery tradeId={t.id} shots={shots} max={MAX_SCREENSHOTS_PER_TRADE} state={!getStore() ? "unavailable" : quotaBytes(plan) > 0 ? "ok" : "plan"} />
      </>}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <Link href={`/app/journal/${t.id}/edit`} className={btnGhostCls}>Edit trade</Link>
          <form action={deleteTrade}><input type="hidden" name="id" value={t.id} /><ConfirmDelete label={`${t.symbol} trade`} /></form>
        </div>} />
  );
}
