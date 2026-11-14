import type { MetadataRoute } from "next";
import { PUBLIC_PATHS, SITE_URL } from "../lib/seo";

const PRIORITY: Record<string, number> = { "/": 1, "/pricing": 0.9, "/demo": 0.8, "/demo/analytics": 0.6, "/learn": 0.7, "/partners": 0.5 };
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PUBLIC_PATHS.map((p) => ({ url: p === "/" ? SITE_URL : `${SITE_URL}${p}`, lastModified, changeFrequency: p.startsWith("/legal") ? "yearly" : "monthly", priority: PRIORITY[p] ?? 0.3 }));
}
