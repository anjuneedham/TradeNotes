import type { MetadataRoute } from "next";

/**
 * Web app manifest: lets a phone add TradeNotes to the home screen with the quick-log page as the entry point.
 * No service worker: the app needs the network, and this manifest only makes it installable as a full-screen shortcut.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TradeNotes",
    short_name: "TradeNotes",
    description: "Trading journal and performance analytics. Log a trade in seconds.",
    start_url: "/app/quick",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0d0f11",
    theme_color: "#0d0f11",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
