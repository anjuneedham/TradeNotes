import type { Metadata } from "next";

/** Edge-safe, dependency-free SEO helpers (no database imports). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://tradenotes.dev").replace(/\/$/, "");
export const SITE_NAME = "TradeNotes";
export const SITE_TAGLINE = "Trading journal & performance analytics";

/** Public, indexable pages. The sitemap and tests read this list; anything not here is not advertised to search engines. */
export const PUBLIC_PATHS = ["/", "/pricing", "/demo", "/demo/analytics", "/learn", "/partners", "/legal/terms", "/legal/privacy", "/legal/disclaimer", "/legal/subscription"] as const;
/**
 * Not listed on purpose: /demo/trades/* (single sample trades are thin pages, set to noindex) and /r/<token> (private share links: noindex, nofollow,
 * noarchive, 404 once revoked or expired; not in robots.txt, so a crawler that finds one can read its noindex instead of guessing).
 * Paths crawlers must not fetch. */
export const DISALLOWED_PATHS = ["/app", "/api", "/partners/stats", "/login", "/signup", "/forgot-password", "/reset-password", "/check-email"] as const;

/** Page metadata with a canonical URL, Open Graph and Twitter tags. `index: false` for pages that must stay out of search. */
export function pageMeta(o: { title: string; description: string; path: string; index?: boolean }): Metadata {
  const url = o.path === "/" ? SITE_URL : `${SITE_URL}${o.path}`;
  const image = `${SITE_URL}/og`;
  return {
    title: o.title,
    description: o.description,
    alternates: { canonical: o.path },
    robots: o.index === false ? { index: false, follow: true } : undefined,
    openGraph: { type: "website", siteName: SITE_NAME, title: o.title, description: o.description, url, locale: "en_US", images: [{ url: image, width: 1200, height: 630, alt: `${SITE_NAME}: ${SITE_TAGLINE}` }] },
    twitter: { card: "summary_large_image", title: o.title, description: o.description, images: [image] },
  };
}

/** Serialise JSON-LD safely for a <script> tag (escapes "<" so content can never close the tag). */
export const jsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");
