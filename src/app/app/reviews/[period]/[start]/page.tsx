import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getContext } from "@/lib/app-context";
import { PLANS } from "@/lib/plans";
import { NO_FILTERS } from "@/lib/filters";
import { loadResults } from "@/lib/trades-data";
import { isPeriod, normalizeStart, shiftStart, periodWindow, periodLabel, buildStats, TEMPLATE, currentStart } from "@/lib/reviews";
import { ReviewForm } from "@/components/ReviewForm";
import { ReviewStatsCard } from "@/components/ReviewStatsCard";
import { UpgradeNotice } from "@/components/UpgradeNotice";
import { Card, PageHeader, btnGhostCls, linkCls } from "@/components/ui";
import { shortDate } from "@/lib/format";

export const metadata = { title: "Review — TradeNotes" };
interface Saved { went_well: string | null; to_repeat: string | null; to_improve: string | null; rule_breaks: string | null; focus_next: string | null; updated_at: string }

export default async function ReviewEditor({ params }: { params: Promise<{ period: string; start: string }> }) {
  const p = await params;
  if (!isPeriod(p.period)) notFound();
  const start = normalizeStart(p.period, p.start);
  if (!start) notFound();
  if (start !== p.start) redirect(`/app/reviews/${p.period}/${start}`);
  const period = p.period;
  const { db, plan, tz, scope } = await getContext();
  const writable = PLANS[plan].reviews;
  const saved = (await db((q) => q<Saved>("select went_well, to_repeat, to_improve, rule_breaks, focus_next, updated_at from tradenotes.reviews where period = $1 and period_start = $2", [period, start])))[0] ?? null;
  const label = periodLabel(period, start);
  const header = <PageHeader title={`${period === "day" ? "Daily" : period === "week" ? "Weekly" : "Monthly"} review`} sub={<><Link href="/app/reviews" className={linkCls}>Reviews</Link> / {label}</>} />;

  if (!writable && !saved) {
    return <div className="mx-auto max-w-3xl space-y-5">{header}<UpgradeNotice feature="The reviews page">Write a daily, weekly or monthly review with your results filled in for you. Your journal and analytics stay available on Free.</UpgradeNotice></div>;
  }
  const { rows } = await loadResults(db, scope.accountIds, scope.currency, NO_FILTERS, tz, { window: periodWindow(period, start, tz) });
  const stats = buildStats(rows, scope.currency, scope.label);
  const prev = shiftStart(period, start, -1), next = shiftStart(period, start, 1);
  const isCurrent = start === currentStart(period, new Date(), tz);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {header}
      <nav aria-label="Period" className="flex flex-wrap items-center gap-2">
        <Link href={`/app/reviews/${period}/${prev}`} className={btnGhostCls}>← Previous</Link>
        <span className="min-w-40 text-center font-medium" aria-live="polite">{label}{isCurrent ? " (now)" : ""}</span>
        <Link href={`/app/reviews/${period}/${next}`} className={btnGhostCls}>Next →</Link>
      </nav>
      <Card>
        <h2 className="text-sm font-medium">Your numbers for this period <span className="font-normal text-muted">· {scope.label} · {tz}</span></h2>
        <div className="mt-3"><ReviewStatsCard s={stats} /></div>
        {stats.trades > 0 && stats.trades < 30 && <p className="mt-3 text-xs text-muted">Under 30 trades, so treat these figures as a description of this period, not a trend.</p>}
      </Card>
      {writable ? (
        <Card><ReviewForm period={period} start={start} values={saved ?? {}} /></Card>
      ) : (<>
        <UpgradeNotice feature="Editing reviews">You can still read this review. Writing or changing reviews needs a paid plan.</UpgradeNotice>
        <Card><dl className="space-y-4">{TEMPLATE.map((t) => (saved as Saved)[t.key] ? (<div key={t.key}><dt className="text-sm font-medium">{t.label}</dt><dd className="mt-1 whitespace-pre-wrap text-sm text-muted">{(saved as Saved)[t.key]}</dd></div>) : null)}</dl></Card>
      </>)}
      {saved && <p className="text-xs text-muted">Last saved {shortDate(saved.updated_at)}.</p>}
    </div>
  );
}
