"use client";
import { useState } from "react";
import { btnGhostCls } from "./ui";

export function CopyBlock({ label, text, limit }: { label: string; text: string; limit: number }) {
  const [done, setDone] = useState(false);
  return (
    <section className="rounded-lg border border-border bg-panel p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">{label}</h2>
        <button type="button" className={btnGhostCls} onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* clipboard blocked: user can select the text */ } }}>{done ? "Copied" : "Copy"}</button>
      </div>
      <pre className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">{text}</pre>
      <p className="mt-2 text-xs text-muted">{text.length} / {limit} characters</p>
    </section>
  );
}
