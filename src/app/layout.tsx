import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import { SITE_URL, SITE_NAME } from "@/lib/seo";
import "./globals.css";
import { themeInitScript } from "@/components/stickman/ThemeToggle";

const plexSans = localFont({ src: "./fonts/ibm-plex-sans-latin-wght-normal.woff2", weight: "100 700", variable: "--font-plex-sans", display: "swap" });
const plexMono = localFont({
  src: [{ path: "./fonts/ibm-plex-mono-latin-400-normal.woff2", weight: "400" }, { path: "./fonts/ibm-plex-mono-latin-500-normal.woff2", weight: "500" }],
  variable: "--font-plex-mono", display: "swap",
});
// Hand-lettering for the reversible stickman theme (Caveat, OFL; see fonts/CAVEAT-OFL-LICENSE.txt).
const hand = localFont({ src: "./fonts/caveat-latin-wght-normal.woff2", weight: "400 700", variable: "--font-hand", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "TradeNotes — Trading Journal & Performance Analytics",
  description: "A trading journal that shows where your results come from: log trades, tag mistakes, and track win rate, expectancy and drawdown. Free plan, no card.",
  applicationName: SITE_NAME,
  icons: { apple: "/icons/apple-touch-icon.png" },
  openGraph: { type: "website", siteName: SITE_NAME, locale: "en_US", images: [{ url: "/og", width: 1200, height: 630, alt: "TradeNotes: trading journal and performance analytics" }] },
  twitter: { card: "summary_large_image", images: ["/og"] },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: [{ media: "(prefers-color-scheme: dark)", color: "#0d0f11" }, { media: "(prefers-color-scheme: light)", color: "#f6f5f1" }] };

/** Root layout holds only fonts and tokens. Chrome lives in the (marketing), (auth) and app layouts. */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable} ${hand.variable}`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeInitScript }} /></head>
      <body className="min-h-screen antialiased">
        {/* Shared pencil-wobble filter used by every doodle (stickman theme). */}
        <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute" }}>
          <filter id="sm-wobble"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="4" result="n" /><feDisplacementMap in="SourceGraphic" in2="n" scale="3" /></filter>
        </svg>
        {children}<Analytics />
      </body>
    </html>
  );
}
