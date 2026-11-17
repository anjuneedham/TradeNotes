import Link from "next/link";
import { getContext } from "@/lib/app-context";
import { PLANS } from "@/lib/plans";
import { currentStart, shiftStart, periodLabel, TEMPLATE, type Period, type ReviewStats } from "@/lib/reviews";
import { deleteReview } from "./actions";
import { ReviewStatsCard } from "@/components/ReviewStatsCard";
import { UpgradeNotice } from "@/components/UpgradeNotice";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { Card, Notice, PageHeader, EmptyState, Badge, btnCls, btnGhostCls, linkCls } from "@/components/ui";
import { signedMoney, pnlClass } from "@/lib/format";
import { pnlGlyph } from "@/components/AnalyticsExtra";

export const metadata = { title: "Reviews — TradeNotes" };
interface Row { id: string; period: Period; period_start: string; went_well: string | null; to_repeat: string | null; to_improve: string | null; rule_breaks: string | null; focus_next: string | null; stats: ReviewStats | null }
const PERIOD_WORD = { day: "Daily", week: "Weekly", month: "Monthly" } as const;

export default async function Reviews({ searchParams }: { searchParams: Promise<{ saved?: string; deleted?: string }> }) {
  const sp = await searchParams;
  const { db, plan, tz } = await getContext();
  const writable = PLANS[plan].reviews;
  const rows = await db((q) => q<Row>(
    "select id, period, to_char(period_start, 'YYYY-MM-DD') as period_start, went_well, to_repeat, to_improve, rule_breaks, focus_next, stats from tradenotes.reviews order by reviews.period_start desc, period limit 200"));
  const now = new Date();
  const today = currentStart("day", now, tz), thisWeek = currentStart("week", now, tz), thisMonth = currentStart("month", now, tz);
  const quick: [string, Period, string][] = [["Today", "day", today], ["This week", "week", thisWeek], ["Last week", "week", shiftStart("week", thisWeek, -1)], ["This month", "month", thisMonth], ["Last month", "month", shiftStart("month", thisMonth, -1)]];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Reviews" sub="Look back, write down what to repeat and what to fix. Your numbers are filled in for you." />
      {sp.saved && <Notice kind="ok">Review saved.</Notice>}
      {sp.deleted && <Notice kind="ok">Review deleted.</Notice>}
      {!writable && (rows.length === 0
        ? <UpgradeNotice feature="The reviews page">Write a daily, weekly or monthly review with your results filled in for you. Your journal and analytics stay available on Free.</UpgradeNotice>
        : <UpgradeNotice feature="Writing reviews">Your {rows.length} existing review{rows.length === 1 ? "" : "s"} {rows.length === 1 ? "stays" : "stay"} readable below. Adding or changing reviews needs a paid plan.</UpgradeNotice>)}
      {writable && (
        <Card>
          <h2 className="text-sm font-medium">Start a review</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {quick.map(([label, period, start]) => <Link key={label} href={`/app/reviews/${period}/${start}`} className={label === "This week" ? btnCls : btnGhostCls}>{label}</Link>)}
          </div>
          <p className="mt-3 text-xs text-muted">Weeks run Monday to Sunday in {tz}. Use Previous / Next inside a review to go back further.</p>
        </Card>
      )}
      <section aria-label="Review history">
        <h2 className="mb-2 text-sm font-medium">History</h2>
        {rows.length === 0 ? <EmptyState title="No reviews yet">{writable ? "A short weekly review is the habit that turns a journal into improvement." : "Reviews you write on a paid plan appear here."}</EmptyState> : (
          <ul className="space-y-3">
            {rows.map((r) => {
              const first = TEMPLATE.map((t) => r[t.key]).find(Boolean) ?? "";
              return (
                <li key={r.id}>
                  <Card>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 font-medium"><Badge>{PERIOD_WORD[r.period]}</Badge><Link href={`/app/reviews/${r.period}/${r.period_start}`} className="hover:underline">{periodLabel(r.period, r.period_start)}</Link></p>
                        {r.stats && r.stats.trades > 0 && <p className={`fig mt-1 text-xs ${pnlClass(r.stats.netPnl)}`}>{pnlGlyph(r.stats.netPnl)} {signedMoney(r.stats.netPnl, r.stats.currency)} <span className="font-sans text-muted">· {r.stats.trades} trade{r.stats.trades === 1 ? "" : "s"} when saved</span></p>}
                      </div>
                      <form action={deleteReview} className="shrink-0"><input type="hidden" name="id" value={r.id} /><ConfirmDelete compact label={`${PERIOD_WORD[r.period].toLowerCase()} review ${r.period_start}`} /></form>
                    </div>
                    {first && <p className="mt-2 line-clamp-2 text-sm text-muted">{first}</p>}
                    {r.stats && r.stats.trades > 0 && <details className="mt-2 text-sm"><summary className="cursor-pointer text-xs text-muted">Figures when saved</summary><div className="mt-2"><ReviewStatsCard s={r.stats} /></div></details>}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
        {rows.length >= 200 && <p className="mt-2 text-xs text-muted">Showing your latest 200 reviews.</p>}
      </section>
      <p className="text-xs text-muted">Reviews are private to you. Reminder emails are not available. <Link href="/app/analytics" className={linkCls}>Open analytics</Link></p>
    </div>
  );
}
