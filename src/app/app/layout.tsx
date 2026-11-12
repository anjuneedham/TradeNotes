import { cookies } from "next/headers";
import { logout } from "../(auth)/actions";
import { AppNav } from "@/components/AppNav";

import type { Metadata } from "next";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Theme preference is a per-device cookie (set in Settings). No value = follow the device.
  const t = (await cookies()).get("tn_theme")?.value;
  const theme = t === "light" || t === "dark" ? t : undefined;
  const logoutForm = (
    <form action={logout}><button className="w-full rounded-md px-2.5 py-2 text-left text-sm text-muted hover:bg-raised/60 hover:text-fg">Log out</button></form>
  );
  return (
    <div data-theme={theme} className="bg-bg text-fg">
      <AppNav logout={logoutForm}>{children}</AppNav>
    </div>
  );
}
