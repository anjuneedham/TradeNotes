import type { ReactNode } from "react";
import Link from "next/link";

export const inputCls = "w-full rounded-md border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent";
export const btnCls = "rounded-md bg-accent px-4 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50 cursor-pointer";
export const btnGhostCls = "rounded-md border border-border px-3 py-2 text-sm hover:bg-panel cursor-pointer";
export const btnSmCls = "rounded-md border border-border px-2.5 py-1 text-xs hover:bg-bg cursor-pointer";
export const dangerCls = "rounded-md border border-loss/60 px-3 py-2 text-sm text-loss hover:bg-loss/10 cursor-pointer";

export function Field({ label, hint, children, className = "" }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="mb-1 block text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}
export function Card({ children, className = "", title, action }: { children: ReactNode; className?: string; title?: string; action?: ReactNode }) {
  return (
    <section className={`rounded-lg border border-border bg-panel p-4 ${className}`}>
      {(title || action) && <div className="mb-3 flex items-center justify-between gap-2"><h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>{action}</div>}
      {children}
    </section>
  );
}
export function Notice({ kind = "info", children }: { kind?: "info" | "error" | "ok" | "warn"; children: ReactNode }) {
  const c = { error: "border-loss/50 bg-loss/10", ok: "border-win/50 bg-win/10", warn: "border-warn/50 bg-warn/10", info: "border-accent/40 bg-accent/10" }[kind];
  return <div className={`rounded-md border p-3 text-sm ${c}`} role={kind === "error" ? "alert" : undefined}>{children}</div>;
}
export function Flash({ sp }: { sp: { ok?: string; err?: string } }) {
  return <>{sp.ok && <Notice kind="ok">{sp.ok}</Notice>}{sp.err && <Notice kind="error">{sp.err}</Notice>}</>;
}
export function PageHeader({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-2xl font-semibold">{title}</h1>{sub && <p className="mt-1 max-w-2xl text-sm text-muted">{sub}</p>}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
export function Stat({ label, value, sub, tone, href }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "good" | "bad" | "warn"; href?: string }) {
  const color = tone === "good" ? "text-win" : tone === "bad" ? "text-loss" : tone === "warn" ? "text-warn" : "";
  const inner = (<div className="rounded-lg border border-border bg-panel p-4 hover:border-accent/50"><p className="text-xs uppercase tracking-wide text-muted">{label}</p><p className={`mt-1 text-2xl font-semibold ${color}`}>{value}</p>{sub && <p className="mt-1 text-xs text-muted">{sub}</p>}</div>);
  return href ? <Link href={href}>{inner}</Link> : inner;
}
export function Badge({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "good" | "bad" | "warn" | "accent" }) {
  const c = { muted: "border-border text-muted", good: "border-win/50 text-win", bad: "border-loss/50 text-loss", warn: "border-warn/50 text-warn", accent: "border-accent/60 text-accent" }[tone];
  return <span className={`inline-block rounded-full border px-2 py-0.5 text-xs ${c}`}>{children}</span>;
}
export function Progress({ value, max }: { value: number; max: number }) {
  const w = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return <div className="h-2 w-full rounded bg-bg"><div className={`h-2 rounded ${value >= max ? "bg-win" : "bg-accent"}`} style={{ width: `${w}%` }} /></div>;
}
export const th = "px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted";
export const td = "px-3 py-2 align-top text-sm";
export function Table({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto rounded-lg border border-border"><table className="w-full min-w-[640px] divide-y divide-border">{children}</table></div>;
}
export const fmtDate = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : "—");
export const fmtDateTime = (iso: string | null | undefined, tz = "America/Jamaica") => (iso ? new Date(iso).toLocaleString("en-GB", { timeZone: tz, day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");
export const money = (n: number) => `$${n.toFixed(2)}`;
