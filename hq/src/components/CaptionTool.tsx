"use client";
import { useMemo, useState } from "react";
import { splitCaptions, CAPTION } from "@/lib/content";

/** Splits voice-over into burned-in caption cards (≤24 chars/line, ≤2 lines) per the Andrew Builds style. */
export default function CaptionTool({ initial = "" }: { initial?: string }) {
  const [text, setText] = useState(initial);
  const { cards, tooLong } = useMemo(() => splitCaptions(text), [text]);
  const out = cards.map((c) => c.join("\n")).join("\n\n");
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <label className="mb-1 block text-sm text-muted">Voice-over text</label>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={12} className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent" placeholder="Paste the full voice-over…" />
        {tooLong.length > 0 && <p className="mt-2 text-sm text-loss">Too long for one line ({CAPTION.maxChars} chars): {tooLong.join(", ")}</p>}
        <button type="button" className="mt-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-panel" onClick={() => navigator.clipboard?.writeText(out)}>Copy cards (blank line between cards)</button>
      </div>
      <div>
        <p className="mb-1 text-sm text-muted">{cards.length} caption card{cards.length === 1 ? "" : "s"} · max {CAPTION.maxLines} lines × {CAPTION.maxChars} characters</p>
        <ol className="space-y-2">{cards.map((c, i) => <li key={i} className="rounded-md bg-black/60 px-3 py-2 text-center text-lg font-semibold leading-tight">{c.map((l, j) => <div key={j}>{l}</div>)}</li>)}</ol>
      </div>
    </div>
  );
}
