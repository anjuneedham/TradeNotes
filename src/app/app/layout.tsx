import Link from "next/link";
import { logout } from "../(auth)/actions";
import NavLinks from "@/components/NavLinks";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
      <aside className="sticky top-6 hidden h-[calc(100vh-6rem)] w-52 shrink-0 flex-col md:flex">
        <Link href="/app/journal/new" className="mb-4 rounded-lg bg-gradient-to-r from-accent to-indigo-500 px-3 py-2 text-center text-sm font-medium text-white shadow-lg shadow-accent/25 transition hover:brightness-110">+ Log trade</Link>
        <NavLinks vertical />
        <form action={logout} className="mt-auto"><button className="px-3 py-2 text-sm text-muted hover:text-fg">Log out</button></form>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="mb-4 flex flex-wrap items-center gap-2 md:hidden">
          <NavLinks />
          <Link href="/app/journal/new" className="rounded-lg bg-accent px-3 py-1 text-sm font-medium text-white">+ Log</Link>
          <form action={logout}><button className="px-2 py-1 text-sm text-muted">Log out</button></form>
        </div>
        {children}
      </div>
    </div>
  );
}
