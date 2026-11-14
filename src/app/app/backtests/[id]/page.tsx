import Link from "next/link";
import { notFound } from "next/navigation";
import { getContext } from "@/lib/app-context";
import { PLANS } from "@/lib/plans";
import { backtestResult, type BacktestRow } from "@/lib/backtest";
import { deleteBacktest } from "../actions";
import { Card, Badge, Notice, btnGhostCls, linkCls } from "@/components/ui";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { HypotheticalBanner } from "@/components/Hypothetical";
import { ScreenshotGallery, type Shot } from "@/components/ScreenshotGallery";
import { getStore } from "@/lib/storage";
import { quotaBytes, MAX_SCREENSHOTS_PER_TRADE } from "@/lib/screenshots";
import { money, signedMoney, signedR, pnlClass, dateTime, plain } from "@/lib/format";

export const metadata = { title: "Hypothetical trade — TradeNotes" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const Row = ({ k, children }: { k: string; children: React.ReactNode }) => <div className="flex items-baseline justify-between gap-4 border-t border-border py-2 first:border-t-0"><dt className="text-sm text-muted">{k}</dt><dd className="fig text-right text-sm">{children}</dd></div>;
const Note = ({ title, text }: { title: string; text: string | null }) => <div><h3 className="text-xs text-muted">{title}</h3><p className={`mt-1 whitespace-pre-wrap text-sm leading-relaxed ${text ? "" : "text-muted"}`}>{text || "Nothing written."}</p></div>;

export default async function BacktestDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const { saved } = await searchParams;
  if (!UUID.test(id)) notFound();
  const { db, plan, accounts } = await getContext();
  const { t, shots } = await db(async (q) => {
    const [t] = await q<BacktestRow>("select * from tradenotes.backtest_trades where id = $1", [id]); // another user's id returns no row
    const shots = t ? await q<Shot>("select id, caption, size_bytes from tradenotes.backtest_screenshots where backtest_id = $1 order by created_at", [id]) : [];
    return { t, shots };
  });
  if (!t) notFound();
  const cur = accounts[0]?.currency ?? "USD";
  const res = backtestResult(t);
  const closed = typeof res !== "string" ? res : null;
  const canWrite = PLANS[plan].backtesting;
  const entry = Number(t.entry_price), stop = t.stop_price === null ? null : Number(t.stop_price), target = t.target_price === null ? null : Number(t.target_price);
  const rr = stop !== null && target !== null && entry !== stop ? Math.abs(target - entry) / Math.abs(entry - stop) : null;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <nav aria-label="Backtest navigation" className="text-sm"><Link href="/app/backtests" className={linkCls}>← Backtests</Link></nav>
      <HypotheticalBanner />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex flex-wrap items-center gap-2.5 text-2xl font-semibold tracking-tight">{t.symbol} <Badge>{t.side}</Badge><Badge tone="warn">Hypothetical</Badge>{!closed && <Badge tone="accent">Open</Badge>}</h1>
          <p className="mt-1 text-sm text-muted">Opened {dateTime(t.opened_at)} UTC{t.strategy ? ` · ${t.strategy}` : ""}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted">Hypothetical result</p>
          <p className={`fig text-2xl font-medium ${closed ? pnlClass(closed.netPnl) : "text-muted"}`}>{closed ? signedMoney(closed.netPnl, cur) : "—"}</p>
          {closed && <p className="fig text-xs text-muted">{closed.r !== null ? signedR(closed.r) : "No stop, so no R"} · fees {money(closed.fees, cur)}</p>}
        </div>
      </header>
      {saved && <Notice kind="ok">Changes saved.</Notice>}
      {res === "open_or_partial" && <Notice>This hypothetical trade is not fully closed, so it is not counted in the backtest figures yet.</Notice>}
      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <h2 className="mb-2 text-sm font-medium">Execution (as entered)</h2>
          <dl>
            <Row k="Size">{plain(t.quantity)}{Number(t.multiplier) !== 1 ? ` × ${plain(t.multiplier)}` : ""}</Row>
            <Row k="Entry price">{plain(t.entry_price)}</Row>
            {t.exits.length === 0 ? <Row k="Exit">—</Row> : t.exits.map((x, i) => <Row key={i} k={t.exits.length > 1 ? `Exit ${i + 1}` : "Exit price"}>{plain(x.price)}{t.exits.length > 1 || Number(x.quantity) !== Number(t.quantity) ? ` · size ${plain(x.quantity)}` : ""}</Row>)}
            <Row k="Closed">{t.closed_at ? `${dateTime(t.closed_at)} UTC` : "—"}</Row>
            <Row k="Fees">{plain(t.fees)}</Row>
          </dl>
        </Card>
        <Card>
          <h2 className="mb-2 text-sm font-medium">Risk plan</h2>
          <dl>
            <Row k="Stop loss">{plain(t.stop_price)}</Row>
            <Row k="Take profit">{plain(t.target_price)}</Row>
            <Row k="Planned risk">{t.initial_risk === null ? "—" : money(Number(t.initial_risk), cur)}</Row>
            <Row k="Planned reward : risk">{rr === null ? "—" : `${rr.toFixed(2)} : 1`}</Row>
            <Row k="Hypothetical R">{closed && closed.r !== null ? signedR(closed.r) : "—"}</Row>
          </dl>
        </Card>
      </div>
      <Card className="space-y-4">
        <h2 className="text-sm font-medium">Notes</h2>
        <Note title="Why this entry (pre-trade)" text={t.pre_trade_notes} />
        <Note title="How it played out (post-trade)" text={t.post_trade_notes} />
        <Note title="Lesson" text={t.lessons} />
      </Card>
      <ScreenshotGallery kind="backtest" tradeId={t.id} shots={shots} max={MAX_SCREENSHOTS_PER_TRADE}
        state={!getStore() ? "unavailable" : canWrite && quotaBytes(plan) > 0 ? "ok" : "plan"} planText="Adding screenshots to hypothetical trades is part of Premium." />
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        {canWrite ? <Link href={`/app/backtests/${t.id}/edit`} className={btnGhostCls}>Edit</Link> : <span />}
        <form action={deleteBacktest}><input type="hidden" name="id" value={t.id} /><ConfirmDelete label={`hypothetical ${t.symbol} trade`} /></form>
      </div>
    </div>
  );
}
