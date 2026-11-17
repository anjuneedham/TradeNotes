import { Logo } from "@/components/Logo";
import { SiteFooter } from "@/components/SiteFooter";
import { ThemeToggle } from "@/components/stickman/ThemeToggle";

import type { Metadata } from "next";

export const metadata: Metadata = { robots: { index: false, follow: true } };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4"><Logo /><ThemeToggle /></header>
      <main className="mx-auto w-full max-w-sm flex-1 px-4 py-8 sm:py-14">
        <div className="rounded-lg border border-border bg-panel p-5 sm:p-6">{children}</div>
      </main>
      <SiteFooter compact />
    </div>
  );
}
