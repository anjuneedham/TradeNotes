import { saveTradeChecks } from "@/app/app/playbook/actions";
import { Card, btnCls } from "./ui";
import { pct } from "@/lib/format";
import Link from "next/link";

export interface ChecklistItem { id: string; text: string; archived: boolean; followed: boolean | null }

/** The strategy's checklist on a trade: tick what you followed. Adherence = followed / answered. */
export function PlaybookChecklist({ tradeId, strategy, items, writable }: { tradeId: string; strategy: string | null; items: ChecklistItem[]; writable: boolean }) {
  const answered = items.filter((i) => i.followed !== null);
  const followed = answered.filter((i) => i.followed).length;
  if (!writable && answered.length === 0) return null; // nothing to show, and nothing a Free account can do here
  return (
    <Card id="playbook">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium">Playbook checklist{strategy ? <span className="font-normal text-muted"> · {strategy}</span> : null}</h2>
        {answered.length > 0 && <p className="fig text-xs text-muted">Followed {followed} of {answered.length} ({pct(followed / answered.length)})</p>}
      </div>
      {!strategy ? <p className="mt-2 text-sm text-muted">This trade has no strategy. Add one (edit the trade) to use its checklist.</p>
        : items.length === 0 ? <p className="mt-2 text-sm text-muted">{strategy} has no checklist yet. <Link href="/app/playbook" className="text-accent underline-offset-4 hover:underline">Build it in the playbook</Link>.</p>
        : writable ? (
          <form action={saveTradeChecks} className="mt-3">
            <input type="hidden" name="trade_id" value={tradeId} />
            <fieldset><legend className="sr-only">Rules you followed on this trade</legend>
              <ul className="space-y-1">
                {items.map((i) => (
                  <li key={i.id}><label className="flex min-h-10 items-start gap-2.5 rounded px-1 py-1.5 text-sm hover:bg-raised/60"><input type="checkbox" name="done" value={i.id} defaultChecked={i.followed === true} className="mt-0.5 h-4 w-4 shrink-0 accent-accent" /><span>{i.text}{i.archived && <span className="ml-1.5 text-xs text-muted">(retired rule)</span>}</span></label></li>
                ))}
              </ul>
            </fieldset>
            <button className={`${btnCls} mt-3`}>Save checklist</button>
            <p className="mt-2 text-xs text-muted">Ticked = you followed it. Saving records an answer for every rule listed, so an unticked rule counts as skipped.</p>
          </form>
        ) : (
          <ul className="mt-3 space-y-1 text-sm">{items.filter((i) => i.followed !== null).map((i) => <li key={i.id}>{i.followed ? "✓ Followed" : "✗ Skipped"} · {i.text}</li>)}{answered.length === 0 && <li className="text-muted">No answers recorded. Recording checklists is part of Standard and Premium.</li>}</ul>
        )}
    </Card>
  );
}
