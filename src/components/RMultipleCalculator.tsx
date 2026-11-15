"use client";
import { useState } from "react";
import { inputCls } from "@/components/ui";

const n = (v: string) => { const x = parseFloat(v); return Number.isFinite(x) ? x : NaN; };
const fmt = (x: number, d = 2) => (Number.isFinite(x) ? x.toFixed(d) : "—");
const fmt1 = (x: number) => (Number.isFinite(x) ? String(Math.round(x * 10) / 10) : "—");

/** Two calculators: one trade's R-multiple, and how many R a prop firm challenge's target and loss limits are worth at your risk per trade. */
export default function RMultipleCalculator() {
  const [entry, setEntry] = useState("1.0850");
  const [stop, setStop] = useState("1.0820");
  const [exit, setExit] = useState("1.0910");
  const [account, setAccount] = useState("100000");
  const [riskPct, setRiskPct] = useState("0.5");
  const [target, setTarget] = useState("10");
  const [maxLoss, setMaxLoss] = useState("10");
  const [daily, setDaily] = useState("5");

  const e = n(entry), s = n(stop), x = n(exit);
  const risk = Math.abs(e - s);
  const long = e > s;
  const r = risk > 0 ? (long ? x - e : e - x) / risk : NaN;

  const rp = n(riskPct);
  const oneR = (n(account) * rp) / 100;
  const inR = (pct: string) => (rp > 0 ? n(pct) / rp : NaN);

  const field = (label: string, v: string, set: (s: string) => void, hint?: string) => (
    <label className="block text-sm">
      <span className="text-muted">{label}</span>
      <input inputMode="decimal" value={v} onChange={(ev) => set(ev.target.value)} className={`${inputCls} mt-1`} />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-xl border border-border bg-panel p-5">
        <h3 className="font-semibold">1. R-multiple of one trade</h3>
        <div className="mt-3 grid grid-cols-3 gap-2">{field("Entry", entry, setEntry)}{field("Stop loss", stop, setStop)}{field("Exit", exit, setExit)}</div>
        <p className="mt-4 text-sm text-muted">{risk > 0 ? `${long ? "Long" : "Short"} trade. Risk = ${fmt(risk, 5)} per unit.` : "Entry and stop must be different."}</p>
        <p className="fig mt-1 text-3xl font-semibold" aria-live="polite">{Number.isFinite(r) ? `${r >= 0 ? "+" : ""}${fmt(r)}R` : "—"}</p>
        <p className="mt-1 text-xs text-muted">Price-based R, before fees. Fees make the real result slightly lower.</p>
      </div>
      <div className="rounded-xl border border-border bg-panel p-5">
        <h3 className="font-semibold">2. Your prop firm challenge in R</h3>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {field("Account size ($)", account, setAccount)}{field("Risk per trade (%)", riskPct, setRiskPct)}
          {field("Profit target (%)", target, setTarget)}{field("Max total loss (%)", maxLoss, setMaxLoss)}
          {field("Daily loss limit (%)", daily, setDaily, "Leave blank if none")}
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-sm" aria-live="polite">
          <dt className="text-muted">1R =</dt><dd className="fig">{Number.isFinite(oneR) ? `$${oneR.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "—"}</dd>
          <dt className="text-muted">Target =</dt><dd className="fig">{fmt1(inR(target))}R</dd>
          <dt className="text-muted">Max loss =</dt><dd className="fig">{fmt1(inR(maxLoss))} losing trades in a row</dd>
          <dt className="text-muted">Daily limit =</dt><dd className="fig">{daily ? `${fmt1(inR(daily))} losses in one day` : "—"}</dd>
        </dl>
      </div>
    </div>
  );
}
