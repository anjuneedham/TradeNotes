"use client";
import Link from "next/link";
import { btnCls, btnGhostCls } from "@/components/ui";

/** Shown inside the app shell when a page fails to load. Never shows technical details. */
export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md py-10" role="alert">
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted">We couldn&apos;t load this page. Your data is safe — nothing was changed. Try again, and if it keeps happening, come back in a few minutes.</p>
      <div className="mt-6 flex flex-wrap gap-2">
        <button onClick={reset} className={btnCls}>Try again</button>
        <Link href="/app" className={btnGhostCls}>Dashboard</Link>
      </div>
    </div>
  );
}
