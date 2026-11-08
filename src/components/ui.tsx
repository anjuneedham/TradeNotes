import type { ReactNode } from "react";

export const inputCls = "w-full rounded-md border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent";
export const btnCls = "rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50";
export const btnGhostCls = "rounded-md border border-border px-4 py-2 text-sm hover:bg-panel";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-border bg-panel p-5 ${className}`}>{children}</div>;
}
export function Notice({ kind = "info", children }: { kind?: "info" | "error" | "ok"; children: ReactNode }) {
  const c = kind === "error" ? "border-loss/50 bg-loss/10" : kind === "ok" ? "border-win/50 bg-win/10" : "border-accent/50 bg-accent/10";
  return <div className={`rounded-md border p-3 text-sm ${c}`} role={kind === "error" ? "alert" : undefined}>{children}</div>;
}
