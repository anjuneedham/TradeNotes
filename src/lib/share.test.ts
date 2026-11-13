import { describe, it, expect } from "vitest";
import { hashToken, newToken, isTokenShape } from "./share-token";
import { linkStatus, parseScope, parseExpiryDays, cleanLabel, scopeLabel, scopeRange, buildReport, SHARE_SCOPES, EXPIRY_DAYS, MAX_ACTIVE_LINKS } from "./share";
import type { TradeResult } from "./metrics";

describe("share tokens", () => {
  it("tokens are 43 URL-safe characters (256 bits), unique, and recognised by shape", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) { const t = newToken(); expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/); expect(isTokenShape(t)).toBe(true); seen.add(t); }
    expect(seen.size).toBe(200);
    for (const bad of ["", "abc", "x".repeat(42), "x".repeat(44), "x".repeat(42) + "!", "x".repeat(42) + " ", `${"x".repeat(42)}/`, null, undefined, 5]) expect(isTokenShape(bad)).toBe(false);
  });
  it("the stored value is the SHA-256 hex of the token (known test vector), never the token", () => {
    expect(hashToken("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    const t = newToken();
    expect(hashToken(t)).toMatch(/^[0-9a-f]{64}$/); expect(hashToken(t)).not.toContain(t); expect(hashToken(t)).toBe(hashToken(t)); expect(hashToken(t)).not.toBe(hashToken(newToken()));
  });
});

describe("link status, scopes, inputs", () => {
  const now = new Date("2026-11-13T12:00:00Z");
  it("active until the expiry instant, expired from it, revoked wins over everything", () => {
    expect(linkStatus({ expires_at: "2026-11-13T12:00:01Z", revoked_at: null }, now)).toBe("active");
    expect(linkStatus({ expires_at: "2026-11-13T12:00:00Z", revoked_at: null }, now)).toBe("expired");
    expect(linkStatus({ expires_at: "2026-11-01T00:00:00Z", revoked_at: null }, now)).toBe("expired");
    expect(linkStatus({ expires_at: "2027-01-01T00:00:00Z", revoked_at: "2026-11-10T00:00:00Z" }, now)).toBe("revoked");
    expect(linkStatus({ expires_at: "2026-01-01T00:00:00Z", revoked_at: "2026-11-10T00:00:00Z" }, now)).toBe("revoked");
  });
  it("scopes, expiry choices and labels only accept known values", () => {
    expect(SHARE_SCOPES.map((s) => s.value)).toEqual(["all", "ytd", "90d", "30d"]);
    expect(parseScope("30d")).toBe("30d"); expect(parseScope("everything")).toBeNull(); expect(parseScope(undefined)).toBeNull();
    expect(scopeLabel("ytd")).toBe("This year"); expect(scopeRange("90d")).toBe("90d"); expect(scopeRange("junk")).toBe("all");
    expect(EXPIRY_DAYS).toEqual([7, 30, 90]);
    expect(parseExpiryDays("30")).toBe(30); expect(parseExpiryDays(7)).toBe(7); expect(parseExpiryDays("365")).toBeNull(); expect(parseExpiryDays("-1")).toBeNull(); expect(parseExpiryDays("abc")).toBeNull();
    expect(cleanLabel("  For my mentor  ")).toBe("For my mentor"); expect(cleanLabel("")).toBeNull(); expect(cleanLabel("   ")).toBeNull();
    expect(cleanLabel("a\u0000b\nc")).toBe("a b c"); expect(cleanLabel("x".repeat(100))).toHaveLength(60);
    expect(MAX_ACTIVE_LINKS).toBe(5);
  });
});

describe("the public report contains aggregates only", () => {
  // Hand calculation: net 100 - 40 + 60 = 120; 2 wins, 1 loss; win rate 2/3; profit factor 160/40 = 4; expectancy 40; avg R (2 + 1.5)/2 = 1.75 (the -1 trade has no R);
  // max drawdown: cum 100, 60, 120 -> peak 100, trough 60 -> 40.
  const rows = [
    { id: "SECRET-ID-1", netPnl: 100, grossPnl: 100, fees: 0, r: 2, closedAt: "2026-10-05T10:00:00Z", symbol: "EURUSD", strategy: "SECRET-STRATEGY", account: "SECRET-ACCOUNT", notes: "SECRET-NOTE" },
    { id: "SECRET-ID-2", netPnl: -40, grossPnl: -40, fees: 0, r: null, closedAt: "2026-10-06T10:00:00Z", symbol: "GBPUSD", mistakes: ["SECRET-TAG"] },
    { id: "SECRET-ID-3", netPnl: 60, grossPnl: 62, fees: 2, r: 1.5, closedAt: "2026-10-07T10:00:00Z", symbol: "ES" },
  ] as unknown as TradeResult[];
  const r = buildReport(rows, "all", "USD", new Date("2026-11-13T09:00:00Z"));
  it("figures", () => {
    expect(r).toMatchObject({ scope: "all", scopeLabel: "All time", currency: "USD", generatedOn: "2026-11-13", trades: 3, wins: 2, losses: 1, breakevens: 0, netPnl: 120, expectancy: 40, avgWin: 80, avgLoss: -40, rTrades: 2, maxDrawdown: 40, maxWinStreak: 1, maxLossStreak: 1, smallSample: true, curveTotal: 3 });
    expect(r.winRate).toBeCloseTo(2 / 3, 12); expect(r.profitFactor).toBeCloseTo(4, 12); expect(r.avgR).toBeCloseTo(1.75, 12);
    expect(r.curve).toEqual([{ cumulative: 100, n: 1 }, { cumulative: 60, n: 2 }, { cumulative: 120, n: 3 }]);
  });
  it("has exactly the allowed fields (a new field must be added here on purpose, after asking whether it is private)", () => {
    expect(Object.keys(r).sort()).toEqual(["avgLoss", "avgR", "avgWin", "breakevens", "curve", "curveTotal", "currency", "expectancy", "generatedOn", "losses", "maxDrawdown", "maxLossStreak", "maxWinStreak", "netPnl", "profitFactor", "rTrades", "scope", "scopeLabel", "smallSample", "trades", "winRate", "wins"].sort());
    expect(Object.keys(r.curve[0]).sort()).toEqual(["cumulative", "n"]);
  });
  it("planted private values (ids, symbols, strategies, accounts, notes, tags, trade dates) never reach the serialised report", () => {
    const json = JSON.stringify(r);
    for (const secret of ["SECRET", "EURUSD", "GBPUSD", "2026-10-05", "2026-10-06", "2026-10-07", "closedAt", "symbol", "strategy"]) expect(json).not.toContain(secret);
  });
  it("an empty period gives zeros and nulls, not NaN or infinity", () => {
    const e = buildReport([], "30d", "EUR", new Date("2026-11-13T00:00:00Z"));
    expect(e.trades).toBe(0); expect(e.winRate).toBeNull(); expect(e.profitFactor).toBeNull(); expect(e.netPnl).toBe(0); expect(e.curve).toEqual([]);
    expect(JSON.stringify(e)).not.toMatch(/NaN|Infinity/);
  });
});
