import Link from "next/link";
import { logout } from "../(auth)/actions";

const links = [["Dashboard", "/app"], ["Journal", "/app/journal"], ["Billing", "/app/billing"], ["Learn", "/learn"]] as const;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="border-b border-border bg-panel">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2 text-sm">
          {links.map(([l, h]) => <Link key={h} href={h} className="py-1 text-muted hover:text-fg">{l}</Link>)}
          <Link href="/app/journal/new" className="rounded-md bg-accent px-3 py-1 font-medium text-white">+ Log trade</Link>
          <form action={logout} className="ml-auto"><button className="py-1 text-muted hover:text-fg">Log out</button></form>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
    </div>
  );
}
