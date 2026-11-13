import { describe, it, expect } from "vitest";
import { localDate, localDayHour, isValidTimeZone, tzOffsetMs, zonedToUtc } from "./timezone";

describe("local calendar day and hour (hand-calculated)", () => {
  // 2026-11-13 is a Friday (Jan 1 2026 is a Thursday; Nov 13 is day 317, 316 days later = 45 weeks + 1 day).
  it("New York is 5 hours behind UTC in November (EST)", () => {
    expect(localDate("2026-11-13T02:30:00Z", "America/New_York")).toBe("2026-11-12");
    expect(localDayHour("2026-11-13T02:30:00Z", "America/New_York")).toEqual({ day: 4, hour: 21 }); // Thursday 21:30
  });
  it("Tokyo is 9 hours ahead and does not use DST", () => {
    expect(localDate("2026-11-13T02:30:00Z", "Asia/Tokyo")).toBe("2026-11-13");
    expect(localDayHour("2026-11-13T02:30:00Z", "Asia/Tokyo")).toEqual({ day: 5, hour: 11 });
    expect(localDayHour("2026-07-01T15:30:00Z", "Asia/Tokyo")).toEqual({ day: 4, hour: 0 }); // already Thursday 00:30
  });
  it("follows daylight saving: New York springs forward on 2026-03-08 at 07:00 UTC", () => {
    expect(localDayHour("2026-03-08T06:59:00Z", "America/New_York")).toEqual({ day: 0, hour: 1 });  // Sunday 01:59 EST
    expect(localDayHour("2026-03-08T07:00:00Z", "America/New_York")).toEqual({ day: 0, hour: 3 });  // Sunday 03:00 EDT
    expect(tzOffsetMs(Date.parse("2026-07-01T12:00:00Z"), "America/New_York")).toBe(-4 * 3600000);
    expect(tzOffsetMs(Date.parse("2026-12-01T12:00:00Z"), "America/New_York")).toBe(-5 * 3600000);
  });
  it("an invalid zone falls back to UTC instead of throwing", () => {
    expect(isValidTimeZone("Not/AZone")).toBe(false);
    expect(localDate("2026-11-13T23:59:00Z", "Not/AZone")).toBe("2026-11-13");
    expect(localDayHour("2026-11-13T23:59:00Z", "Not/AZone")).toEqual({ day: 5, hour: 23 });
  });
  it("zonedToUtc and localDate round-trip", () => {
    const ms = zonedToUtc(2026, 11, 13, 9, 30, 0, "Europe/Athens"); // EET, UTC+2
    expect(new Date(ms).toISOString()).toBe("2026-11-13T07:30:00.000Z");
    expect(localDate(new Date(ms).toISOString(), "Europe/Athens")).toBe("2026-11-13");
  });
  it("is fast enough for 10,000 trades (formatters are cached per zone)", () => {
    const t = performance.now();
    for (let i = 0; i < 10000; i++) localDayHour(new Date(Date.UTC(2026, 0, 1) + i * 3600000 * 7).toISOString(), "America/New_York");
    expect(performance.now() - t).toBeLessThan(1000);
  });
});
