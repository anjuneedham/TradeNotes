"use client";
import { useState } from "react";
import { inputCls } from "@/components/ui";

const n = (v: string) => { const x = parseFloat(v); return Number.isFinite(x) ? x : NaN; };
const sign = (x: number) => (x >= 0 ? "+" : "−");
const fmtR = (x: number) => (Number.isFinite(x) ? `${sign(x)}${Math.abs(x).toFixed(2)}R` : "—");

/** Expectancy in R = win% × average win − loss% × average loss, before and after costs; the win rate that breaks even; trades needed to reach a target. */
export default function ExpectancyCalculator() {
  const [win, setWin] = useState("40");
  const [avgWin, setAvgWin] = useState("2");
  const [avgLoss, setAvgLoss] = useState("1");
  const [cost, setCost] = useState("0.05");
  const [target, setTarget] = useState("10");

  const p = n(win) / 100, w = n(avgWin), l = Math.abs(n(avgLoss)), c = Math.max(0, n(cost) || 0), t = n(target);
  const valid = p >= 0 && p <= 1 && w >= 0 && l > 0;
  const before = valid ? p * w - (1 - p) * l : NaN;
  const after = before - c;
  const breakEven = valid && w + l > 0 ? ((l + c) / (w + l)) * 100 : NaN;
  const breakEvenFree = valid && w + l > 0 ? (l / (w + l)) * 100 : NaN;
  const trades = after > 0 && t > 0 ? Math.ceil(t / after) : NaN;

  const field = (label: string, v: string, set: (s: string) => void, hint?: string) => (
    <label className="block text-sm">
      <span className="text-muted">{label}</span>
      <input inputMode="decimal" value={v} onChange={(ev) => set(ev.target.value)} className={`${inputCls} mt-1`} />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );

  let verdict = "Enter your numbers.";
  if (valid) verdict = after > 0 ? "Positive after costs on these numbers." : before > 0 ? "Positive before costs, but costs wipe it out." : "Negative: this set of numbers loses money on average.";

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-xl border border-border bg-panel p-5">
        <h3 className="font-semibold">Your numbers (from your journal)</h3>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {field("Win rate (%)", win, setWin)}
          {field("Average win (R)", avgWin, setAvgWin)}
          {field("Average loss (R)", avgLoss, setAvgLoss, "Usually about 1")}
          {field("Costs per trade (R)", cost, setCost, "Fees + spread + slippage")}
          {field("Target (R)", target, setTarget, "e.g. 10R for a 10% target at 1% risk")}
        </div>
      </div>
      <div className="rounded-xl border border-border bg-panel p-5">
        <h3 className="font-semibold">What they add up to</h3>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm" aria-live="polite">
          <dt className="text-muted">Expectancy before costs</dt><dd className="fig">{fmtR(before)} per trade</dd>
          <dt className="text-muted">Expectancy after costs</dt><dd className="fig text-lg font-semibold">{fmtR(after)} per trade</dd>
          <dt className="text-muted">Break-even win rate</dt><dd className="fig">{Number.isFinite(breakEven) ? `${breakEven.toFixed(1)}%` : "—"}{Number.isFinite(breakEvenFree) && c > 0 ? ` (${breakEvenFree.toFixed(1)}% before costs)` : ""}</dd>
          <dt className="text-muted">Trades to reach target</dt><dd className="fig">{Number.isFinite(trades) ? `about ${trades.toLocaleString("en-US")}` : after > 0 ? "—" : "never, on average"}</dd>
        </dl>
        <p className="mt-4 text-sm">{verdict}</p>
        <p className="mt-1 text-xs text-muted">An average over many trades, not a forecast. Real results come in streaks.</p>
      </div>
    </div>
  );
}
