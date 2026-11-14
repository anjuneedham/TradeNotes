import { describe, expect, it } from "vitest";
import { approvalBlockers, canMove, estimateSeconds, rollupFormats, scanClaims, splitCaptions, SEED_IDEAS, CHECKS, type Item } from "./content";
import { dueStep, canEmail, renderMail, DEFAULT_NURTURE, nameFor } from "./nurture";
import { reportText } from "./report";

const allChecks = Object.fromEntries(CHECKS.map((c) => [c.key, true]));
const good: Item = { format: "F1", hook: "A 70% win rate can still lose money", voiceover: "Here is the math behind a high win rate that still loses money.", tt_caption: null, yt_title: null, talking_points: null, cta: "Free journal — link in bio", checks: allChecks };

describe("claims scan", () => {
  it("flags banned promises but allows 'profit factor' and 'win rate'", () => {
    expect(scanClaims("Your profit factor is hiding this", "70% win rate")).toEqual({ hard: [], soft: [] });
    expect(scanClaims("This will make you profitable").hard.length).toBe(1);
    expect(scanClaims("guaranteed results, risk-free, get rich with passive income").hard.length).toBe(4);
    expect(scanClaims("I made $5,000 last month").soft.length).toBeGreaterThan(0);
  });
});
describe("approval gate", () => {
  it("is ready only with hook, VO, all checks and clean wording", () => {
    expect(approvalBlockers(good)).toEqual([]);
    expect(approvalBlockers({ ...good, hook: "" }).join()).toMatch(/hook/);
    expect(approvalBlockers({ ...good, checks: { no_profit_claims: true } }).join()).toMatch(/5 left/);
    expect(approvalBlockers({ ...good, voiceover: "This will make you profitable fast" }).join()).toMatch(/banned/);
    expect(approvalBlockers({ ...good, voiceover: "word ".repeat(200) }).join()).toMatch(/Cut it/);
  });
  it("moves one step forward at a time, back freely, approval gated, measured needs a post", () => {
    expect(canMove("idea", "approved", good).ok).toBe(false);
    expect(canMove("scripted", "approved", good).ok).toBe(true);
    expect(canMove("scripted", "approved", { ...good, checks: {} }).ok).toBe(false);
    expect(canMove("recorded", "scripted", good).ok).toBe(true);
    expect(canMove("posted", "measured", good, 0).ok).toBe(false);
    expect(canMove("posted", "measured", good, 1).ok).toBe(true);
  });
});
describe("captions", () => {
  it("wraps at 24 chars, 2 lines per card, flags long words", () => {
    const { cards, tooLong } = splitCaptions("A 70% win rate can still lose money here is the math behind it");
    for (const c of cards) { expect(c.length).toBeLessThanOrEqual(2); for (const l of c) expect(l.length).toBeLessThanOrEqual(24); }
    expect(cards.flat().join(" ")).toBe("A 70% win rate can still lose money here is the math behind it");
    expect(splitCaptions("Supercalifragilisticexpialidocious ok").tooLong).toHaveLength(1);
    expect(tooLong).toEqual([]);
  });
  it("estimates speaking time", () => expect(estimateSeconds("word ".repeat(80))).toBe(30));
});
describe("format rollup", () => {
  const mk = (format: string, n: number, r: number) => Array.from({ length: n }, () => ({ format, views: 1000, view_rate_3s: r, avg_watch_pct: 50, saves: 10, link_clicks: 5, signups: 1 }));
  it("judges only formats with 10+ posts, doubles down on top 2, flags clearly weak ones", () => {
    const rows = rollupFormats([...mk("F1", 10, 70), ...mk("F2", 10, 65), ...mk("F3", 10, 40), ...mk("F4", 5, 90)]);
    const v = Object.fromEntries(rows.map((r) => [r.format, r.verdict]));
    expect(v).toEqual({ F1: "double_down", F2: "double_down", F3: "review", F4: "too_early", F5: "too_early" });
  });
});
describe("idea bank", () => {
  it("has all 33 ideas, unique numbers, blocked ones annotated", () => {
    expect(SEED_IDEAS).toHaveLength(33);
    expect(new Set(SEED_IDEAS.map((i) => i.n)).size).toBe(33);
    expect(SEED_IDEAS.find((i) => i.n === 10)?.note).toMatch(/BLOCKED/);
  });
});
describe("nurture schedule", () => {
  const base = { createdAt: "2026-11-01T00:00:00Z", plan: "free", paying: false, verified: true, emailOk: false, optOut: false, sent: [] as string[] };
  const at = (d: number) => new Date(new Date(base.createdAt).getTime() + d * 86_400_000 + 3600_000);
  it("offers only the latest due step and lists older ones to skip", () => {
    expect(dueStep(base, at(0))?.step.key).toBe("d0");
    expect(dueStep({ ...base, sent: ["d0"] }, at(1))).toBeNull();
    const d = dueStep({ ...base, sent: ["d0"] }, at(11));
    expect(d?.step.key).toBe("d10"); expect(d?.skipOlder).toEqual(["d2", "d5"]);
  });
  it("D14 is for free accounts only; opted-out people get nothing; done = nothing", () => {
    expect(dueStep({ ...base, sent: ["d0", "d2", "d5", "d10"] }, at(15))?.step.key).toBe("d14");
    expect(dueStep({ ...base, paying: true, sent: ["d0", "d2", "d5", "d10"] }, at(15))).toBeNull();
    expect(dueStep({ ...base, optOut: true }, at(3))).toBeNull();
    expect(dueStep({ ...base, sent: ["d0", "d2", "d5", "d10", "d14"] }, at(30))).toBeNull();
  });
  it("only emails verified or owner-confirmed addresses", () => {
    expect(canEmail({ verified: false, emailOk: false, optOut: false })).toBe(false);
    expect(canEmail({ verified: false, emailOk: true, optOut: false })).toBe(true);
    expect(canEmail({ verified: true, emailOk: true, optOut: true })).toBe(false);
  });
  it("renders honestly: founding line only with trades and seats; footer attached; no unfilled placeholders", () => {
    const f = "Sender Co · reply STOP";
    const noTrades = renderMail(DEFAULT_NURTURE.d14, { name: "Sam", sender: "Andrew", trades: 0, foundingLeft: 10 }, f);
    expect(noTrades.body).not.toMatch(/founding/);
    const withTrades = renderMail(DEFAULT_NURTURE.d14, { name: "Sam", sender: "Andrew", trades: 4, foundingLeft: 10 }, f);
    expect(withTrades.body).toMatch(/10 founding spots/); expect(withTrades.body).toMatch(/reply STOP$/);
    for (const m of Object.values(DEFAULT_NURTURE)) expect(renderMail(m, { name: "Sam", sender: "A", trades: 1, foundingLeft: 0 }, f).body).not.toMatch(/\{\w+\}/);
    expect(nameFor("Sam Lee", "x@y.com")).toBe("Sam"); expect(nameFor(null, "x@y.com")).toBe("x");
  });
});
describe("daily report", () => {
  it("includes every line the daily-ops doc asks for", () => {
    const t = reportText({ day: "2026-11-14", signups: 3, signupsBySource: [{ source: "tt-dm", signups: 2, activated: 1 }], activations: 2, paying: 1, mrr: 6, foundingUsed: 1, foundingSeats: 10, dms: { tiktok: 25, instagram: 20 }, followups: 4, replies: 6, demos: 1, posts: { tiktok: 3, youtube: 2, instagram: 0 }, views: 1200, adSpend: 10, adClicks: 8, openFeedback: 2 }, { blockers: "domain" });
    for (const s of ["Signups: 3", "tt-dm: 2 (1 logged a trade)", "Paying: 1", "MRR: $6.00", "1/10", "TikTok 25", "cost/click $1.25", "Blockers: domain"]) expect(t).toContain(s);
  });
});
