import { describe, it, expect } from "vitest";
import { foundingPriceCents, seatsLeft } from "./founding";

describe("founding offer", () => {
  it("halves the monthly price", () => {
    expect(foundingPriceCents("starter")).toBe(600);
    expect(foundingPriceCents("pro")).toBe(1200);
  });
  it("counts seats and never goes negative", () => {
    expect(seatsLeft(0)).toBe(10);
    expect(seatsLeft(9)).toBe(1);
    expect(seatsLeft(10)).toBe(0);
    expect(seatsLeft(14)).toBe(0);
  });
});
