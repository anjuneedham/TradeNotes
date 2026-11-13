import { pageMeta } from "@/lib/seo";
import { DashboardView } from "@/components/DashboardView";
import { Badge } from "@/components/ui";
import { demoRows, demoTrades, DEMO_NOW, DEMO_CURRENCY, DEMO_ACCOUNT } from "@/lib/demo-data";
import type { LatestRow } from "@/lib/trades-data";

export const metadata = pageMeta({
  title: "Demo: a sample trading journal — TradeNotes",
  description: "See the TradeNotes dashboard, analytics and trade pages with a fictional sample journal. No account needed.",
  path: "/demo",
});

export default function DemoDashboard() {
  const rows = demoRows();
  const latest: LatestRow[] = [...rows].sort((a, b) => (a.openedAt < b.openedAt ? 1 : -1)).slice(0, 5)
    .map((r) => ({ id: r.id, symbol: r.symbol, side: r.side, openedAt: r.openedAt, status: "closed", netPnl: r.netPnl, r: r.r }));
  return (
    <DashboardView
      title="Dashboard" sub={<><Badge tone="warn">Sample data</Badge> {DEMO_ACCOUNT} · {DEMO_CURRENCY} · {rows.length} closed trades, {demoTrades()[0].openedAt.slice(0, 10)} to {demoTrades().at(-1)!.closedAt.slice(0, 10)}</>}
      rows={rows} excluded={{ open_or_partial: [], missing_fx: [], invalid: [] }} recentRows={rows} latest={latest} cur={DEMO_CURRENCY} showHelp now={DEMO_NOW}
      links={{ trade: (id) => `/demo/trades/${id}`, analytics: "/demo/analytics", mistakes: "/demo/analytics#mistake-cost", learn: "/learn", journal: null, openTrades: null }}
      emptyNote="No sample trades."
    />
  );
}
