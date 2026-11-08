"use client";
import { useActionState, useState } from "react";
import { createTrade, type FormState } from "@/app/app/journal/actions";
import { ASSET_CLASSES, SESSIONS, EMOTIONS, MISTAKES } from "@/lib/trade-schema";
import { Card, Field, Notice, inputCls, btnCls } from "./ui";

type Acct = { id: string; name: string; currency: string };
const nowLocal = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

export default function TradeForm({ accounts, defaultAsset }: { accounts: Acct[]; defaultAsset: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createTrade, {});
  const [asset, setAsset] = useState(defaultAsset);
  const [side, setSide] = useState("long");
  const v = state.values ?? {};
  const e = state.errors ?? {};
  const err = (k: string) => (e[k] ? <span className="mt-1 block text-xs text-loss">{e[k]}</span> : null);
  const sizeLabel = asset === "forex" ? "Size (lots)" : asset === "futures" ? "Contracts" : "Quantity";
  const acctCur = accounts[0]?.currency ?? "USD";

  return (
    <form action={action} className="space-y-4">
      {state.message && <Notice kind="error">{state.message}</Notice>}
      <Card className="space-y-4">
        <h2 className="font-medium">The trade</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {accounts.length > 1
            ? <Field label="Account"><select name="account_id" defaultValue={v.account_id} className={inputCls}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}</select></Field>
            : <input type="hidden" name="account_id" value={accounts[0]?.id} />}
          <Field label="Market">
            <select name="asset_class" value={asset} onChange={(x) => setAsset(x.target.value)} className={inputCls}>{ASSET_CLASSES.map((a) => <option key={a} value={a}>{a}</option>)}</select>
          </Field>
          <Field label="Instrument" hint={asset === "forex" ? "e.g. EURUSD" : undefined}><input name="symbol" defaultValue={v.symbol} required className={inputCls} />{err("symbol")}</Field>
          <Field label="Direction">
            <select name="side" value={side} onChange={(x) => setSide(x.target.value)} className={inputCls}><option value="long">Long (buy)</option><option value="short">Short (sell)</option></select>
          </Field>
          <Field label={sizeLabel}><input name="quantity" type="number" step="any" min="0" defaultValue={v.quantity} required className={inputCls} />{err("quantity")}</Field>
          <Field label="Entry price"><input name="entry_price" type="number" step="any" min="0" defaultValue={v.entry_price} required className={inputCls} />{err("entry_price")}</Field>
          <Field label="Entry time"><input name="opened_at" type="datetime-local" defaultValue={v.opened_at ?? nowLocal()} required className={inputCls} />{err("opened_at")}</Field>
          <Field label="Fees / commission / swap" hint={`In ${acctCur}-equivalent of the quote currency`}><input name="fees" type="number" step="any" min="0" defaultValue={v.fees} className={inputCls} />{err("fees")}</Field>
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-medium">Risk plan <span className="text-xs font-normal text-muted">— used to calculate R-multiple</span></h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Stop loss price"><input name="stop_price" type="number" step="any" min="0" defaultValue={v.stop_price} className={inputCls} />{err("stop_price")}</Field>
          <Field label="Take profit price"><input name="target_price" type="number" step="any" min="0" defaultValue={v.target_price} className={inputCls} />{err("target_price")}</Field>
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-medium">Exit <span className="text-xs font-normal text-muted">— leave blank if the trade is still open</span></h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Exit 1 price"><input name="exit1_price" type="number" step="any" min="0" defaultValue={v.exit1_price} className={inputCls} />{err("exit1_price")}</Field>
          <Field label="Exit 1 size" hint="Blank = the whole position"><input name="exit1_qty" type="number" step="any" min="0" defaultValue={v.exit1_qty} className={inputCls} />{err("exit1_qty")}</Field>
          <Field label="Exit 2 price (partial exits)"><input name="exit2_price" type="number" step="any" min="0" defaultValue={v.exit2_price} className={inputCls} />{err("exit2_price")}</Field>
          <Field label="Exit 2 size"><input name="exit2_qty" type="number" step="any" min="0" defaultValue={v.exit2_qty} className={inputCls} /></Field>
          <Field label="Exit time"><input name="closed_at" type="datetime-local" defaultValue={v.closed_at} className={inputCls} />{err("closed_at")}</Field>
        </div>
        <details className="text-sm">
          <summary className="cursor-pointer text-muted">Quote currency isn&apos;t {acctCur}? (e.g. USDJPY on a USD account)</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Quote currency"><input name="currency" maxLength={3} defaultValue={v.currency} placeholder={acctCur} className={inputCls} />{err("currency")}</Field>
            <Field label={`1 quote unit = ? ${acctCur}`} hint="Required when the quote currency differs from your account"><input name="fx_to_account" type="number" step="any" min="0" defaultValue={v.fx_to_account} className={inputCls} />{err("fx_to_account")}</Field>
          </div>
        </details>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-medium">Context</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Strategy / setup"><input name="strategy_name" maxLength={60} defaultValue={v.strategy_name} placeholder="e.g. London breakout" className={inputCls} /></Field>
          <Field label="Timeframe"><input name="timeframe" maxLength={10} defaultValue={v.timeframe} placeholder="M15" className={inputCls} /></Field>
          <Field label="Session"><select name="session" defaultValue={v.session ?? ""} className={inputCls}><option value="">—</option>{SESSIONS.map((s) => <option key={s}>{s}</option>)}</select></Field>
        </div>
        <Field label="Why did you take this trade? (pre-trade notes)"><textarea name="pre_trade_notes" rows={3} defaultValue={v.pre_trade_notes} className={inputCls} /></Field>
        <Field label="How did it go? (post-trade notes)"><textarea name="post_trade_notes" rows={3} defaultValue={v.post_trade_notes} className={inputCls} /></Field>
        <Field label="Lesson learned"><textarea name="lessons" rows={2} defaultValue={v.lessons} className={inputCls} /></Field>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-medium">Discipline</h2>
        <fieldset><legend className="mb-1 text-sm text-muted">How did you feel?</legend>
          <div className="flex flex-wrap gap-2">{EMOTIONS.map((x) => <label key={x} className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs"><input type="checkbox" name="emotions" value={x} /> {x}</label>)}</div>
        </fieldset>
        <fieldset><legend className="mb-1 text-sm text-muted">Any mistakes?</legend>
          <div className="flex flex-wrap gap-2">{MISTAKES.map((x) => <label key={x} className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs"><input type="checkbox" name="mistakes" value={x} /> {x}</label>)}</div>
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Did you follow your plan?"><select name="followed_plan" defaultValue={v.followed_plan ?? ""} className={inputCls}><option value="">—</option><option value="yes">Yes</option><option value="no">No</option></select></Field>
          <Field label="Discipline score (1–5)"><select name="discipline_score" defaultValue={v.discipline_score ?? ""} className={inputCls}><option value="">—</option>{[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}</select></Field>
        </div>
      </Card>
      <button disabled={pending} className={`${btnCls} w-full py-3`}>{pending ? "Saving…" : "Save trade"}</button>
    </form>
  );
}
