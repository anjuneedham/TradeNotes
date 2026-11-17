import { describe, expect, it } from "vitest";
import { NOTES } from "../content/notes";
import { socialPosts } from "./social";

describe("social posts", () => {
  it("every note yields posts within platform limits, with link and not-advice line", () => {
    for (const n of NOTES) for (const p of socialPosts(n, "https://x.test")) {
      expect(p.text.length, `${n.slug} ${p.platform}`).toBeLessThanOrEqual(p.limit);
      expect(p.text).toMatch(/Not financial advice/i);
      if (p.platform !== "tiktok") expect(p.text).toContain(`x.test`);
    }
  });
  it("labels stories as made up", () => {
    const s = NOTES.find((n) => n.kind === "story")!;
    for (const p of socialPosts(s, "https://x.test")) expect(p.text).toMatch(/made up/i);
  });
});
