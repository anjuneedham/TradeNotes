"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { useId, useRef } from "react";
import { selectAccount } from "@/app/app/accounts/actions";

/** App-shell account switcher. Submits on change; without JS the "Go" button submits. The server only accepts the user's own ids. */
export function AccountSwitcher({ accounts, selected }: { accounts: { id: string; name: string; currency: string }[]; selected: string }) {
  const form = useRef<HTMLFormElement>(null);
  const id = useId();
  const path = usePathname();
  const qs = useSearchParams().toString();
  if (accounts.length < 2) return null;
  return (
    <form ref={form} action={selectAccount} className="flex items-center gap-1.5">
      <input type="hidden" name="back" value={qs ? `${path}?${qs}` : path} />
      <label className="sr-only" htmlFor={id}>Account shown</label>
      <select id={id} name="account" defaultValue={selected} onChange={() => form.current?.requestSubmit()}
        className="min-h-9 w-full max-w-[12rem] truncate rounded-md border border-border bg-bg px-2 text-sm text-fg">
        <option value="all">All accounts</option>
        {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}
      </select>
      <noscript><button className="rounded border border-border px-2 py-1 text-xs">Go</button></noscript>
    </form>
  );
}
