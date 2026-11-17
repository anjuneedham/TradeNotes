"use client";
import { useState } from "react";

/** Two-step delete: the first press arms the control, the second submits the surrounding form. */
export function ConfirmDelete({ label, compact = false }: { label: string; compact?: boolean }) {
  const [armed, setArmed] = useState(false);
  const base = compact ? "rounded px-2 py-1.5 text-xs" : "inline-flex min-h-10 items-center rounded-md border px-4 text-sm font-medium";
  if (!armed) {
    return <button type="button" onClick={() => setArmed(true)} aria-label={`Delete ${label}`} className={`${base} ${compact ? "text-muted hover:text-loss" : "border-border text-muted hover:border-loss/60 hover:text-loss"}`}>Delete</button>;
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <button type="submit" aria-label={`Confirm delete ${label}. This cannot be undone.`} className={`${base} ${compact ? "bg-loss/15 font-medium text-loss" : "border-loss/60 bg-loss/10 text-loss"}`}>Confirm delete</button>
      <button type="button" onClick={() => setArmed(false)} className={`${base} ${compact ? "text-muted hover:text-fg" : "border-border text-muted hover:text-fg"}`}>Cancel</button>
    </span>
  );
}
