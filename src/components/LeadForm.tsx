"use client";
import { useActionState } from "react";
import Link from "next/link";
import { requestDownload, type LeadState } from "@/app/(marketing)/free/actions";
import { btnCls, inputCls, linkCls } from "@/components/ui";

/** Email capture for a free download. Shows the download links once the email is saved. */
export default function LeadForm({ magnet = "journal-template", title = "Free: trading journal template + 30-trade review checklist", blurb = "A ready-to-use spreadsheet (R-multiple column included) and the checklist we use to review every 30 trades. Free, no account needed." }: { magnet?: string; title?: string; blurb?: string }) {
  const [state, action, pending] = useActionState<LeadState, FormData>(requestDownload, {});
  return (
    <div className="rounded-xl border border-border bg-panel p-5 sm:p-6">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-muted">{blurb}</p>
      {state.ok ? (
        <div className="mt-4 space-y-2 text-sm" role="status">
          <p className="font-medium">Thanks, it&apos;s yours:</p>
          <p><a href={state.file} download className={linkCls}>Download the journal template (CSV, opens in Excel or Google Sheets)</a></p>
          <p><Link href={state.page ?? "/free/review-checklist"} className={linkCls}>Open the 30-trade review checklist</Link></p>
          <p className="text-muted">Prefer it done for you? <Link href="/signup?src=lead-form" className={linkCls}>TradeNotes calculates all of this automatically</Link>, free for 50 trades.</p>
        </div>
      ) : (
        <form action={action} className="mt-4 space-y-3">
          <input type="hidden" name="magnet" value={magnet} />
          <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="sr-only" htmlFor={`lead-email-${magnet}`}>Email</label>
            <input id={`lead-email-${magnet}`} name="email" type="email" required autoComplete="email" placeholder="you@example.com" className={`${inputCls} sm:flex-1`} />
            <button type="submit" disabled={pending} className={btnCls}>{pending ? "Sending…" : "Get the free download"}</button>
          </div>
          <label className="flex items-start gap-2 text-xs text-muted">
            <input type="checkbox" name="consent" required className="mt-0.5" />
            <span>Email me the download and occasional trading-journal tips (about one a week). Unsubscribe any time. See our <Link href="/legal/privacy" className={linkCls}>privacy policy</Link>.</span>
          </label>
          {state.error && <p className="text-sm text-loss" role="alert">{state.error}</p>}
        </form>
      )}
    </div>
  );
}
