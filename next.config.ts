import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

// Baseline security headers. (A strict Content-Security-Policy needs nonce plumbing for Next's inline scripts; tracked in KNOWN_ISSUES.)
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // CSV import posts the file text through a server action (5 MB cap enforced in the action); default limit is 1 MB.
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Public share-link reports: never indexed, never cached by a browser or CDN, and the address (which holds the token) is never sent to another site.
      { source: "/r/:path*", headers: [
        { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        { key: "Cache-Control", value: "private, no-store, max-age=0" },
        { key: "Referrer-Policy", value: "no-referrer" },
      ] },
    ];
  },
};

// Source maps are uploaded only when SENTRY_AUTH_TOKEN (+ SENTRY_ORG / SENTRY_PROJECT) are set; otherwise this changes nothing.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG, project: process.env.SENTRY_PROJECT, authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true, telemetry: false,
});
