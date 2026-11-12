import { Suspense } from "react";
import { cookies } from "next/headers";
import { logout } from "../(auth)/actions";
import { AppNav } from "@/components/AppNav";
import { AccountSwitcher } from "@/components/AccountSwitcher";
import { currentSession } from "@/lib/session";
import { withUser } from "@/lib/db";
import { ACCOUNT_COOKIE, resolveScope, type Account } from "@/lib/app-context";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Theme preference is a per-device cookie (set in Settings). No value = follow the device.
  const jar = await cookies();
  const t = jar.get("tn_theme")?.value;
  const theme = t === "light" || t === "dark" ? t : undefined;
  const logoutForm = (
    <form action={logout}><button className="w-full rounded-md px-2.5 py-2 text-left text-sm text-muted hover:bg-raised/60 hover:text-fg">Log out</button></form>
  );
  // Account switcher (only shown with 2+ accounts). Failures here must never break the page.
  let switcher: React.ReactNode = null;
  try {
    const session = await currentSession();
    if (session) {
      const accounts = await withUser(session.user.id, (q) => q<Account>("select id, name, currency, starting_balance, broker from tradenotes.accounts order by created_at"));
      const scope = resolveScope(accounts, jar.get(ACCOUNT_COOKIE)?.value);
      switcher = <Suspense fallback={null}><AccountSwitcher accounts={accounts} selected={scope.id} /></Suspense>;
    }
  } catch (e) { console.error("account switcher load failed", e instanceof Error ? e.message : e); }
  return (
    <div data-theme={theme} className="bg-bg text-fg">
      <AppNav logout={logoutForm} switcher={switcher}>{children}</AppNav>
    </div>
  );
}
