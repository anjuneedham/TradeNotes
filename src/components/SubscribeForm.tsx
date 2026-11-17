"use client";
import { useActionState } from "react";
import { subscribeAction, type SubscribeState } from "@/app/(marketing)/newsletter/actions";
import { btnCls, inputCls, Notice } from "./ui";

export function SubscribeForm({ source = "site", compact = false }: { source?: string; compact?: boolean }) {
  const [state, action, pending] = useActionState<SubscribeState, FormData>(subscribeAction, { result: null });
  if (state.result === "check_email") return <Notice kind="ok">Almost there. If that address can receive mail, James has sent a confirmation link. Tap it and the notes start tomorrow.</Notice>;
  if (state.result === "saved_no_email") return <Notice kind="ok">You&apos;re on James&apos;s list. Email sending isn&apos;t switched on yet, so you&apos;ll get a confirmation link when it is. Nothing is sent until you confirm.</Notice>;
  return (
    <form action={action} className={compact ? "flex flex-wrap gap-2" : "space-y-2"}>
      <input type="hidden" name="src" value={source} />
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      <div className="flex flex-wrap gap-2">
        <label className="sr-only" htmlFor={`sub-${source}`}>Email address</label>
        <input id={`sub-${source}`} name="email" type="email" required autoComplete="email" placeholder="you@example.com" className={`${inputCls} min-w-0 flex-1 sm:max-w-xs`} />
        <button disabled={pending} className={btnCls}>{pending ? "Sending…" : "Get James's daily note"}</button>
      </div>
      {state.result === "invalid" && <p role="alert" className="text-xs text-loss">That didn&apos;t work. Check the email address and try again.</p>}
      <p className="text-xs text-muted">One short article or story a day by email. We confirm your address first. Unsubscribe in one click. Educational only, never financial advice. See our <a href="/legal/privacy" className="underline">privacy policy</a>.</p>
    </form>
  );
}
