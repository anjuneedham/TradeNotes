import Link from "next/link";
import { getContext } from "@/lib/app-context";
import { PLANS } from "@/lib/plans";
import { addStrategy, addItem, setItemArchived } from "./actions";
import { MAX_ACTIVE_ITEMS, MAX_STRATEGIES } from "@/lib/playbook";
import { UpgradeNotice } from "@/components/UpgradeNotice";
import { Card, Notice, PageHeader, EmptyState, Field, inputCls, btnCls, btnGhostCls, linkCls } from "@/components/ui";
import { pct } from "@/lib/format";

export const metadata = { title: "Playbook — TradeNotes" };
interface Strat { id: string; name: string; trades: number }
interface Item { id: string; strategy_id: string; text: string; archived: boolean; answered: number; followed: number }
const MESSAGES: Record<string, [("ok" | "error" | "warn"), string]> = {
  "ok=strategy": ["ok", "Strategy added."], "ok=item": ["ok", "Rule added."], "ok=archived": ["ok", "Rule updated."],
  "error=plan": ["warn", "The playbook is part of Standard and Premium. Your existing rules stay readable."], "error=name": ["error", "Give the strategy a name of 1 to 60 characters."],
  "error=text": ["error", "A rule needs 1 to 200 characters."], "error=limit": ["warn", `A strategy can have ${MAX_ACTIVE_ITEMS} active rules. Retire one first.`], "error=strategies": ["warn", `You can keep up to ${MAX_STRATEGIES} strategies.`],
};

export default async function Playbook({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const { db, plan } = await getContext();
  const writable = PLANS[plan].playbook;
  const { strategies, items } = await db(async (q) => ({
    strategies: await q<Strat>("select s.id, s.name, (select count(*)::int from tradenotes.trades t where t.strategy_id = s.id) as trades from tradenotes.strategies s order by lower(s.name) limit 100"),
    items: await q<Item>(
      `select i.id, i.strategy_id, i.text, i.archived, count(c.item_id)::int as answered, (count(c.item_id) filter (where c.followed))::int as followed
       from tradenotes.playbook_items i left join tradenotes.trade_checks c on c.item_id = i.id group by i.id order by i.position, i.created_at`),
  }));
  const msg = sp.ok ? MESSAGES[`ok=${sp.ok}`] : sp.error ? MESSAGES[`error=${sp.error}`] : undefined;
  const anyItems = items.length > 0;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Playbook" sub="The rules each strategy must meet before you enter. Tick them on a trade afterwards to see what following them is worth." />
      {msg && <Notice kind={msg[0]}>{msg[1]}</Notice>}
      {!writable && (anyItems
        ? <UpgradeNotice feature="Editing the playbook">Your existing rules and answers stay readable. Adding or changing rules needs a paid plan.</UpgradeNotice>
        : <UpgradeNotice feature="The playbook">Write an entry checklist per strategy, tick it on each trade, and see your results with and without following your rules. Your journal and analytics stay available on Free.</UpgradeNotice>)}

      {writable && (
        <Card>
          <h2 className="text-sm font-medium">Add a strategy</h2>
          <form action={addStrategy} className="mt-3 flex flex-wrap items-end gap-2">
            <div className="min-w-48 flex-1"><Field label="Name"><input name="name" required maxLength={60} placeholder="e.g. London breakout" className={inputCls} /></Field></div>
            <button className={btnCls}>Add strategy</button>
          </form>
          <p className="mt-2 text-xs text-muted">Strategies you type when logging a trade appear here automatically.</p>
        </Card>
      )}

      {strategies.length === 0 ? <EmptyState title="No strategies yet">{writable ? "Add one above, or log a trade with a strategy name." : "Strategies you log trades with appear here."}</EmptyState> : strategies.map((s) => {
        const mine = items.filter((i) => i.strategy_id === s.id);
        const active = mine.filter((i) => !i.archived), retired = mine.filter((i) => i.archived);
        return (
          <Card key={s.id} id={`s-${s.id}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-medium">{s.name}</h2>
              <p className="text-xs text-muted">{s.trades} trade{s.trades === 1 ? "" : "s"}</p>
            </div>
            {active.length === 0 ? <p className="mt-2 text-sm text-muted">No rules yet.</p> : (
              <ol className="mt-3 divide-y divide-border text-sm">
                {active.map((i, n) => (
                  <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span className="min-w-0"><span className="text-muted">{n + 1}.</span> {i.text}
                      <span className="fig ml-2 text-xs text-muted">{i.answered > 0 ? `followed ${i.followed} of ${i.answered} (${pct(i.followed / i.answered)})` : "not ticked on any trade yet"}</span></span>
                    {writable && <form action={setItemArchived}><input type="hidden" name="item_id" value={i.id} /><input type="hidden" name="archived" value="1" /><button className="rounded px-2 py-1.5 text-xs text-muted hover:text-fg" aria-label={`Retire rule: ${i.text}`}>Retire</button></form>}
                  </li>
                ))}
              </ol>
            )}
            {writable && (
              <form action={addItem} className="mt-3 flex flex-wrap items-end gap-2">
                <input type="hidden" name="strategy_id" value={s.id} />
                <div className="min-w-48 flex-1"><Field label={`New rule for ${s.name}`}><input name="text" required maxLength={200} placeholder="e.g. Waited for a retest of the level" className={inputCls} /></Field></div>
                <button className={btnGhostCls}>Add rule</button>
              </form>
            )}
            {retired.length > 0 && (
              <details className="mt-3 text-sm"><summary className="cursor-pointer text-xs text-muted">Retired rules ({retired.length}): kept so past results stay meaningful</summary>
                <ul className="mt-2 divide-y divide-border">{retired.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-muted"><span>{i.text}</span>
                    {writable && <form action={setItemArchived}><input type="hidden" name="item_id" value={i.id} /><input type="hidden" name="archived" value="0" /><button className="rounded px-2 py-1.5 text-xs hover:text-fg" aria-label={`Restore rule: ${i.text}`}>Restore</button></form>}</li>))}</ul></details>
            )}
          </Card>
        );
      })}
      <p className="text-xs text-muted">How are these used? Open a trade, tick the rules you followed, and <Link href="/app/analytics#adherence" className={linkCls}>analytics</Link> compares your results when you followed all of them and when you did not.</p>
    </div>
  );
}
