import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "TradeNotes HQ", description: "Internal operations for TradeNotes", robots: { index: false, follow: false } };
export default function Root({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className="min-h-screen antialiased">{children}</body></html>;
}
