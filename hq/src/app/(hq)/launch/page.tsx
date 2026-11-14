import { q } from "@/lib/db";
import { listCustomers, summarize } from "@/lib/customers";
import { getSettings } from "@/lib/settings";
import { FOUNDING } from "@/lib/plans";
import { todayIn } from "@/lib/snapshot";
import { addTask, deleteTask, toggleTask } from "@/app/actions/misc";
import { Badge, Card, Field, Flash, PageHeader, Progress, btnCls, btnSmCls, inputCls, money } from "@/components/ui";

export const metadata = { title: "Launch — HQ" };
export default async function Launch({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const sp = await searchParams; const set = await getSettings();
  const [cs, tasks] = await Promise.all([listCustomers(false), q<{ id: string; title: string; detail: string | null; owner: string; done: boolean }>("select id, title, detail, owner, done from hq.tasks order by done, sort, created_at")]);
  const sum = summarize(cs);
  const days = Math.round((new Date(set.goal_date).getTime() - new Date(todayIn(set.tz)).getTime()) / 86_400_000);
  const open = tasks.filter((t) => !t.done).length;
  return (
    <>
      <PageHeader title="Launch" sub="The goal, the founding offer, and the gates that must pass before you push traffic or take payments (docs/LAUNCH_TOMORROW.md, READINESS_REVIEW.md)." />
      <Flash sp={sp} />
      <div className="grid gap-4 md:grid-cols-3">
        <Card title={`Goal: ${set.goal_paying} paying by ${set.goal_date}`}><p className="text-3xl font-semibold">{sum.paying} / {set.goal_paying}</p><div className="my-2"><Progress value={sum.paying} max={set.goal_paying} /></div><p className="text-xs text-muted">{days > 0 ? `${days} day${days === 1 ? "" : "s"} left` : days === 0 ? "Due today" : `${-days} day(s) past the date`} · only counts plans you have recorded after seeing payment.</p></Card>
        <Card title="Founding seats"><p className="text-3xl font-semibold">{sum.foundingUsed} / {FOUNDING.seats}</p><div className="my-2"><Progress value={sum.foundingUsed} max={FOUNDING.seats} /></div><p className="text-xs text-muted">{FOUNDING.discountPct}% off × {FOUNDING.months} months, after they’ve logged trades.</p></Card>
        <Card title="Revenue (recorded)"><p className="text-3xl font-semibold">{money(sum.mrr)}</p><p className="text-xs text-muted">MRR from active, unexpired plans. Never quote revenue you haven’t confirmed arrived.</p></Card>
      </div>
      <Card title={`Gates & tasks — ${open} open`}>
        <ul className="divide-y divide-border">{tasks.map((t) => (
          <li key={t.id} className="flex items-start gap-3 py-3">
            <form action={toggleTask}><input type="hidden" name="id" value={t.id} /><button aria-label={t.done ? "Mark not done" : "Mark done"} className={`mt-0.5 h-5 w-5 rounded border text-xs cursor-pointer ${t.done ? "border-win bg-win/20 text-win" : "border-border"}`}>{t.done ? "✓" : ""}</button></form>
            <div className="min-w-0 flex-1"><p className={`text-sm ${t.done ? "text-muted line-through" : ""}`}>{t.title} <Badge tone={t.owner === "claude" ? "accent" : "muted"}>{t.owner === "claude" ? "Claude" : "you"}</Badge></p>{t.detail && <p className="mt-0.5 text-xs text-muted">{t.detail}</p>}</div>
            <form action={deleteTask}><input type="hidden" name="id" value={t.id} /><button className={btnSmCls} aria-label="Remove task">×</button></form>
          </li>))}</ul>
        <form action={addTask} className="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-4">
          <Field label="New task" className="min-w-64 flex-1"><input name="title" required className={inputCls} /></Field>
          <Field label="Detail"><input name="detail" className={inputCls} /></Field>
          <Field label="Owner"><select name="owner" className={inputCls}><option value="you">you</option><option value="claude">Claude</option></select></Field>
          <button className={btnCls}>Add</button>
        </form>
      </Card>
    </>
  );
}
