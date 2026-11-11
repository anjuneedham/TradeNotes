import { describe, it, expect } from "vitest";
import { inRange, parseRange, rangeStart, tagSummary, worstTrade } from "./trades-data";
import type { TradeInput } from "./metrics";

const t = (id: string, exit: number, closedAt: string | null, extra: Partial<TradeInput> = {}): TradeInput & { tags: string[] } =>
  ({ id, side: "long", quantity: 1, entryPrice: 100, exits: closedAt ? [{ quantity: 1, price: exit }] : [], fees: 0, closedAt, tags: [], ...extra });

describe("range helpers", () => {
  it("parses unknown ranges as all", () => { expect(parseRange("nope")).toBe("all"); expect(parseRange("30d")).toBe("30d"); });
  it("computes range starts in UTC", () => {
    const now = new Date("2026-11-11T12:00:00Z");
    expect(rangeStart("all", now)).toBeNull();
    expect(rangeStart("ytd", now)!.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(rangeStart("30d", now)!.toISOString()).toBe("2026-10-12T12:00:00.000Z");
  });
  it("keeps open trades and trades closed inside the window", () => {
    const ts = [t("old", 110, "2026-01-01T00:00:00Z"), t("new", 110, "2026-11-01T00:00:00Z"), t("open", 0, null)];
    expect(inRange(ts, new Date("2026-10-01T00:00:00Z")).map((x) => x.id)).toEqual(["new", "open"]);
    expect(inRange(ts, new Date("2025-12-01T00:00:00Z"), new Date("2026-10-01T00:00:00Z")).map((x) => x.id)).toEqual(["old"]);
  });
});

describe("tagSummary / worstTrade", () => {
  it("counts a multi-tag trade under each tag", () => {
    const a = { ...t("a", 90, "2026-11-01T00:00:00Z"), tags: ["Moved stop", "Oversized"] };
    const b = { ...t("b", 95, "2026-11-02T00:00:00Z"), tags: ["Oversized"] };
    const s = tagSummary([a, b], (x) => x.tags);
    expect(s["Moved stop"].netPnl).toBe(-10);
    expect(s["Oversized"].netPnl).toBe(-15);
    expect(s["Oversized"].tradeCount).toBe(2);
  });
  it("finds the largest loss and ignores open trades and winners", () => {
    const ts = [t("w", 120, "2026-11-01T00:00:00Z"), t("l1", 95, "2026-11-02T00:00:00Z"), t("l2", 80, "2026-11-03T00:00:00Z"), t("o", 0, null)];
    expect(worstTrade(ts)?.trade.id).toBe("l2");
    expect(worstTrade([ts[0]])).toBeNull();
  });
});
