import { describe, expect, it } from "vitest";
import { NOTES } from "../content/notes";
import { buildDailyEmail, dayKey, noteBySlug, noteForDay, publishedNotes } from "./newsletter";

const at = (iso: string) => new Date(iso);

describe("daily notes schedule", () => {
  it("uses Jamaica time for 'today' (UTC-5)", () => {
    expect(dayKey(at("2026-11-17T04:59:00Z"))).toBe("2026-11-16");
    expect(dayKey(at("2026-11-17T05:00:00Z"))).toBe("2026-11-17");
  });
  it("never shows a future-dated note", () => {
    const shown = publishedNotes(at("2026-11-17T12:00:00Z"));
    expect(shown.every((n) => n.date <= "2026-11-17")).toBe(true);
    expect(noteBySlug("the-checklist-that-was-too-long", at("2026-11-17T12:00:00Z"))).toBeUndefined();
    expect(noteBySlug("the-checklist-that-was-too-long", at("2026-11-18T12:00:00Z"))).toBeDefined();
  });
  it("lists newest first and has at most one note per day", () => {
    const shown = publishedNotes(at("2026-12-31T12:00:00Z"));
    expect(shown.map((n) => n.date)).toEqual([...shown.map((n) => n.date)].sort().reverse());
    expect(new Set(NOTES.map((n) => n.date)).size).toBe(NOTES.length);
    expect(new Set(NOTES.map((n) => n.slug)).size).toBe(NOTES.length);
  });
  it("finds the note for a given day", () => expect(noteForDay("2026-11-17")?.slug).toBe("how-many-trades-before-you-can-trust-a-strategy"));
});

describe("content safety", () => {
  const banned = [/guaranteed/i, /risk[- ]free/i, /get rich/i, /can'?t lose/i, /\bsignals?\b/i, /\bI (made|earned) \$?\d/i];
  it("contains no profit-promise language and every note acknowledges risk or is labelled made up", () => {
    for (const n of NOTES) {
      const t = [n.title, n.summary, ...n.body].join(" ");
      // "guaranteed"/"promise" may appear only in a negation; none of the banned patterns may appear at all
      for (const re of banned) expect(t, `${n.slug} ${re}`).not.toMatch(re);
      expect(/made[- ]up|invented|risk of loss|losing money|can be lost|not financial advice/i.test(t), n.slug).toBe(true);
    }
  });
  it("labels every story as made up", () => {
    for (const n of NOTES.filter((x) => x.kind === "story")) expect(n.body[0]).toMatch(/made-up story/i);
  });
});

describe("daily email", () => {
  it("always carries the unsubscribe link, disclaimer, online link and James's sign-off", () => {
    const m = buildDailyEmail(NOTES[0], "https://x.test/u?token=1", "https://x.test");
    expect(m.text).toContain("https://x.test/u?token=1");
    expect(m.text).toContain("Not financial advice");
    expect(m.text).toContain(`https://x.test/notes/${NOTES[0].slug}`);
    expect(m.text).toContain("— James");
    expect(m.subject).toContain(NOTES[0].title);
  });
});
