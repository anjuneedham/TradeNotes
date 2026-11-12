import Link from "next/link";
import { Logo } from "@/components/Logo";
import { btnCls, btnGhostCls } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-16">
      <Logo />
      <h1 className="mt-8 text-2xl font-semibold tracking-tight">We couldn&apos;t find that page</h1>
      <p className="mt-2 text-sm text-muted">The link may be out of date, or the trade may have been deleted.</p>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/app/journal" className={btnCls}>Go to journal</Link>
        <Link href="/" className={btnGhostCls}>Home</Link>
      </div>
    </div>
  );
}
