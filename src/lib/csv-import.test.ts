import { describe, it, expect } from "vitest";
import { guessMapping, previewImport } from "./csv-import";

const csv = `Symbol,Direction,Qty,Entry Price,Exit Price,Open Time,Close Time,Commission
aapl,Buy,10,"1,000.50",1010,2026-01-02T14:30:00Z,2026-01-02T15:00:00Z,1.00
TSLA,sell,5,200,190,2026-01-03T14:30:00Z,2026-01-03T15:00:00Z,
aapl,Buy,10,"1,000.50",1010,2026-01-02T14:30:00Z,2026-01-02T15:00:00Z,1.00
ES,hold,1,0,5000,notadate,,x
`;

describe("csv import", () => {
  const headers = ["Symbol", "Direction", "Qty", "Entry Price", "Exit Price", "Open Time", "Close Time", "Commission"];
  it("guesses mapping from common headers", () => {
    expect(guessMapping(headers)).toEqual({
      symbol: "Symbol", side: "Direction", quantity: "Qty", entryPrice: "Entry Price",
      exitPrice: "Exit Price", openedAt: "Open Time", closedAt: "Close Time", fees: "Commission",
    });
  });
  it("parses, validates and dedupes", () => {
    const p = previewImport(csv, guessMapping(headers));
    expect(p.valid).toHaveLength(2);
    expect(p.valid[0]).toMatchObject({ symbol: "AAPL", side: "long", entryPrice: 1000.5, fees: 1 });
    expect(p.valid[1]).toMatchObject({ side: "short", fees: 0 });
    expect(p.duplicatesInFile).toBe(1);
    expect(p.errors).toHaveLength(1);
    expect(p.errors[0].row).toBe(5);
    expect(p.errors[0].message).toMatch(/side.*entry price.*open time/);
  });
  it("refuses when required columns are unmapped", () => {
    const p = previewImport(csv, { symbol: "Symbol" });
    expect(p.valid).toHaveLength(0);
    expect(p.errors[0].message).toMatch(/Map required columns/);
  });
});
