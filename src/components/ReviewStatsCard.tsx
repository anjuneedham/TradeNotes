import type { ReviewStats } from "@/lib/reviews";
import { signedMoney, pct, num, pnlClass } from "@/lib/format";
import { pnlGlyph } from "./AnalyticsExtra";

/** The auto-filled figures of a review period (live while writing, the saved snapshot in history). */
export function ReviewStatsCard({ s }: { s: ReviewStats }) {
  const cell = (label: string, value: string, cls = "") => (<div><dt className="text-xs text-muted">{label}</dt><dd className={`fig mt-0.5 text-sm font-medium ${cls}`}>{value}</dd></div>);
  if (s.trades === 0) return <p className="text-sm text-muted">No closed trades in this period ({s.scope}).</p>;
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
      {cell("Net P&L", `${pnlGlyph(s.netPnl)} ${signedMoney(s.netPnl, s.currency)}`, pnlClass(s.netPnl))}
      {cell("Closed trades", `${s.trades} (${s.wins}W / ${s.losses}L)`)}
      {cell("Win rate", pct(s.winRate))}
      {cell("Expectancy / trade", signedMoney(s.expectancy, s.currency), pnlClass(s.expectancy))}
      {cell("Profit factor", s.profitFactor === null ? "—" : num(s.profitFactor))}
      {cell("Average R", s.avgR === null ? "—" : `${num(s.avgR)}R`)}
      {cell("Max drawdown", signedMoney(-s.maxDrawdown, s.currency))}
      {cell("Costliest mistake", s.topMistake ? `${s.topMistake.tag} (${signedMoney(s.topMistake.netPnl, s.currency)}, ${s.topMistake.trades})` : "None tagged")}
    </dl>
  );
}
