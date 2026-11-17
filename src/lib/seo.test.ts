import { describe, it, expect } from "vitest";
import { PUBLIC_PATHS, DISALLOWED_PATHS, pageMeta, jsonLd, SITE_URL } from "./seo";
import sitemap from "../app/sitemap";
import robots from "../app/robots";

describe("seo", () => {
  it("sitemap lists exactly the public pages with absolute URLs and never private ones", () => {
    const urls = sitemap().map((e) => e.url);
    expect(urls).toHaveLength(PUBLIC_PATHS.length);
    expect(urls).toContain(SITE_URL);
    expect(urls).toContain(`${SITE_URL}/pricing`);
    for (const u of urls) { expect(u.startsWith("https://") || u.startsWith("http://")).toBe(true); for (const d of DISALLOWED_PATHS) expect(u.includes(d)).toBe(false); }
  });
  it("the demo pages are in the sitemap; sample trades, share links and the app are not", () => {
    const urls = sitemap().map((e) => e.url);
    expect(urls).toContain(`${SITE_URL}/demo`);
    expect(urls).toContain(`${SITE_URL}/demo/analytics`);
    for (const u of urls) { expect(u).not.toMatch(/\/demo\/trades|\/r\//); }
  });
  it("robots blocks the app, api and partner stats and points to the sitemap", () => {
    const r = robots();
    const rule = Array.isArray(r.rules) ? r.rules[0] : r.rules;
    expect(rule.disallow).toEqual(expect.arrayContaining(["/app", "/api", "/partners/stats"]));
    expect(r.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  });
  it("pageMeta sets canonical, Open Graph and Twitter, and noindex only when asked", () => {
    const m = pageMeta({ title: "T", description: "D", path: "/pricing" });
    expect(m.alternates?.canonical).toBe("/pricing");
    expect((m.openGraph as { url?: string }).url).toBe(`${SITE_URL}/pricing`);
    expect(m.robots).toBeUndefined();
    expect(pageMeta({ title: "T", description: "D", path: "/x", index: false }).robots).toEqual({ index: false, follow: true });
  });
  it("jsonLd cannot close the script tag", () => {
    expect(jsonLd({ a: "</script><b>" })).not.toContain("</script>");
  });
  it("every public page has a description between 70 and 170 characters", async () => {
    const files = ["pricing", "learn", "partners", "demo"];
    for (const f of files) {
      const src = (await import("node:fs")).readFileSync(`src/app/(marketing)/${f}/page.tsx`, "utf8");
      expect(src).toMatch(/pageMeta\(/);
    }
  });
});
