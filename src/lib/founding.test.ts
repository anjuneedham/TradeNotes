import { describe, it, expect } from "vitest";
import { foundingPriceCents, seatsLeft } from "./founding";

describe("founding offer", () => {
  it("halves the monthly price", () => {
    expect(foundingPriceCents("starter")).toBe(600);
    expect(foundingPriceCents("pro")).toBe(1200);
  });
  it("counts seats and never goes negative", () => {
    expect(seatsLeft(0)).toBe(100);
    expect(seatsLeft(99)).toBe(1);
    expect(seatsLeft(100)).toBe(0);
    expect(seatsLeft(140)).toBe(0);
  });
});
