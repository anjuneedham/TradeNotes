import { describe, it, expect } from "vitest";
import { parseFilters, withKnownAccount, validDate, activeFilterCount, filterParams, filterHref, dateWindow, dateLabel, NO_FILTERS, MAX_TAGS } from "./filters";
import { tradeWhere } from "./trade-filter-sql";

const ACCT = "0f8fad5b-d9cb-469f-a165-70867728950e";

describe("parseFilters: garbage in, defaults out", () => {
  it("returns the defaults for nothing, undefined and empty strings", () => {
    expect(parseFilters({})).toEqual(NO_FILTERS);
    expect(parseFilters(undefined)).toEqual(NO_FILTERS);
    expect(parseFilters({ range: "", from: "", to: "", account: "", strategy: "", symbol: "", side: "", session: "", tag: "" })).toEqual(NO_FILTERS);
  });
  it("ignores every invalid value without throwing", () => {
    const f = parseFilters({
      range: "forever", from: "banana", to: "2026-02-30", account: "not-a-uuid", side: "sideways",
      strategy: "x".repeat(61), symbol: "a\u0000b", session: "line\nbreak", tag: ["<script>alert(1)</script>", "x".repeat(41), "a;b"],
    });
    expect(f).toEqual(NO_FILTERS);
  });
  it("rejects dates that do not exist or are out of range", () => {
    expect(validDate("2026-02-29")).toBeNull();          // 2026 is not a leap year
    expect(validDate("2028-02-29")).toBe("2028-02-29");  // 2028 is
    expect(validDate("2026-13-01")).toBeNull();
    expect(validDate("2026-1-1")).toBeNull();
    expect(validDate("1969-12-31")).toBeNull();
    expect(validDate("2101-01-01")).toBeNull();
    expect(validDate("2026-11-13T00:00")).toBeNull();
  });
  it("never treats SQL or HTML as anything but an (accepted or rejected) string", () => {
    const f = parseFilters({ strategy: "x'; drop table trades;--" });
    expect(f.strategy).toBe("x'; drop table trades;--"); // legal text; safety comes from bound parameters (tested below)
    expect(parseFilters({ tag: "'; drop table x;--" }).tags).toEqual([]); // ';' is not allowed in tags
  });
});

describe("parseFilters: valid values and repeated parameters", () => {
  it("parses every filter", () => {
    const f = parseFilters({ range: "30d", account: ACCT.toUpperCase(), strategy: " London breakout ", symbol: "eurusd", side: "short", session: "New York", tag: ["FOMO", "Revenge trade"] });
    expect(f).toEqual({ range: "30d", from: null, to: null, account: ACCT, strategy: "London breakout", symbol: "EURUSD", side: "short", tags: ["FOMO", "Revenge trade"], session: "New York" });
  });
  it("accepts account=all", () => { expect(parseFilters({ account: "all" }).account).toBe("all"); });
  it("takes the first VALID value of a repeated single-valued parameter", () => {
    expect(parseFilters({ range: ["bogus", "90d", "7d"] }).range).toBe("90d");
    expect(parseFilters({ side: ["long", "short"] }).side).toBe("long");
    expect(parseFilters({ side: ["nope", "short"] }).side).toBe("short");
    expect(parseFilters({ from: ["2026-99-99", "2026-03-01"] }).from).toBe("2026-03-01");
  });
  it("de-duplicates tags, drops bad ones, and caps the count", () => {
    expect(parseFilters({ tag: ["FOMO", "FOMO", "Calm", "bad;tag"] }).tags).toEqual(["FOMO", "Calm"]);
    const many = Array.from({ length: 30 }, (_, i) => `tag${i}`);
    expect(parseFilters({ tag: many }).tags).toHaveLength(MAX_TAGS);
  });
  it("reads URLSearchParams the same way", () => {
    const u = new URLSearchParams("tag=FOMO&tag=Calm&side=long&side=short&from=2026-03-01&to=2026-03-31");
    const f = parseFilters(u);
    expect(f.tags).toEqual(["FOMO", "Calm"]); expect(f.side).toBe("long"); expect([f.from, f.to]).toEqual(["2026-03-01", "2026-03-31"]);
  });
  it("reads a reversed from/to as the range between them", () => {
    const f = parseFilters({ from: "2026-03-31", to: "2026-03-01" });
    expect([f.from, f.to]).toEqual(["2026-03-01", "2026-03-31"]);
  });
});

describe("serialisation", () => {
  it("round-trips and omits defaults", () => {
    const f = parseFilters({ range: "30d", side: "long", tag: ["FOMO", "Calm"], strategy: "A B" });
    const q = filterParams(f).toString();
    expect(q).toBe("range=30d&strategy=A+B&side=long&tag=FOMO&tag=Calm");
    expect(parseFilters(new URLSearchParams(q))).toEqual(f);
    expect(filterHref("/app", NO_FILTERS)).toBe("/app");
    expect(filterHref("/app/calendar", NO_FILTERS, { month: "2026-03" })).toBe("/app/calendar?month=2026-03");
  });
  it("custom dates replace the preset in the URL", () => {
    expect(filterParams(parseFilters({ range: "30d", from: "2026-03-01" })).toString()).toBe("from=2026-03-01");
  });
  it("counts active filters (date counts once)", () => {
    expect(activeFilterCount(NO_FILTERS)).toBe(0);
    expect(activeFilterCount(parseFilters({ range: "7d", from: "2026-03-01", to: "2026-03-02", side: "long", tag: ["FOMO", "Calm"] }))).toBe(3);
  });
});

describe("dateWindow (hand-calculated)", () => {
  const now = new Date("2026-11-11T12:00:00Z");
  it("all time has no bounds", () => { expect(dateWindow(NO_FILTERS, "UTC", now)).toEqual({ start: null, end: null }); });
  it("presets count back from now", () => {
    expect(dateWindow({ range: "7d", from: null, to: null }, "UTC", now).start!.toISOString()).toBe("2026-11-04T12:00:00.000Z");
    expect(dateWindow({ range: "30d", from: null, to: null }, "UTC", now).start!.toISOString()).toBe("2026-10-12T12:00:00.000Z");
    expect(dateWindow({ range: "90d", from: null, to: null }, "UTC", now).start!.toISOString()).toBe("2026-08-13T12:00:00.000Z");
  });
  it("this year starts at local 1 January", () => {
    expect(dateWindow({ range: "ytd", from: null, to: null }, "UTC", now).start!.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    // 2025-12-31 12:00Z is already 2026-01-01 01:00 in Auckland (NZDT, +13): the year there started at 2025-12-31 11:00Z.
    expect(dateWindow({ range: "ytd", from: null, to: null }, "Pacific/Auckland", new Date("2025-12-31T12:00:00Z")).start!.toISOString()).toBe("2025-12-31T11:00:00.000Z");
  });
  it("a custom day is a whole local day, including DST days (23 h in New York on 2026-03-08)", () => {
    const w = dateWindow({ range: "all", from: "2026-03-08", to: "2026-03-08" }, "America/New_York", now);
    expect(w.start!.toISOString()).toBe("2026-03-08T05:00:00.000Z"); // midnight EST
    expect(w.end!.toISOString()).toBe("2026-03-09T04:00:00.000Z");   // next midnight, already EDT
    expect((w.end!.getTime() - w.start!.getTime()) / 3600000).toBe(23);
  });
  it("open-ended custom ranges and month overflow", () => {
    const w = dateWindow({ range: "all", from: null, to: "2026-12-31" }, "UTC", now);
    expect(w.start).toBeNull(); expect(w.end!.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });
  it("an invalid time zone falls back to UTC", () => {
    expect(dateWindow({ range: "all", from: "2026-03-08", to: null }, "Not/AZone", now).start!.toISOString()).toBe("2026-03-08T00:00:00.000Z");
  });
  it("labels", () => {
    expect(dateLabel(parseFilters({ range: "90d" }))).toBe("90 days");
    expect(dateLabel(parseFilters({ from: "2026-03-01", to: "2026-03-01" }))).toBe("2026-03-01");
    expect(dateLabel(parseFilters({ from: "2026-03-01", to: "2026-03-31" }))).toBe("2026-03-01 to 2026-03-31");
  });
});

describe("tradeWhere: values are bound parameters, never SQL text", () => {
  const now = new Date("2026-11-11T12:00:00Z");
  it("no filters and no scope is just 'true'", () => {
    expect(tradeWhere(NO_FILTERS, null, "UTC", { now })).toEqual({ sql: "true", params: [] });
  });
  it("numbers parameters after the caller's own", () => {
    const f = parseFilters({ range: "7d", side: "long", symbol: "ES", strategy: "x'; drop table trades;--", tag: ["FOMO"], session: "London" });
    const w = tradeWhere(f, [ACCT], "UTC", { now, params: ["caller-param"] });
    expect(w.params).toEqual(["caller-param", [ACCT], "2026-11-04T12:00:00.000Z", "x'; drop table trades;--", "ES", "long", "London", ["FOMO"]]);
    expect(w.sql).toContain("t.account_id = any($2::uuid[])");
    expect(w.sql).toContain("coalesce(t.closed_at, t.opened_at) >= $3::timestamptz");
    expect(w.sql).toContain("fs.name = $4");
    expect(w.sql).toContain("t.symbol = $5");
    expect(w.sql).toContain("t.side = $6");
    expect(w.sql).toContain("t.session = $7");
    expect(w.sql).toContain("t.mistakes && $8::text[] or t.emotions && $8::text[]");
    expect(w.sql).not.toMatch(/drop table|FOMO|London|2026/); // no value text in the SQL
  });
  it("skipDate leaves the date window out", () => {
    const w = tradeWhere(parseFilters({ range: "7d" }), null, "UTC", { now, skipDate: true });
    expect(w).toEqual({ sql: "true", params: [] });
  });
});

describe("withKnownAccount", () => {
  it("keeps all, the user's own account ids and null; drops anyone else's id", () => {
    const mine = [ACCT];
    expect(withKnownAccount(parseFilters({ account: "all" }), mine).account).toBe("all");
    expect(withKnownAccount(parseFilters({ account: ACCT }), mine).account).toBe(ACCT);
    expect(withKnownAccount(parseFilters({ account: "11111111-1111-4111-8111-111111111111" }), mine).account).toBeNull();
    expect(activeFilterCount(withKnownAccount(parseFilters({ account: "11111111-1111-4111-8111-111111111111" }), mine))).toBe(0);
  });
});
