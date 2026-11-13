"use client";
import { useActionState, useState } from "react";
import { createShareLink, revokeShareLink, type ShareState } from "@/app/app/settings/actions";
import { SHARE_SCOPES, EXPIRY_DAYS, DEFAULT_EXPIRY_DAYS, MAX_ACTIVE_LINKS, scopeLabel, type LinkStatus } from "@/lib/share";
import { Notice, Badge, btnCls, btnGhostCls, inputCls } from "./ui";

export interface LinkRow { id: string; label: string | null; scope: string; expires_at: string; revoked_at: string | null; created_at: string; status: LinkStatus }
const day = (iso: string) => iso.slice(0, 10);

/** Settings > Sharing: create and revoke read-only report links. The new link is shown once; afterwards only its label and dates exist. */
export function ShareLinksPanel({ links, currency, otherCurrencies }: { links: LinkRow[]; currency: string; otherCurrencies: boolean }) {
  const [state, action, pending] = useActionState<ShareState, FormData>(createShareLink, {});
  const [copied, setCopied] = useState(false);
  const url = state.path && typeof window !== "undefined" ? `${window.location.origin}${state.path}` : state.path;
  const active = links.filter((l) => l.status === "active").length;
  return (
    <div className="space-y-4 text-sm">
      <p className="text-muted">A share link opens a read-only page with your <strong className="font-medium text-fg">totals and equity curve only</strong>: number of trades, win rate, profit and loss, profit factor, expectancy, average R, drawdown. It never shows notes, instruments, strategy or account names, your email, screenshots or the dates of individual trades. Anyone who has the link can open it until it expires or you revoke it. Amounts are shown in {currency}{otherCurrencies ? <>, and <strong className="font-medium text-fg">your accounts in other currencies are not included</strong> (they are not converted)</> : null}.</p>

      {state.error && <Notice kind="error">{state.error}</Notice>}
      {url && (
        <Notice kind="ok">
          <p className="font-medium">Your link{state.label ? ` “${state.label}”` : ""} is ready. Copy it now: for your security we cannot show it again.</p>
          <p className="mt-2 break-all"><code data-testid="new-share-url" className="text-fg">{url}</code></p>
          <button type="button" className={`${btnGhostCls} mt-3`} onClick={() => { navigator.clipboard?.writeText(url).then(() => setCopied(true)).catch(() => setCopied(false)); }}>{copied ? "Copied" : "Copy link"}</button>
        </Notice>
      )}

      <form action={action} className="grid gap-3 sm:grid-cols-2" aria-label="Create a share link">
        <label className="block"><span className="mb-1 block text-xs text-muted">Label (only you see it)</span><input name="label" maxLength={60} placeholder="e.g. For my mentor" className={inputCls} /></label>
        <label className="block"><span className="mb-1 block text-xs text-muted">Results to include</span>
          <select name="scope" defaultValue="all" className={inputCls}>{SHARE_SCOPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></label>
        <label className="block"><span className="mb-1 block text-xs text-muted">Link expires after</span>
          <select name="expires_in" defaultValue={String(DEFAULT_EXPIRY_DAYS)} className={inputCls}>{EXPIRY_DAYS.map((d) => <option key={d} value={d}>{d} days</option>)}</select></label>
        <div className="flex items-end"><button disabled={pending || active >= MAX_ACTIVE_LINKS} className={btnCls}>{pending ? "Creating…" : "Create share link"}</button></div>
      </form>
      {active >= MAX_ACTIVE_LINKS && <p className="text-xs text-muted">You have {MAX_ACTIVE_LINKS} active links, the most allowed. Revoke one to create another.</p>}

      {links.length > 0 && (
        <ul className="divide-y divide-border rounded-md border border-border" aria-label="Your share links">
          {links.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3.5 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{l.label ?? "Untitled link"} <Badge tone={l.status === "active" ? "win" : "neutral"}>{l.status}</Badge></p>
                <p className="text-xs text-muted">{scopeLabel(l.scope)} · created {day(l.created_at)} · {l.status === "revoked" ? `revoked ${day(l.revoked_at!)}` : l.status === "expired" ? `expired ${day(l.expires_at)}` : `expires ${day(l.expires_at)}`}</p>
              </div>
              {l.status === "active" && <form action={revokeShareLink}><input type="hidden" name="id" value={l.id} /><button className={btnGhostCls} aria-label={`Revoke link ${l.label ?? ""}`.trim()}>Revoke</button></form>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
