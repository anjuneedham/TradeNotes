import type { ReactNode } from "react";
import Link from "next/link";

export const inputCls = "w-full rounded-lg border border-border bg-bg/60 px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20";
export const btnCls = "rounded-lg bg-gradient-to-r from-accent to-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-accent/20 transition hover:brightness-110 disabled:opacity-50";
export const btnGhostCls = "rounded-lg border border-border px-4 py-2 text-sm transition hover:border-accent/50 hover:bg-panel-2";

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
  return <div className={`glass rounded-xl border border-border p-5 ${className}`}>{children}</div>;
}
export function Notice({ kind = "info", children }: { kind?: "info" | "error" | "ok"; children: ReactNode }) {
  const c = kind === "error" ? "border-loss/50 bg-loss/10" : kind === "ok" ? "border-win/50 bg-win/10" : "border-accent/40 bg-accent/10";
  return <div className={`rounded-lg border p-3 text-sm ${c}`} role={kind === "error" ? "alert" : undefined}>{children}</div>;
}
export function SectionTitle({ children, sub, right }: { children: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div><h2 className="text-sm font-semibold tracking-wide">{children}</h2>{sub && <p className="text-xs text-muted">{sub}</p>}</div>
      {right}
    </div>
  );
}
export function Badge({ children, tone = "accent" }: { children: ReactNode; tone?: "accent" | "win" | "loss" | "muted" }) {
  const c = { accent: "bg-accent/15 text-indigo-300", win: "bg-win/15 text-win", loss: "bg-loss/15 text-loss", muted: "bg-panel-2 text-muted" }[tone];
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${c}`}>{children}</span>;
}

/**
 * Curiosity hook: renders a blurred preview of a locked feature with a clear unlock CTA.
 * The preview is illustrative placeholder content, never the user's real numbers.
 */
export function Locked({ plan, title, teaser, children }: { plan: "Starter" | "Pro"; title: string; teaser: string; children: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border">
      <div aria-hidden className="pointer-events-none select-none opacity-60 blur-[5px]">{children}</div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-bg/40 p-6 text-center">
        <span className="pulse-ring flex h-10 w-10 items-center justify-center rounded-full bg-accent/20 text-lg">🔒</span>
        <p className="font-semibold">{title}</p>
        <p className="max-w-sm text-xs text-muted">{teaser}</p>
        <Link href={`/app/billing?plan=${plan.toLowerCase()}`} className={`${btnCls} mt-1`}>Unlock with {plan}</Link>
      </div>
    </div>
  );
}
