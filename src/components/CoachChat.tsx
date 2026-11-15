"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { askCoachAction } from "@/app/app/coach/actions";
import Link from "next/link";
import { Meter, linkCls } from "./ui";

type Msg = { role: "user" | "assistant"; content: string };
const PROMPTS = ["Review my last week", "What's my most expensive habit?", "Which setup should I trade more — or drop?", "Am I overtrading?", "When do I trade best?", "Give me 3 rules for next week"];

export function CoachChat({ initial, usedPct: used0, total, resetLabel, planName, upgrade, disabled = false }: { initial: Msg[]; usedPct: number; total: number; resetLabel?: string; planName?: string; upgrade?: { href: string; label: string } | null; disabled?: boolean }) {
  const [msgs, setMsgs] = useState<Msg[]>(initial);
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [used, setUsed] = useState(used0);
  const [pending, start] = useTransition();
  const end = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  useEffect(() => { if (first.current) { first.current = false; return; } end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [msgs, pending]);
  const off = disabled || pending || used >= 100;

  const send = (q: string) => {
    if (!q.trim() || off) return;
    setErr(null); setText("");
    setMsgs((m) => [...m, { role: "user", content: q }]);
    start(async () => {
      const r = await askCoachAction(q);
      if (r.ok) { setMsgs((m) => [...m, { role: "assistant", content: r.answer }]); setUsed(r.usedPct); }
      else { setErr(r.error); if (r.usedPct !== undefined) setUsed(r.usedPct); setMsgs((m) => m.slice(0, -1)); setText(q); }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="max-h-[60vh] min-h-40 space-y-3 overflow-y-auto" aria-live="polite">
        {msgs.length === 0 && <p className="py-8 text-center text-sm text-muted">Pick a question below or ask your own.</p>}
        {msgs.map((m, i) => (
          <div key={i} className={`tn-rise flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[88%] whitespace-pre-wrap rounded-lg px-3.5 py-2.5 text-sm leading-relaxed ${m.role === "user" ? "bg-fg text-bg" : "border border-border bg-raised"}`}>
              {m.role === "assistant" && <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-accent">Coach</span>}
              {m.content}
            </div>
          </div>
        ))}
        {pending && <div className="flex"><div className="rounded-lg border border-border bg-raised px-3.5 py-2.5 text-sm text-muted"><span className="tn-dots mr-2" aria-hidden="true"><i /><i /><i /></span>Reading your journal…</div></div>}
        <div ref={end} />
      </div>
      <div className="flex flex-wrap gap-2">
        {PROMPTS.map((p) => <button key={p} type="button" disabled={off} onClick={() => send(p)} className="rounded-full border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-border-strong hover:text-fg disabled:opacity-50">{p}</button>)}
      </div>
      {err && <p className="rounded-md border border-loss/50 bg-loss/10 px-3 py-2 text-sm" role="alert">{err}</p>}
      <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="flex gap-2">
        <label htmlFor="coach-q" className="sr-only">Your question</label>
        <input id="coach-q" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} disabled={off} placeholder={disabled ? "Coach unavailable" : "Ask about your trades…"}
          className="min-h-10 flex-1 rounded-md border border-field bg-panel px-3 text-sm outline-none focus:border-accent" />
        <button disabled={off || !text.trim()} className="min-h-10 rounded-md bg-fg px-4 text-sm font-medium text-bg hover:opacity-90 disabled:opacity-50">Ask</button>
      </form>
      {planName && (
        <div className="space-y-1.5">
          <Meter value={used} max={100} label="AI Coach questions used this month" />
          <p className="flex flex-wrap items-center justify-between gap-x-3 text-xs text-muted">
            <span>About {Math.max(0, Math.floor(total * (1 - used / 100)))} of {total} questions left this month on {planName}{resetLabel ? ` · refills ${resetLabel}` : ""}</span>
            {upgrade && <Link href={upgrade.href} className={linkCls}>{upgrade.label} →</Link>}
          </p>
        </div>
      )}
    </div>
  );
}
