import Link from "next/link";
import { notFound } from "next/navigation";
import { pageMeta } from "@/lib/seo";
import { evaluateTrade } from "@/lib/metrics";
import { TradeView, type TradeDetail } from "@/components/TradeView";
import { Badge, Card, btnGhostCls, linkCls } from "@/components/ui";
import { demoTrades, demoTrade, demoInput, DEMO_ACCOUNT, DEMO_CURRENCY } from "@/lib/demo-data";

// A single sample trade is thin content: keep these pages out of search results (the dashboard and analytics demo pages are indexable).
export const metadata = { ...pageMeta({ title: "Demo: a sample trade — TradeNotes", description: "A fictional sample trade in the TradeNotes journal.", path: "/demo", index: false }) };

export default async function DemoTradePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = /^demo-\d{3}$/.test(id) ? demoTrade(id) : undefined;
  if (!t) notFound();
  const all = demoTrades();
  const i = all.findIndex((x) => x.id === t.id);
  const newer = all[i + 1], older = all[i - 1];
  const detail: TradeDetail = {
    id: t.id, side: t.side, quantity: t.quantity, entry_price: t.entryPrice, fees: t.fees, multiplier: t.multiplier, initial_risk: t.initialRisk,
    currency: null, fx_to_account: null, closed_at: t.closedAt, symbol: t.symbol, asset_class: t.assetClass, opened_at: t.openedAt,
    stop_price: String(t.stopPrice), target_price: String(t.targetPrice), timeframe: t.timeframe, session: t.session,
    pre_trade_notes: t.preNotes, post_trade_notes: t.postNotes, lessons: t.lesson, emotions: t.emotions, mistakes: t.mistakes,
    followed_plan: t.checksDone === t.checksTotal, discipline_score: null, strategy_name: t.strategy, strategy_id: null, account_name: DEMO_ACCOUNT, account_currency: DEMO_CURRENCY,
  };
  return (
    <TradeView t={detail} exits={t.exits.map((e) => ({ trade_id: t.id, quantity: e.quantity, price: e.price }))} res={evaluateTrade(demoInput(t))} cur={DEMO_CURRENCY}
      nav={
        <nav aria-label="Sample trade navigation" className="flex items-center justify-between text-sm">
          <Link href="/demo" className={linkCls}>← Demo dashboard</Link>
          <span className="flex gap-2">
            {newer ? <Link href={`/demo/trades/${newer.id}`} className={`${btnGhostCls} !min-h-9 !px-3`}>← Newer</Link> : null}
            {older ? <Link href={`/demo/trades/${older.id}`} className={`${btnGhostCls} !min-h-9 !px-3`}>Older →</Link> : null}
          </span>
        </nav>}
      between={
        <Card>
          <h2 className="text-sm font-medium">Playbook checklist <Badge tone="warn">Sample data</Badge></h2>
          <p className="mt-1 text-sm text-muted">{t.checksDone} of {t.checksTotal} entry rules followed. In your own journal you tick each rule on the trade, and analytics compares your results when you followed your rules and when you did not.</p>
        </Card>}
      footer={<p className="text-xs text-muted">Sample data, read-only. In TradeNotes you can edit, tag, attach screenshots and delete your own trades.</p>}
    />
  );
}
