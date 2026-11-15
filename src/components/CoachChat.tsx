"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { askCoachAction } from "@/app/app/coach/actions";

type Msg = { role: "user" | "assistant"; content: string };
const PROMPTS = ["Review my last week", "What's my most expensive habit?", "Which setup should I trade more — or drop?", "Am I overtrading?", "When am I at my best?", "Build me 3 rules for next week"];

export default function CoachChat({ initial, remaining: rem0, disabled = false }: { initial: Msg[]; remaining: number; disabled?: boolean }) {
  const [msgs, setMsgs] = useState<Msg[]>(initial);
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(rem0);
  const [pending, start] = useTransition();
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [msgs, pending]);

  const send = (q: string) => {
    if (!q.trim() || pending || disabled) return;
    setErr(null); setText("");
    setMsgs((m) => [...m, { role: "user", content: q }]);
    start(async () => {
      const r = await askCoachAction(q);
      if (r.ok) { setMsgs((m) => [...m, { role: "assistant", content: r.answer }]); setRemaining(r.remaining); }
      else { setErr(r.error); setMsgs((m) => m.slice(0, -1)); setText(q); }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="max-h-[60vh] min-h-48 space-y-3 overflow-y-auto pr-1">
        {msgs.length === 0 && <p className="py-6 text-center text-sm text-muted">Start with one of these, or ask your own question.</p>}
        {msgs.map((m, i) => (
          <div key={i} className={`anim-fade-up flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === "user" ? "rounded-br-sm bg-gradient-to-r from-accent to-indigo-500 text-white" : "rounded-bl-sm border border-border bg-panel-2"}`}>
              {m.role === "assistant" && <span className="mb-1 block text-[11px] font-semibold text-indigo-300">✦ Coach</span>}
              {m.content}
            </div>
          </div>
        ))}
        {pending && (
          <div className="flex justify-start"><div className="rounded-2xl rounded-bl-sm border border-border bg-panel-2 px-4 py-3 text-sm text-muted">
            <span className="mr-2 inline-flex gap-1">{[0, 1, 2].map((d) => <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-300" style={{ animationDelay: `${d * 120}ms` }} />)}</span>
            Reading your journal…
          </div></div>
        )}
        <div ref={end} />
      </div>
      <div className="flex flex-wrap gap-2">
        {PROMPTS.map((p) => <button key={p} type="button" disabled={pending || disabled} onClick={() => send(p)} className="rounded-full border border-border px-3 py-1 text-xs text-muted transition hover:border-accent/60 hover:text-fg disabled:opacity-50">{p}</button>)}
      </div>
      {err && <p className="rounded-lg border border-loss/40 bg-loss/10 p-2 text-sm" role="alert">{err}</p>}
      <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} disabled={pending || disabled} placeholder={disabled ? "Coach unavailable" : "Ask about your trades…"}
          className="flex-1 rounded-lg border border-border bg-bg/60 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" />
        <button disabled={pending || disabled || !text.trim()} className="rounded-lg bg-gradient-to-r from-accent to-indigo-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Ask</button>
      </form>
      <p className="text-right text-[11px] text-muted">{remaining} question{remaining === 1 ? "" : "s"} left today</p>
    </div>
  );
}
