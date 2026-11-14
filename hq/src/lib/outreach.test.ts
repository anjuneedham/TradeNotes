import { describe, expect, it } from "vitest";
import { advanceStage, buildLink, checkSend, followUpDueAt, followUpIsDue, funnel, mergeTemplate, parseProspectLines, type Touch } from "./outreach";

const p = { platform: "tiktok", stage: "found" as const, do_not_contact: false };
const dm = (at: string, body = "Hey Sam — saw your post about revenge trading"): Touch => ({ kind: "dm", body, at });
const now = new Date("2026-11-14T12:00:00Z");

describe("links and templates", () => {
  it("builds tagged links, rejects bad tags", () => {
    expect(buildLink("https://tradenotes.dev/", "tt-dm")).toBe("https://tradenotes.dev/?src=tt-dm");
    expect(buildLink("https://tradenotes.dev", "Bad Tag")).toBeNull();
    expect(buildLink("https://tradenotes.dev", "a".repeat(25))).toBeNull();
  });
  it("merges placeholders and reports unfilled ones", () => {
    const r = mergeTemplate("Hey {name} — saw your post about {specific thing}. {SITE}", { name: "Sam", specific: null, site: "https://x.dev/" });
    expect(r.text).toBe("Hey Sam — saw your post about {specific thing}. https://x.dev");
    expect(r.missing).toEqual(["{specific thing}"]);
  });
});
describe("send rules", () => {
  it("allows a first DM, then blocks a second one", () => {
    expect(checkSend(p, [], "dm", "Hey Sam — saw your post about stops", now).ok).toBe(true);
    const r = checkSend(p, [dm("2026-11-14T08:00:00Z")], "dm", "Something different about you", now);
    expect(r.ok).toBe(false);
  });
  it("blocks empty, do-not-contact, lost", () => {
    expect(checkSend(p, [], "dm", "  ", now).ok).toBe(false);
    expect(checkSend({ ...p, do_not_contact: true }, [], "dm", "hi you", now).ok).toBe(false);
    expect(checkSend({ ...p, stage: "lost" }, [], "dm", "hi you", now).ok).toBe(false);
  });
  it("never allows the same text twice (case/space-insensitive)", () => {
    const t = [dm("2026-11-10T08:00:00Z", "Just bumping this")];
    const r = checkSend(p, t, "followup", "  just   bumping THIS ", now);
    expect(r.ok).toBe(false); if (!r.ok) expect(r.reason).toMatch(/same message|exact message/);
  });
  it("follow-up: only after day 3, only once, never after a reply, never without a DM", () => {
    expect(checkSend(p, [dm("2026-11-13T12:00:00Z")], "followup", "Bump", now).ok).toBe(false);
    expect(checkSend(p, [dm("2026-11-13T12:00:00Z")], "followup", "Bump", now, true).ok).toBe(true);
    expect(checkSend(p, [dm("2026-11-10T12:00:00Z")], "followup", "Bump", now).ok).toBe(true);
    expect(checkSend(p, [dm("2026-11-10T12:00:00Z"), { kind: "followup", body: "x", at: "2026-11-13T12:00:00Z" }], "followup", "Again", now).ok).toBe(false);
    expect(checkSend(p, [dm("2026-11-10T12:00:00Z"), { kind: "reply", body: null, at: "2026-11-11T12:00:00Z" }], "followup", "Bump", now).ok).toBe(false);
    expect(checkSend(p, [], "followup", "Bump", now).ok).toBe(false);
  });
  it("warns about links in a first Instagram DM", () => {
    const r = checkSend({ ...p, platform: "instagram" }, [], "dm", "Hey you — try https://tradenotes.dev/?src=ig-dm", now);
    expect(r.ok && r.warnings.some((w) => /Instagram/.test(w))).toBe(true);
  });
  it("computes when the follow-up is due", () => {
    expect(followUpDueAt([dm("2026-11-10T12:00:00Z")])?.toISOString()).toBe("2026-11-13T12:00:00.000Z");
    expect(followUpIsDue([dm("2026-11-10T12:00:00Z")], now)).toBe(true);
    expect(followUpDueAt([])).toBeNull();
  });
});
describe("stages and funnel", () => {
  it("only moves forward automatically and never reopens lost", () => {
    expect(advanceStage("found", "dm_sent")).toBe("dm_sent");
    expect(advanceStage("replied", "dm_sent")).toBe("replied");
    expect(advanceStage("lost", "replied")).toBe("lost");
  });
  it("funnel counts reach and rates", () => {
    const f = funnel([
      { stage: "found", hasDm: false, hasReply: false }, { stage: "dm_sent", hasDm: true, hasReply: false },
      { stage: "lost", hasDm: true, hasReply: true }, { stage: "paying", hasDm: true, hasReply: true },
    ]);
    expect(f.map((s) => s.n)).toEqual([4, 3, 2, 1, 1, 1, 1]);
    expect(f[1].rate).toBeCloseTo(0.75); expect(f[0].rate).toBeNull();
  });
  it("parses pasted prospect lines", () => {
    expect(parseProspectLines("@sam_fx | lost 3 in a row\n\nlena.t - needs a journal\nbare")).toEqual([
      { handle: "sam_fx", source: "lost 3 in a row" }, { handle: "lena.t", source: "needs a journal" }, { handle: "bare", source: null }]);
  });
});
