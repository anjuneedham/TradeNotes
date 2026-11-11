import type { ReactNode } from "react";
import Link from "next/link";

/* Shared primitives. Every page composes these; do not restyle per page. See docs/design/TRADENOTES_DESIGN_SYSTEM.md. */

export const inputCls =
  "w-full min-h-11 rounded-md border border-field bg-bg px-3 py-2 text-base sm:min-h-10 sm:text-sm text-fg placeholder:text-muted outline-none transition-colors hover:border-muted focus:border-accent aria-[invalid=true]:border-loss";
const btnBase = "inline-flex min-h-11 sm:min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";
/** Primary action: one per view. */
export const btnCls = `${btnBase} bg-fg text-bg hover:opacity-90`;
/** Secondary action. */
export const btnGhostCls = `${btnBase} border border-border text-fg hover:border-border-strong hover:bg-raised`;
/** Destructive action (always behind a confirmation step). */
export const btnDangerCls = `${btnBase} border border-loss/60 text-loss hover:bg-loss/10`;
export const linkCls = "text-accent underline-offset-4 hover:underline";

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-fg">{label}</span>
      {children}
      {error && <span role="alert" className="mt-1.5 block text-xs text-loss">{error}</span>}
      {hint && !error && <span className="mt-1.5 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Card({ children, className = "", id }: { children: ReactNode; className?: string; id?: string }) {
  return <div id={id} className={`rounded-lg border border-border bg-panel p-4 sm:p-5 ${className}`}>{children}</div>;
}

/** Inline message. `info` = neutral context, `warn` = needs attention, `error` = something failed, `ok` = confirmation. */
export function Notice({ kind = "info", children }: { kind?: "info" | "warn" | "error" | "ok"; children: ReactNode }) {
  const c = { info: "border-border bg-raised", warn: "border-warn/50 bg-warn/10", error: "border-loss/50 bg-loss/10", ok: "border-win/50 bg-win/10" }[kind];
  return <div className={`rounded-md border px-3.5 py-3 text-sm leading-relaxed ${c}`} role={kind === "error" ? "alert" : kind === "ok" ? "status" : undefined}>{children}</div>;
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "accent" | "win" | "loss" | "warn"; children: ReactNode }) {
  const c = { neutral: "border-border text-muted", accent: "border-accent/50 text-accent", win: "border-win/50 text-win", loss: "border-loss/50 text-loss", warn: "border-warn/50 text-warn" }[tone];
  return <span className={`inline-flex items-center whitespace-nowrap rounded border px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide ${c}`}>{children}</span>;
}

export function PageHeader({ title, sub, children }: { title: string; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border-strong px-5 py-10 text-center">
      <p className="font-medium">{title}</p>
      {children && <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Small uppercase label used above groups of content. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">{children}</p>;
}

/** Link-based segmented control (server-rendered; the selected option is the current URL state). */
export function Segmented({ label, options, value }: { label: string; options: { value: string; label: string; href: string }[]; value: string }) {
  return (
    <nav aria-label={label} className="inline-flex max-w-full overflow-x-auto rounded-md border border-border bg-panel p-0.5 text-sm">
      {options.map((o) => (
        <Link key={o.value} href={o.href} aria-current={o.value === value ? "true" : undefined} scroll={false}
          className={`whitespace-nowrap rounded px-3 py-1.5 ${o.value === value ? "bg-raised font-medium text-fg" : "text-muted hover:text-fg"}`}>{o.label}</Link>
      ))}
    </nav>
  );
}

/** Usage meter, e.g. trades used against a plan limit. */
export function Meter({ value, max, label }: { value: number; max: number; label: string }) {
  const ratio = Math.min(1, max > 0 ? value / max : 0);
  const tone = ratio >= 1 ? "bg-loss" : ratio >= 0.8 ? "bg-warn" : "bg-accent";
  return (
    <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.min(value, max)} className="h-1.5 w-full overflow-hidden rounded-full bg-raised">
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(ratio * 100, value > 0 ? 2 : 0)}%` }} />
    </div>
  );
}
