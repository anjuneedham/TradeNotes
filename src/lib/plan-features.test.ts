import { describe, it, expect } from "vitest";
import { PLANS } from "./plans";
import { FEATURES_NOW, FEATURES_DEV, featuresNow, featuresDev, paidAddsText, premiumAddsText, PLAN_BLURB } from "./plan-features";

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
    // Strategy comparison and the manual backtest log shipped in Phase 3; chart replay is not built, not approved (needs paid market data), and not listed at all.
    expect(featuresDev().map((f) => f.label)).not.toEqual(expect.arrayContaining(["Strategy comparison"]));
    expect(FEATURES_DEV).toEqual([]);
  });
  it("Phase 3 features are listed as available now, with every cell taken from the PLANS flags the server enforces", () => {
    expect(row("Strategy comparison").cells).toEqual({ free: false, starter: false, pro: true });
    expect(row("Manual backtest log").cells).toEqual({ free: false, starter: false, pro: true });
    expect(row("Strategy comparison").cells).toEqual({ free: PLANS.free.comparison, starter: PLANS.starter.comparison, pro: PLANS.pro.comparison });
    expect(row("Manual backtest log").cells).toEqual({ free: PLANS.free.backtesting, starter: PLANS.starter.backtesting, pro: PLANS.pro.backtesting });
    expect(row("Share links").cells).toEqual({ free: PLANS.free.shareLinks, starter: PLANS.starter.shareLinks, pro: PLANS.pro.shareLinks });
    expect(row("Mobile quick-log").cells).toEqual({ free: true, starter: true, pro: true });
  });
  it("the backtest row says hypothetical results are separate and that no market data or playback is supplied; screenshots are mentioned only when screenshots are on", () => {
    const d = row("Manual backtest log").detail!;
    expect(d).toMatch(/HYPOTHETICAL/); expect(d).toMatch(/apart from your real results/); expect(d).toMatch(/does not supply market data/);
    const saved = { u: process.env.SUPABASE_URL, k: process.env.SUPABASE_SERVICE_ROLE_KEY };
    delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(featuresNow().find((f) => f.label === "Manual backtest log")!.detail).not.toMatch(/screenshot/i);
    process.env.SUPABASE_URL = "https://x.supabase.co"; process.env.SUPABASE_SERVICE_ROLE_KEY = "k";
    expect(featuresNow().find((f) => f.label === "Manual backtest log")!.detail).toMatch(/count toward your screenshot storage/);
    if (saved.u === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = saved.u;
    if (saved.k === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = saved.k;
  });
  it("the Premium blurb and text name what Premium adds", () => {
    expect(PLAN_BLURB.pro).toMatch(/strategy comparison/i); expect(PLAN_BLURB.pro).toMatch(/backtest log/i);
    expect(premiumAddsText()).toMatch(/strategy comparison/); expect(premiumAddsText()).toMatch(/backtest log/);
  });
  it("nothing is double-listed as both available and in development", () => {
    const now = new Set(featuresNow().map((f) => f.label));
    for (const f of featuresDev()) expect(now.has(f.label)).toBe(false);
  });
  it("features that are not built are not advertised anywhere as available", () => {
    const all = JSON.stringify([FEATURES_NOW, PLAN_BLURB, paidAddsText()]).toLowerCase();
    for (const banned of ["mae", "mfe", "reminder emails will", "ai summary", "replay"]) expect(all).not.toContain(banned);
    const rev = () => featuresNow().find((f) => f.label === "Daily, weekly and monthly reviews")!.detail!;
    const saved = { c: process.env.CRON_SECRET, r: process.env.RESEND_API_KEY };
    delete process.env.CRON_SECRET; delete process.env.RESEND_API_KEY;
    expect(rev()).toMatch(/Reminder emails are not available yet/); // not configured: nothing is promised
    process.env.CRON_SECRET = "x"; process.env.RESEND_API_KEY = "y";
    expect(rev()).toMatch(/Optional weekly reminder email, off by default/);
    if (saved.c === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = saved.c;
    if (saved.r === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = saved.r;
  });
  it("the one-sentence summary names the new paid features", () => {
    expect(paidAddsText()).toMatch(/calendar/); expect(paidAddsText()).toMatch(/reviews/); expect(paidAddsText()).toMatch(/playbook/);
    expect(PLAN_BLURB.starter).toMatch(/calendar, reviews and playbook/);
  });
});
