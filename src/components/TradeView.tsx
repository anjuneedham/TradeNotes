import Link from "next/link";
import type { ReactNode } from "react";
import type { TradeRow, ExitRow } from "@/lib/trade-schema";
import type { TradeResult, ExclusionReason } from "@/lib/metrics";
import { moveInUnits } from "@/lib/instruments";
import { money, signedMoney, signedR, pnlClass, dateTime, plain } from "@/lib/format";
import { Card, Badge, Notice } from "./ui";

export interface TradeDetail extends TradeRow {
  symbol: string; asset_class: string | null; opened_at: string; stop_price: string | null; target_price: string | null;
  timeframe: string | null; session: string | null; pre_trade_notes: string | null; post_trade_notes: string | null; lessons: string | null;
  emotions: string[] | null; mistakes: string[] | null; followed_plan: boolean | null; discipline_score: number | null;
  strategy_name: string | null; strategy_id: string | null; account_name: string; account_currency: string;
}

function Row({ k, children }: { k: string; children: ReactNode }) {
  return <div className="flex items-baseline justify-between gap-4 border-t border-border py-2 first:border-t-0"><dt className="text-sm text-muted">{k}</dt><dd className="fig text-right text-sm">{children}</dd></div>;
}
function Note({ title, text }: { title: string; text: string | null }) {
  return <div><h3 className="text-xs text-muted">{title}</h3><p className={`mt-1 whitespace-pre-wrap text-sm leading-relaxed ${text ? "" : "text-muted"}`}>{text || "Nothing written."}</p></div>;
}

/**
 * The read-only trade page: header, execution, risk plan, notes, context and discipline. Rendered by /app/journal/[id] (real trade, with
 * navigation, checklist, screenshots and edit/delete around it) and /demo/trades/[id] (a sample trade, read-only).
 * `nav` renders above the header, `notices` below it, `between` after the notes card, `footer` at the end.
 */
export function TradeView({ t, exits, res, cur, nav, notices, between, footer }: {
  t: TradeDetail; exits: (ExitRow & { exited_at?: string | null })[]; res: TradeResult | ExclusionReason; cur: string;
  nav?: ReactNode; notices?: ReactNode; between?: ReactNode; footer?: ReactNode;
}) {
  const closed = typeof res !== "string" ? res : null;
  const entry = Number(t.entry_price), stop = t.stop_price === null ? null : Number(t.stop_price), target = t.target_price === null ? null : Number(t.target_price);
  const rr = stop !== null && target !== null && entry !== stop ? Math.abs(target - entry) / Math.abs(entry - stop) : null;
  const quote = t.currency && t.currency !== cur ? t.currency : null;
  const tags = (xs: string[] | null, tone: "neutral" | "warn") => (xs && xs.length ? <div className="mt-1.5 flex flex-wrap gap-1.5">{xs.map((x) => <Badge key={x} tone={tone}>{x}</Badge>)}</div> : <p className="mt-1 text-sm text-muted">None tagged.</p>);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {nav}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex flex-wrap items-center gap-2.5 text-2xl font-semibold tracking-tight">{t.symbol} <Badge>{t.side}</Badge>{!closed && <Badge tone="accent">{res === "missing_fx" ? "Needs FX rate" : res === "invalid" ? "Invalid data" : "Open"}</Badge>}</h1>
          <p className="mt-1 text-sm text-muted">Opened {dateTime(t.opened_at)} UTC · {t.account_name}{t.strategy_name ? ` · ${t.strategy_name}` : ""}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted">Net result</p>
          <p className={`fig text-2xl font-medium ${closed ? pnlClass(closed.netPnl) : "text-muted"}`}>{closed ? signedMoney(closed.netPnl, cur) : "—"}</p>
          {closed && <p className="fig text-xs text-muted">{closed.r !== null ? signedR(closed.r) : "No stop, so no R"} · fees {money(closed.fees, cur)}</p>}
        </div>
      </header>

      {notices}
      {res === "open_or_partial" && <Notice>This trade is not fully closed, so it is not counted in your statistics yet.</Notice>}
      {res === "missing_fx" && <Notice kind="warn">This trade is quoted in {t.currency} but has no exchange rate to {cur}, so it cannot be counted in your statistics.</Notice>}

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <h2 className="mb-2 text-sm font-medium">Execution</h2>
          <dl>
            <Row k="Size">{plain(t.quantity)}{Number(t.multiplier) !== 1 ? ` × ${plain(t.multiplier)}` : ""}</Row>
            <Row k="Entry price">{plain(t.entry_price)}</Row>
            {exits.length === 0 ? <Row k="Exit">—</Row> : exits.map((x, i) => <Row key={i} k={exits.length > 1 ? `Exit ${i + 1}` : "Exit price"}>{plain(x.price)}{exits.length > 1 || Number(x.quantity) !== Number(t.quantity) ? ` · size ${plain(x.quantity)}` : ""}</Row>)}
            {closed && exits.length > 0 && (() => { const avg = exits.reduce((s, x) => s + Number(x.price) * Number(x.quantity), 0) / exits.reduce((s, x) => s + Number(x.quantity), 0); const u = moveInUnits(t.asset_class ?? "", t.symbol, (t.side === "long" ? 1 : -1) * (avg - entry)); return u ? <Row k={`Move (${u.unit})`}>{u.value > 0 ? "+" : ""}{u.value}</Row> : null; })()}
            <Row k="Closed">{t.closed_at ? `${dateTime(t.closed_at)} UTC` : "—"}</Row>
            <Row k="Fees">{plain(t.fees)}{quote ? ` ${quote}` : ""}</Row>
            {quote && <Row k={`1 ${quote} in ${cur}`}>{plain(t.fx_to_account)}</Row>}
          </dl>
        </Card>
        <Card>
          <h2 className="mb-2 text-sm font-medium">Risk plan</h2>
          <dl>
            <Row k="Stop loss">{plain(t.stop_price)}</Row>
            <Row k="Take profit">{plain(t.target_price)}</Row>
            <Row k="Planned risk">{t.initial_risk === null ? "—" : money(Number(t.initial_risk), cur)}</Row>
            <Row k="Planned reward : risk">{rr === null ? "—" : `${rr.toFixed(2)} : 1`}</Row>
            <Row k="Realised R">{closed && closed.r !== null ? signedR(closed.r) : "—"}</Row>
          </dl>
          {stop === null && <p className="mt-2 text-xs text-muted">No stop was recorded, so this trade has no R-multiple. <Link href="/learn#r-multiple" className="underline underline-offset-2">What is R?</Link></p>}
        </Card>
      </div>

      <Card className="space-y-4">
        <h2 className="text-sm font-medium">Notes</h2>
        <Note title="Why I took it (pre-trade)" text={t.pre_trade_notes} />
        <Note title="How it went (post-trade)" text={t.post_trade_notes} />
        <Note title="Lesson learned" text={t.lessons} />
      </Card>

      {between}

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <h2 className="mb-2 text-sm font-medium">Context</h2>
          <dl>
            <Row k="Market"><span className="font-sans capitalize">{t.asset_class ?? "—"}</span></Row>
            <Row k="Strategy / setup"><span className="font-sans">{t.strategy_name ?? "—"}</span></Row>
            <Row k="Timeframe">{t.timeframe ?? "—"}</Row>
            <Row k="Session"><span className="font-sans">{t.session ?? "—"}</span></Row>
          </dl>
        </Card>
        <Card className="space-y-3">
          <h2 className="text-sm font-medium">Discipline</h2>
          <div><h3 className="text-xs text-muted">Emotions</h3>{tags(t.emotions, "neutral")}</div>
          <div><h3 className="text-xs text-muted">Mistakes</h3>{tags(t.mistakes, "warn")}</div>
          <dl>
            <Row k="Followed the plan"><span className="font-sans">{t.followed_plan === null ? "—" : t.followed_plan ? "Yes" : "No"}</span></Row>
            <Row k="Discipline score">{t.discipline_score === null ? "—" : `${t.discipline_score} / 5`}</Row>
          </dl>
        </Card>
      </div>
      {footer}
    </div>
  );
}
