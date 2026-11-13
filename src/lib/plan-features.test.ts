import { describe, it, expect } from "vitest";
import { PLANS } from "./plans";
import { FEATURES_NOW, FEATURES_DEV, featuresNow, featuresDev, paidAddsText, PLAN_BLURB } from "./plan-features";

const row = (label: string) => FEATURES_NOW.find((f) => f.label === label)!;

describe("plan copy matches what is enforced", () => {
  it("the shipped Phase 2 features are listed as available now, with cells taken from PLANS", () => {
    expect(row("Calendar view").cells).toEqual({ free: PLANS.free.calendar, starter: PLANS.starter.calendar, pro: PLANS.pro.calendar });
    expect(row("Daily, weekly and monthly reviews").cells).toEqual({ free: PLANS.free.reviews, starter: PLANS.starter.reviews, pro: PLANS.pro.reviews });
    expect(row("Playbook and rule adherence").cells).toEqual({ free: PLANS.free.playbook, starter: PLANS.starter.playbook, pro: PLANS.pro.playbook });
  });
  it("calendar, reviews and playbook are Standard and Premium only (the tier matrix says Free has none)", () => {
    for (const k of ["calendar", "reviews", "playbook"] as const) { expect(PLANS.free[k]).toBe(false); expect(PLANS.starter[k]).toBe(true); expect(PLANS.pro[k]).toBe(true); }
  });
  it("filters and deeper analytics are for every plan", () => {
    for (const l of ["Filters on every view", "Deeper analytics"]) expect(row(l).cells).toEqual({ free: true, starter: true, pro: true });
  });
  it("nothing that shipped is still advertised as 'in development'", () => {
    const dev = FEATURES_DEV.map((f) => f.label.toLowerCase()).join(" | ");
    expect(dev).not.toMatch(/calendar|review|playbook|filter/);
    expect(featuresDev().map((f) => f.label)).toEqual(expect.arrayContaining(["Backtesting with historical replay", "Strategy comparison"]));
  });
  it("nothing is double-listed as both available and in development", () => {
    const now = new Set(featuresNow().map((f) => f.label));
    for (const f of featuresDev()) expect(now.has(f.label)).toBe(false);
  });
  it("features that are not built are not advertised anywhere as available", () => {
    const all = JSON.stringify([FEATURES_NOW, PLAN_BLURB, paidAddsText()]).toLowerCase();
    for (const banned of ["mae", "mfe", "reminder emails will", "ai summary", "replay"]) expect(all).not.toContain(banned);
    expect(row("Daily, weekly and monthly reviews").detail).toMatch(/Reminder emails are not available/);
  });
  it("the one-sentence summary names the new paid features", () => {
    expect(paidAddsText()).toMatch(/calendar/); expect(paidAddsText()).toMatch(/reviews/); expect(paidAddsText()).toMatch(/playbook/);
    expect(PLAN_BLURB.starter).toMatch(/calendar, reviews and playbook/);
  });
});
