import { pageMeta } from "@/lib/seo";
import { AnalyticsView } from "@/components/AnalyticsView";
import { Badge, PageHeader } from "@/components/ui";
import { demoRows, DEMO_CURRENCY, DEMO_TZ } from "@/lib/demo-data";

export const metadata = pageMeta({
  title: "Demo: sample analytics — TradeNotes",
  description: "Win rate, expectancy, drawdown, R-multiples, time-of-day heatmap and mistake cost, shown on a fictional sample journal.",
  path: "/demo/analytics",
});

export default function DemoAnalytics() {
  return (
    <AnalyticsView
      header={<PageHeader title="Analytics" sub={<><Badge tone="warn">Sample data</Badge> Where results come from. Every table uses closed trades only.</>} />}
      rows={demoRows()} excluded={{ open_or_partial: [], missing_fx: [], invalid: [] }} tz={DEMO_TZ} cur={DEMO_CURRENCY} showHelp
    />
  );
}
