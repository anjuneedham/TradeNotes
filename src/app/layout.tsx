import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const plexSans = localFont({ src: "./fonts/ibm-plex-sans-latin-wght-normal.woff2", weight: "100 700", variable: "--font-plex-sans", display: "swap" });
const plexMono = localFont({
  src: [{ path: "./fonts/ibm-plex-mono-latin-400-normal.woff2", weight: "400" }, { path: "./fonts/ibm-plex-mono-latin-500-normal.woff2", weight: "500" }],
  variable: "--font-plex-mono", display: "swap",
});

export const metadata: Metadata = {
  title: "TradeNotes — Trading Journal & Performance Analytics",
  description: "Know your trades. Understand your patterns. Improve your process.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: [{ media: "(prefers-color-scheme: dark)", color: "#0d0f11" }, { media: "(prefers-color-scheme: light)", color: "#f6f5f1" }] };

/** Root layout holds only fonts and tokens. Chrome lives in the (marketing), (auth) and app layouts. */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable}`}>
      <body className="min-h-screen antialiased">{children}<Analytics /></body>
    </html>
  );
}
