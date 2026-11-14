"use client";
import { useState } from "react";
export default function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="rounded-md border border-border px-3 py-2 text-sm hover:bg-panel cursor-pointer" onClick={async () => {
      try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch { window.prompt("Copy:", text); }
    }}>{done ? "Copied ✓" : label}</button>
  );
}
