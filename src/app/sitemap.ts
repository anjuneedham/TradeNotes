import type { MetadataRoute } from "next";
import { PUBLIC_PATHS, SITE_URL } from "../lib/seo";

const PRIORITY: Record<string, number> = { "/": 1, "/pricing": 0.9, "/demo": 0.8, "/demo/analytics": 0.6, "/learn": 0.7, "/learn/r-multiple-prop-firm-challenge": 0.8, "/learn/trading-expectancy-formula": 0.8, "/free": 0.8, "/free/review-checklist": 0.6, "/partners": 0.5, "/prop-firm-traders": 0.9, "/features": 0.7, "/import": 0.7, "/how-it-works": 0.6 };
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PUBLIC_PATHS.map((p) => ({ url: p === "/" ? SITE_URL : `${SITE_URL}${p}`, lastModified, changeFrequency: p.startsWith("/legal") ? "yearly" : "monthly", priority: PRIORITY[p] ?? 0.3 }));
}
