"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { createTrade, updateTrade, type FormState } from "@/app/app/journal/actions";
import { createBacktest, updateBacktest } from "@/app/app/backtests/actions";
import { HYPOTHETICAL, HYPOTHETICAL_DETAIL } from "@/lib/backtest";
import { ASSET_CLASSES, SESSIONS, EMOTIONS, MISTAKES, defaultMultiplier } from "@/lib/trade-schema";
import { futuresSpec } from "@/lib/instruments";
import { Card, Field, Notice, inputCls, btnCls, btnGhostCls } from "./ui";

type Acct = { id: string; name: string; currency: string };
const nowLocal = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
const ASSET_LABEL: Record<string, string> = { forex: "Forex", future: "Futures", stock: "Stocks", option: "Options", crypto: "Crypto", other: "Other" };
const n = (v: string | undefined) => { const x = Number(v); return v && Number.isFinite(x) && x > 0 ? x : null; };
const fmt = (x: number) => x.toLocaleString("en-US", { maximumFractionDigits: 2 });

function Section({ step, title, sub, children }: { step: number; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <Card className="space-y-4">
      <div className="flex items-baseline gap-2.5">
        <span className="fig text-xs text-muted">{step}</span>
        <h2 className="font-medium">{title}</h2>
        {sub && <span className="text-xs text-muted">{sub}</span>}
      </div>
      {children}
    </Card>
  );
}

function Chips({ name, legend, options, picked, toggle }: { name: string; legend: string; options: readonly string[]; picked: Set<string>; toggle: (v: string) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{legend} <span className="font-normal text-muted">· choose any</span></legend>
      <div className="flex flex-wrap gap-2">
        {options.map((x) => (
          <label key={x} className="relative inline-flex min-h-9 cursor-pointer select-none items-center rounded-full border border-border px-3 text-sm text-muted hover:border-border-strong has-[:checked]:border-accent has-[:checked]:bg-accent/10 has-[:checked]:text-fg has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent">
            <input type="checkbox" name={name} value={x} checked={picked.has(x)} onChange={() => toggle(x)} className="absolute inset-0 cursor-pointer opacity-0" />{x}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** `edit` pre-fills the form from a saved trade and submits to updateTrade instead of createTrade. */
export type TradeInitial = { id: string; values: Record<string, string>; emotions: string[]; mistakes: string[] };
export default function TradeForm({ accounts, defaultAsset, edit, defaultAccount, variant = "trade" }: { accounts: Acct[]; defaultAsset: string; edit?: TradeInitial; defaultAccount?: string; variant?: "trade" | "backtest" }) {
  // "backtest" = the hypothetical log: same fields and the same validation, but no account, no currency conversion and no discipline section.
  const bt = variant === "backtest";
  const [state, action, pending] = useActionState<FormState, FormData>(bt ? (edit ? updateBacktest : createBacktest) : edit ? updateTrade : createTrade, {});
  const [asset, setAsset] = useState(edit?.values.asset_class ?? defaultAsset);
  const [side, setSide] = useState<"long" | "short">(edit?.values.side === "short" ? "short" : "long");
  const [emotions, setEmotions] = useState<Set<string>>(new Set(edit?.emotions ?? []));
  const [mistakes, setMistakes] = useState<Set<string>>(new Set(edit?.mistakes ?? []));
  const [live, setLive] = useState<Record<string, string>>({});
  const flip = (set: React.Dispatch<React.SetStateAction<Set<string>>>) => (v: string) => set((s) => { const c = new Set(s); if (c.has(v)) c.delete(v); else c.add(v); return c; });

  const v = state.values ?? edit?.values ?? {};
  const e = state.errors ?? {};
  const sizeLabel = asset === "forex" ? "Size (lots)" : asset === "future" ? "Contracts" : "Quantity";
  const acctCur = accounts[0]?.currency ?? "USD";
  const errorCount = Object.keys(e).length;
  const inv = (k: string) => ({ "aria-invalid": e[k] ? (true as const) : undefined });

  // Live read-out of the plan, in the instrument's quote currency (same formula the server uses, before FX conversion).
  const g = (k: string) => n(live[k] ?? v[k]);
  const entry = g("entry_price"), stop = g("stop_price"), target = g("target_price"), qty = g("quantity"), exit1 = g("exit1_price");
  const symbol = (live.symbol ?? v.symbol ?? "").toUpperCase();
  const spec = asset === "future" ? futuresSpec(symbol) : null;
  const mult = g("multiplier") ?? defaultMultiplier(asset, symbol);
  const risk = entry && stop && qty ? Math.abs(entry - stop) * qty * mult : null;
  const rr = entry && stop && target && entry !== stop ? Math.abs(target - entry) / Math.abs(entry - stop) : null;
  const gross = entry && exit1 && qty && !g("exit2_price") && !g("exit1_qty") ? (side === "long" ? 1 : -1) * (exit1 - entry) * qty * mult : null;

  return (
    <form action={action} className="space-y-4" noValidate={false}
      onInput={(ev) => { const t = ev.target as HTMLInputElement; if (t.name && (t.type === "number" || t.name === "symbol")) setLive((l) => ({ ...l, [t.name]: t.value })); }}>
      {state.code === "limit" ? (
        <Notice kind="warn">
          <p className="font-medium">You&apos;ve reached your plan&apos;s trade limit</p>
          <p className="mt-1">{state.message} Nothing was saved. Your existing trades and statistics are not affected.</p>
          <Link href="/app/billing" className={`${btnGhostCls} mt-3`}>See plans</Link>
        </Notice>
      ) : state.message ? (
        <Notice kind="error">{state.message}{errorCount > 0 && <> ({errorCount} field{errorCount === 1 ? "" : "s"})</>}</Notice>
      ) : null}

      {bt && <Notice kind="warn"><p className="font-medium">{HYPOTHETICAL}</p><p className="mt-1">{HYPOTHETICAL_DETAIL}</p></Notice>}
      {edit && <input type="hidden" name="trade_id" value={edit.id} />}
      <Section step={1} title="The trade">
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Direction</legend>
          <div className="grid grid-cols-2 gap-2 sm:max-w-xs">
            {(["long", "short"] as const).map((s) => (
              <label key={s} className="relative flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-border text-sm text-muted hover:border-border-strong has-[:checked]:border-fg has-[:checked]:bg-raised has-[:checked]:font-medium has-[:checked]:text-fg has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent sm:min-h-10">
                <input type="radio" name="side" value={s} checked={side === s} onChange={() => setSide(s)} className="absolute inset-0 cursor-pointer opacity-0" />
                {s === "long" ? "Long (buy)" : "Short (sell)"}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          {bt ? null : accounts.length > 1
            ? <Field label="Account"><select name="account_id" defaultValue={v.account_id ?? defaultAccount} className={inputCls}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}</select></Field>
            : <input type="hidden" name="account_id" value={accounts[0]?.id} />}
          <Field label="Market">
            <select name="asset_class" value={asset} onChange={(x) => setAsset(x.target.value)} className={inputCls}>{ASSET_CLASSES.map((a) => <option key={a} value={a}>{ASSET_LABEL[a] ?? a}</option>)}</select>
          </Field>
          <Field label="Instrument" hint={asset === "forex" ? "e.g. EURUSD" : undefined} error={e.symbol}><input name="symbol" defaultValue={v.symbol} required autoCapitalize="characters" autoComplete="off" className={inputCls} {...inv("symbol")} /></Field>
          <Field label={sizeLabel} hint={asset === "forex" ? "1 lot = 100,000 units. Mini = 0.1, micro = 0.01." : undefined} error={e.quantity}><input name="quantity" type="number" inputMode="decimal" step="any" min="0" defaultValue={v.quantity} required className={inputCls} {...inv("quantity")} /></Field>
          {(asset === "future" || asset === "option" || Boolean(v.multiplier)) && (
            <Field label={asset === "future" ? "Point value (per contract)" : asset === "option" ? "Contract multiplier" : "Contract size (P&L per 1.00 price move per unit)"} error={e.multiplier}
              hint={asset !== "future" && asset !== "option" ? "Set from your broker's figures when imported. Leave as is unless you know it's wrong." : asset === "option" ? "Standard equity options: 100. Leave blank for 100." : spec ? `${spec.name}: $${spec.pointValue.toLocaleString("en-US")} per point (tick ${spec.tickSize} = $${spec.tickValue}). Leave blank to use this.` : "Dollars per 1.00 price move, e.g. ES 50, NQ 20, CL 1000."}>
              <input name="multiplier" type="number" inputMode="decimal" step="any" min="0" defaultValue={v.multiplier} className={inputCls} {...inv("multiplier")} />
            </Field>
          )}
          <Field label="Entry price" error={e.entry_price}><input name="entry_price" type="number" inputMode="decimal" step="any" min="0" defaultValue={v.entry_price} required className={inputCls} {...inv("entry_price")} /></Field>
          <Field label="Entry time" hint="Stored and reported in UTC." error={e.opened_at}><input name="opened_at" type="datetime-local" defaultValue={v.opened_at ?? nowLocal()} required className={inputCls} {...inv("opened_at")} /></Field>
          <Field label="Fees / commission / swap" hint={bt ? "Total, in the same units as your prices. Leave blank for none." : "Total, in the quote currency. Leave blank for none."} error={e.fees}><input name="fees" type="number" inputMode="decimal" step="any" min="0" defaultValue={v.fees} className={inputCls} {...inv("fees")} /></Field>
        </div>
      </Section>

      <Section step={2} title="Risk plan" sub="optional — a stop unlocks R-multiples">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Stop loss price" error={e.stop_price}><input name="stop_price" type="number" inputMode="decimal" step="any" min="0" defaultValue={v.stop_price} className={inputCls} {...inv("stop_price")} /></Field>
          <Field label="Take profit price" error={e.target_price}><input name="target_price" type="number" inputMode="decimal" step="any" min="0" defaultValue={v.target_price} className={inputCls} {...inv("target_price")} /></Field>
        </div>
        <dl aria-live="polite" className="grid grid-cols-2 gap-3 rounded-md bg-raised px-3.5 py-3 text-sm">
          <div><dt className="text-xs text-muted">Planned risk</dt><dd className="fig mt-0.5">{risk !== null ? fmt(risk) : "—"}</dd></div>
          <div><dt className="text-xs text-muted">Reward : risk</dt><dd className="fig mt-0.5">{rr !== null ? `${rr.toFixed(2)} : 1` : "—"}</dd></div>
          <p className="col-span-2 text-xs text-muted">{risk === null ? "Enter size, entry and stop to see what this trade puts at risk." : "In the instrument's quote currency, before any conversion to your account currency."}</p>
        </dl>
      </Section>

      <Section step={3} title="Exit" sub="leave blank if the trade is still open">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Exit 1 price" error={e.exit1_price}><input name="exit1_price" type="number" inputMode="decimal" step="any" min="0" defaultValue={v.exit1_price} className={inputCls} {...inv("exit1_price")} /></Field>
          <Field label="Exit 1 size" hint="Blank = the whole position" error={e.exit1_qty}><input name="exit1_qty" type="number" inputMode="decimal" step="any" min="0" defaultValue={v.exit1_qty} className={inputCls} {...inv("exit1_qty")} /></Field>
          <Field label="Exit time" error={e.closed_at}><input name="closed_at" type="datetime-local" defaultValue={v.closed_at} className={inputCls} {...inv("closed_at")} /></Field>
        </div>
        {gross !== null && (
          <p aria-live="polite" className="rounded-md bg-raised px-3.5 py-3 text-sm">
            <span className="text-xs text-muted">Result before fees · quote currency</span>
            <span className={`fig mt-0.5 block ${gross > 0 ? "text-win" : gross < 0 ? "text-loss" : ""}`}>{gross > 0 ? "+" : ""}{fmt(gross)}{risk ? ` · ${(gross / risk > 0 ? "+" : "") + (gross / risk).toFixed(2)}R before fees` : ""}</span>
          </p>
        )}
        <details className="text-sm" open={Boolean(v.exit2_price || v.exit2_qty || e.exit2_price)}>
          <summary className="cursor-pointer py-1 text-muted hover:text-fg">Closed in two parts? Add a second exit</summary>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label="Exit 2 price (partial exits)" error={e.exit2_price}><input name="exit2_price" type="number" inputMode="decimal" step="any" min="0" defaultValue={v.exit2_price} className={inputCls} {...inv("exit2_price")} /></Field>
            <Field label="Exit 2 size"><input name="exit2_qty" type="number" inputMode="decimal" step="any" min="0" defaultValue={v.exit2_qty} className={inputCls} /></Field>
          </div>
        </details>
        {!bt && <details className="text-sm" open={Boolean(v.currency || v.fx_to_account || e.currency || e.fx_to_account)}>
          <summary className="cursor-pointer py-1 text-muted hover:text-fg">Quote currency isn&apos;t {acctCur}? (e.g. USDJPY on a {acctCur} account)</summary>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label="Quote currency" error={e.currency}><input name="currency" maxLength={3} defaultValue={v.currency} placeholder={acctCur} autoCapitalize="characters" className={inputCls} {...inv("currency")} /></Field>
            <Field label={`1 quote unit = ? ${acctCur}`} hint="Required when the quote currency differs from your account" error={e.fx_to_account}><input name="fx_to_account" type="number" inputMode="decimal" step="any" min="0" defaultValue={v.fx_to_account} className={inputCls} {...inv("fx_to_account")} /></Field>
          </div>
        </details>}
      </Section>

      <Section step={4} title="Context & notes" sub="optional">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Strategy / setup"><input name="strategy_name" maxLength={60} defaultValue={v.strategy_name} placeholder="e.g. London breakout" className={inputCls} /></Field>
          <Field label="Timeframe"><input name="timeframe" maxLength={10} defaultValue={v.timeframe} placeholder="M15" className={inputCls} /></Field>
          <Field label="Session"><select name="session" defaultValue={v.session ?? ""} className={inputCls}><option value="">—</option>{SESSIONS.map((s) => <option key={s}>{s}</option>)}</select></Field>
        </div>
        <Field label="Why did you take this trade? (pre-trade notes)"><textarea name="pre_trade_notes" rows={3} defaultValue={v.pre_trade_notes} className={inputCls} /></Field>
        <Field label="How did it go? (post-trade notes)"><textarea name="post_trade_notes" rows={3} defaultValue={v.post_trade_notes} className={inputCls} /></Field>
        <Field label="Lesson learned"><textarea name="lessons" rows={2} defaultValue={v.lessons} className={inputCls} /></Field>
      </Section>

      {!bt && <Section step={5} title="Discipline" sub="optional">
        <Chips name="emotions" legend="How did you feel?" options={EMOTIONS} picked={emotions} toggle={flip(setEmotions)} />
        <Chips name="mistakes" legend="Any mistakes?" options={MISTAKES} picked={mistakes} toggle={flip(setMistakes)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Did you follow your plan?"><select name="followed_plan" defaultValue={v.followed_plan ?? ""} className={inputCls}><option value="">—</option><option value="yes">Yes</option><option value="no">No</option></select></Field>
          <Field label="Discipline score (1–5)" hint="1 = broke my rules, 5 = followed them exactly."><select name="discipline_score" defaultValue={v.discipline_score ?? ""} className={inputCls}><option value="">—</option>{[1, 2, 3, 4, 5].map((x) => <option key={x}>{x}</option>)}</select></Field>
        </div>
      </Section>}

      <div className="sticky bottom-[4.5rem] z-20 -mx-4 flex items-center gap-3 border-t border-border bg-bg/95 px-4 py-3 backdrop-blur md:bottom-0 md:mx-0 md:px-0">
        <button disabled={pending} className={`${btnCls} flex-1 sm:flex-none sm:px-8`}>{pending ? "Saving…" : edit ? "Save changes" : bt ? "Save hypothetical trade" : "Save trade"}</button>
        <Link href={bt ? (edit ? `/app/backtests/${edit.id}` : "/app/backtests") : edit ? `/app/journal/${edit.id}` : "/app/journal"} className={btnGhostCls}>Cancel</Link>
        <span className="ml-auto hidden text-xs text-muted sm:block">Only instrument, size, entry price and time are required.</span>
      </div>
    </form>
  );
}
