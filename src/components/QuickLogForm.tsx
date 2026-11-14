"use client";
import Link from "next/link";
import { useActionState } from "react";
import { quickLog } from "@/app/app/quick/actions";
import type { QuickState } from "@/lib/quick";
import { Notice, btnCls, btnGhostCls } from "./ui";

/** Big, thumb-sized inputs: 56px tall and 16px+ text (below 16px iOS zooms the page on focus). */
const big = "w-full min-h-14 rounded-lg border border-field bg-bg px-4 text-lg text-fg placeholder:text-muted outline-none hover:border-muted focus:border-accent aria-[invalid=true]:border-loss";

/**
 * The six-field phone form: instrument, side, size, entry, exit (blank = still open), stop. Instrument, side and size start from the
 * last trade; after a save they stay (so the next trade is three taps) and only the prices clear.
 */
export function QuickLogForm({ defaults, plan }: { defaults: { symbol: string; side: "long" | "short"; quantity: string }; plan: { name: string; limit: number | null; used: number } }) {
  const [state, action, pending] = useActionState<QuickState, FormData>(quickLog, {});
  const saved = Boolean(state.savedId);
  const v = state.values ?? { ...defaults };
  const e = state.errors ?? {};
  const inv = (k: string) => ({ "aria-invalid": e[k] ? (true as const) : undefined });
  const side = v.side === "short" ? "short" : "long";
  // At the plan's trade limit (including right after saving the last allowed trade) the fields give way to the upgrade notice; the save confirmation stays.
  if (plan.limit !== null && plan.used >= plan.limit) {
    return (
      <div className="space-y-4">
        {saved && <Notice kind="ok"><span data-testid="quick-saved">Saved {state.savedLabel}.</span> <Link href={`/app/journal/${state.savedId}`} className="underline underline-offset-2">Open it</Link> to add notes or fix the time.</Notice>}
        <Notice kind="warn">
          <p className="font-medium">You&apos;ve used all {plan.limit.toLocaleString("en-US")} trades on the {plan.name} plan</p>
          <p className="mt-1">Everything you&apos;ve logged stays available. To log more, move to a plan with a higher limit.</p>
          <div className="mt-3 flex flex-wrap gap-2"><Link href="/app/billing" className={btnCls}>See plans</Link><Link href="/app/journal" className={btnGhostCls}>Back to journal</Link></div>
        </Notice>
      </div>
    );
  }
  return (
    // key: a fresh form (cleared prices) after every successful save; kept instrument/side/size come back through `values`
    <form key={state.n ?? 0} action={action} className="space-y-4" data-testid="quick-form">
      {saved && (
        <Notice kind="ok"><span data-testid="quick-saved">Saved {state.savedLabel}.</span> <Link href={`/app/journal/${state.savedId}`} className="underline underline-offset-2">Open it</Link> to add notes or fix the time.</Notice>
      )}
      {state.code === "limit" ? (
        <Notice kind="warn"><p className="font-medium">You&apos;ve reached your plan&apos;s trade limit</p><p className="mt-1">{state.message} Nothing was saved.</p><Link href="/app/billing" className={`${btnGhostCls} mt-3`}>See plans</Link></Notice>
      ) : state.message ? <Notice kind="error">{state.message} <Link href="/app/journal/new" className="underline underline-offset-2">Use the full form</Link></Notice> : null}

      <label className="block"><span className="mb-1.5 block text-sm font-medium">Instrument</span>
        <input name="symbol" defaultValue={v.symbol} required autoCapitalize="characters" autoComplete="off" autoCorrect="off" spellCheck={false} placeholder="EURUSD" className={big} {...inv("symbol")} />
        {e.symbol && <span role="alert" className="mt-1 block text-xs text-loss">{e.symbol}</span>}</label>

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Side</legend>
        <div className="grid grid-cols-2 gap-3">
          {(["long", "short"] as const).map((s) => (
            <label key={s} className="relative flex min-h-14 cursor-pointer items-center justify-center rounded-lg border border-border text-lg text-muted has-[:checked]:border-fg has-[:checked]:bg-raised has-[:checked]:font-semibold has-[:checked]:text-fg has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent">
              <input type="radio" name="side" value={s} defaultChecked={side === s} className="absolute inset-0 cursor-pointer opacity-0" />
              {s === "long" ? "Long (buy)" : "Short (sell)"}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block"><span className="mb-1.5 block text-sm font-medium">Size</span>
        <input name="quantity" type="number" inputMode="decimal" step="any" min="0" defaultValue={v.quantity} required placeholder="lots, contracts or units" className={big} {...inv("quantity")} />
        {e.quantity && <span role="alert" className="mt-1 block text-xs text-loss">{e.quantity}</span>}</label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block"><span className="mb-1.5 block text-sm font-medium">Entry price</span>
          <input name="entry_price" type="number" inputMode="decimal" step="any" min="0" defaultValue={saved ? "" : v.entry_price} required className={big} {...inv("entry_price")} />
          {e.entry_price && <span role="alert" className="mt-1 block text-xs text-loss">{e.entry_price}</span>}</label>
        <label className="block"><span className="mb-1.5 block text-sm font-medium">Stop price</span>
          <input name="stop_price" type="number" inputMode="decimal" step="any" min="0" defaultValue={saved ? "" : v.stop_price} placeholder="optional" className={big} {...inv("stop_price")} />
          {e.stop_price && <span role="alert" className="mt-1 block text-xs text-loss">{e.stop_price}</span>}</label>
      </div>

      <label className="block"><span className="mb-1.5 block text-sm font-medium">Exit price <span className="font-normal text-muted">· leave blank if still open</span></span>
        <input name="exit_price" type="number" inputMode="decimal" step="any" min="0" defaultValue={saved ? "" : v.exit_price} className={big} {...inv("exit_price")} />
        {e.exit_price && <span role="alert" className="mt-1 block text-xs text-loss">{e.exit_price}</span>}</label>

      <button disabled={pending} className={`${btnCls} !min-h-14 w-full !text-lg`}>{pending ? "Saving…" : "Save trade"}</button>
      <p className="text-xs text-muted">Entry and exit times are set to now. Open the saved trade to change them, add notes or tag a mistake.</p>
    </form>
  );
}
