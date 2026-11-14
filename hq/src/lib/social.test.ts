import { describe, expect, it } from "vitest";
import { buildTag, cpc, decide, platformOfTag, shouldPauseAd } from "./social";
describe("social", () => {
  it("builds valid tags and rejects bad ones", () => {
    expect(buildTag("tt", "dm")).toEqual({ tag: "tt-dm" });
    expect(buildTag("ig", "organic", "V12!")).toEqual({ tag: "ig-organic-v12" });
    expect(buildTag("xx", "dm").tag).toBeNull();
    expect(buildTag("ig", "organic", "").tag).toBe("ig-organic");
  });
  it("maps tags to platforms", () => { expect(platformOfTag("ig-ad")).toBe("instagram"); expect(platformOfTag("tt-organic-3")).toBe("tiktok"); expect(platformOfTag("zz-1")).toBeNull(); expect(platformOfTag(null)).toBeNull(); });
  it("applies the day-5 decision rule", () => {
    expect(decide(0, 0).winner).toBeNull(); expect(decide(4, 2).winner).toBeNull(); expect(decide(1, 4).winner).toBe("instagram"); expect(decide(6, 2).winner).toBe("tiktok");
  });
  it("cost per click and the ad pause rule", () => { expect(cpc(10, 8)).toBe(1.25); expect(cpc(10, 0)).toBeNull(); expect(shouldPauseAd(15, 0)).toBe(true); expect(shouldPauseAd(14.99, 0)).toBe(false); expect(shouldPauseAd(30, 1)).toBe(false); });
});
