import { describe, it, expect } from "vitest";
import { unsubscribeToken, verifyUnsubscribeToken, cronAuthorized, dueCandidates, lastWeekStart, sendBudget, remindersLive, DAILY_CAP, MONTHLY_CAP, type Candidate } from "./reminders";

const ID = "0f8fad5b-d9cb-469f-a165-70867728950e", SECRET = "test-secret-not-real";

describe("unsubscribe token", () => {
  it("round-trips and rejects tampering, other secrets, other users and junk", () => {
    const t = unsubscribeToken(ID, SECRET);
    expect(verifyUnsubscribeToken(t, SECRET)).toBe(ID);
    expect(verifyUnsubscribeToken(t, "another-secret")).toBeNull();
    expect(verifyUnsubscribeToken(t.replace(ID, "11111111-1111-4111-8111-111111111111"), SECRET)).toBeNull(); // someone else's id with my signature
    expect(verifyUnsubscribeToken(t.slice(0, -1) + (t.endsWith("0") ? "1" : "0"), SECRET)).toBeNull();
    for (const bad of ["", "abc", ".", `${ID}.`, `${ID}.zz`, `not-a-uuid.${"a".repeat(64)}`, `${ID}.${"a".repeat(63)}`]) expect(verifyUnsubscribeToken(bad, SECRET)).toBeNull();
    expect(verifyUnsubscribeToken(t, "")).toBeNull();
  });
});

describe("cron authorisation", () => {
  it("needs the exact bearer secret; no secret configured means nobody is authorised", () => {
    expect(cronAuthorized(`Bearer ${SECRET}`, SECRET)).toBe(true);
    for (const h of [null, "", SECRET, `Bearer ${SECRET}x`, `Bearer ${SECRET.slice(1)}`, "Bearer ", "Basic abc"]) expect(cronAuthorized(h, SECRET)).toBe(false);
    expect(cronAuthorized("Bearer ", "")).toBe(false); expect(cronAuthorized(`Bearer ${SECRET}`, undefined)).toBe(false);
  });
});

describe("who is due", () => {
  const now = new Date("2026-11-16T14:00:00Z"); // a Monday
  const c = (id: string, o: Partial<Candidate> = {}): Candidate => ({ id, email: `${id}@x.test`, timezone: "UTC", plan: "starter", status: "active", current_period_end: "2027-01-01T00:00:00Z", review_reminder_sent_at: null, ...o });
  it("only plans that include reviews, never Free, lapsed or cancelled", () => {
    const due = dueCandidates([c("std"), c("pro", { plan: "pro" }), c("free", { plan: "free" }), c("lapsed", { current_period_end: "2026-11-01T00:00:00Z" }), c("cancelled", { status: "canceled" })], now).map((x) => x.id);
    expect(due).toEqual(["std", "pro"]);
  });
  it("at most one per 6 days (hand-calculated: 5d23h ago is not due, 6d0h is)", () => {
    expect(dueCandidates([c("a", { review_reminder_sent_at: "2026-11-10T14:00:01Z" })], now)).toHaveLength(0);
    expect(dueCandidates([c("b", { review_reminder_sent_at: "2026-11-10T14:00:00Z" })], now)).toHaveLength(1);
    expect(dueCandidates([c("c", { review_reminder_sent_at: "2026-11-09T14:00:00Z" })], now)).toHaveLength(1);
  });
  it("last week is the Monday-Sunday week before this one, in the user's zone", () => {
    expect(lastWeekStart(now, "UTC")).toBe("2026-11-09");
    expect(lastWeekStart(new Date("2026-11-16T03:00:00Z"), "America/New_York")).toBe("2026-11-02"); // still Sunday evening there
  });
});

describe("caps keep sends inside Resend's free limits", () => {
  it("budget is the smaller of what is left today and this month", () => {
    expect(sendBudget(0, 0)).toBe(DAILY_CAP);
    expect(sendBudget(DAILY_CAP, 0)).toBe(0);
    expect(sendBudget(10, MONTHLY_CAP - 5)).toBe(5);
    expect(sendBudget(500, 9000)).toBe(0);
    expect(DAILY_CAP).toBeLessThan(100); expect(MONTHLY_CAP).toBeLessThan(3000);
  });
  it("reminders are 'live' only when both the scheduler secret and the email key exist", () => {
    expect(remindersLive({})).toBe(false); expect(remindersLive({ CRON_SECRET: "x" })).toBe(false); expect(remindersLive({ RESEND_API_KEY: "y" })).toBe(false);
    expect(remindersLive({ CRON_SECRET: "x", RESEND_API_KEY: "y" })).toBe(true);
  });
});
