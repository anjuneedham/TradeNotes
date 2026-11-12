import { describe, it, expect } from "vitest";
import { sniffImage, stripMetadata, checkUpload, quotaBytes, allowanceBytes, MAX_SCREENSHOT_BYTES } from "./screenshots";
import { MemoryStore, SupabaseStore, getStore } from "./storage";

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const chunk = (type: string, data: number[]) => { const l = data.length; return [(l >>> 24) & 255, (l >>> 16) & 255, (l >>> 8) & 255, l & 255, ...[...type].map((c) => c.charCodeAt(0)), ...data, 0, 0, 0, 0]; };
const bytes = (...xs: number[]) => new Uint8Array(xs);

describe("file type sniffing (bytes, not names)", () => {
  it("accepts PNG, JPEG, WebP", () => {
    expect(sniffImage(bytes(...PNG_SIG, 0))).toBe("image/png");
    expect(sniffImage(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(sniffImage(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 "))).toBe("image/webp");
  });
  it("rejects SVG, GIF, HTML and empty files", () => {
    for (const s of ["<svg xmlns='http://www.w3.org/2000/svg'/>", "GIF89a....", "<html><script>", ""]) expect(sniffImage(new TextEncoder().encode(s))).toBeNull();
  });
});

describe("metadata stripping", () => {
  it("JPEG: drops APP1 (EXIF/GPS) and comments, keeps image segments", () => {
    const exif = [0xff, 0xe1, 0x00, 0x08, ...[..."Exif"].map((c) => c.charCodeAt(0)), 0, 0];
    const app0 = [0xff, 0xe0, 0x00, 0x04, 1, 2];
    const com = [0xff, 0xfe, 0x00, 0x04, 9, 9];
    const sos = [0xff, 0xda, 0x00, 0x02, 7, 7, 0xff, 0xd9];
    const out = stripMetadata(bytes(0xff, 0xd8, ...app0, ...exif, ...com, ...sos), "image/jpeg");
    expect([...out]).toEqual([0xff, 0xd8, ...app0, ...sos]);
  });
  it("PNG: drops eXIf/tEXt chunks, keeps IHDR/IDAT/IEND", () => {
    const keep = [...chunk("IHDR", [1, 2, 3]), ...chunk("IDAT", [4])];
    const out = stripMetadata(bytes(...PNG_SIG, ...keep.slice(0, 15), ...chunk("tEXt", [65, 66]), ...keep.slice(15), ...chunk("eXIf", [1]), ...chunk("IEND", [])), "image/png");
    expect([...out]).toEqual([...PNG_SIG, ...keep, ...chunk("IEND", [])]);
  });
  it("malformed input is returned unchanged", () => {
    const b = bytes(0xff, 0xd8, 0x00, 0x01);
    expect(stripMetadata(b, "image/jpeg")).toEqual(b);
  });
});

describe("upload limits (cost guardrails)", () => {
  const ok = { plan: "starter" as const, size: 500_000, type: "image/png" as const, onTrade: 0, userBytes: 0, totalBytes: 0, lastHour: 0, allowance: 1024 ** 3 };
  it("quotas: Free none, Standard 500 MB, Premium 2 GB", () => {
    expect(quotaBytes("free")).toBe(0);
    expect(quotaBytes("starter")).toBe(500 * 1024 * 1024);
    expect(quotaBytes("pro")).toBe(2048 * 1024 * 1024);
  });
  it("allows a normal upload", () => expect(checkUpload(ok)).toBeNull());
  it("Free plan refused", () => expect(checkUpload({ ...ok, plan: "free" })?.code).toBe("plan"));
  it("non-image refused", () => expect(checkUpload({ ...ok, type: null })?.code).toBe("type"));
  it("over 2 MB refused, exactly 2 MB allowed", () => {
    expect(checkUpload({ ...ok, size: MAX_SCREENSHOT_BYTES + 1 })?.code).toBe("size");
    expect(checkUpload({ ...ok, size: MAX_SCREENSHOT_BYTES })).toBeNull();
  });
  it("6th image on a trade refused", () => expect(checkUpload({ ...ok, onTrade: 5 })?.code).toBe("count"));
  it("rate limit: 30 per hour", () => expect(checkUpload({ ...ok, lastHour: 30 })?.code).toBe("rate"));
  it("user quota: 500 MB on Standard", () => expect(checkUpload({ ...ok, userBytes: 500 * 1024 * 1024 - 100 })?.code).toBe("quota"));
  it("platform allowance: refuse once 80% of 1 GB would be passed", () => {
    expect(checkUpload({ ...ok, plan: "pro", totalBytes: 0.8 * 1024 ** 3 - 400_000 })?.code).toBe("allowance");
    expect(checkUpload({ ...ok, plan: "pro", totalBytes: 0.8 * 1024 ** 3 - 600_000 })).toBeNull();
  });
  it("allowance env override (MB), invalid values fall back to 1 GB", () => {
    expect(allowanceBytes("102400")).toBe(100 * 1024 ** 3);
    expect(allowanceBytes("abc")).toBe(1024 ** 3);
  });
});

describe("storage adapters", () => {
  const U = "11111111-1111-1111-1111-111111111111", T = "22222222-2222-2222-2222-222222222222", F = "33333333-3333-3333-3333-333333333333";
  it("memory: put/get/delete/deletePrefix only removes that user's objects", async () => {
    const s = new MemoryStore();
    await s.put(`${U}/${T}/${F}.png`, bytes(1), "image/png");
    await s.put(`${T}/${T}/${F}.png`, bytes(2), "image/png");
    expect((await s.get(`${U}/${T}/${F}.png`))?.bytes).toEqual(bytes(1));
    expect(await s.deletePrefix(U)).toBe(1);
    expect(s.objects.size).toBe(1);
  });
  it("rejects path traversal and client-made names", async () => {
    const s = new MemoryStore();
    await expect(s.put(`${U}/../${F}.png`, bytes(1), "image/png")).rejects.toThrow();
    await expect(s.put(`${U}/${T}/evil.svg`, bytes(1), "image/png")).rejects.toThrow();
  });
  it("supabase: REST calls carry the key in headers only, sign URLs within 60-300 s, errors never include the key", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const fake = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      if (url.includes("/object/sign/")) return new Response(JSON.stringify({ signedURL: "/object/sign/trade-screenshots/x?token=t" }));
      if (url.includes("/object/list/")) return new Response(JSON.stringify(JSON.parse(String(init.body)).prefix === U ? [{ name: T, id: null }] : [{ name: `${F}.png`, id: "1" }]));
      if (url.includes("fail")) return new Response("no", { status: 500 });
      return new Response("{}");
    }) as unknown as typeof fetch;
    const s = new SupabaseStore("https://proj.supabase.co", "SECRET-KEY", fake);
    await s.put(`${U}/${T}/${F}.png`, bytes(1), "image/png");
    expect(calls[0].url).toBe(`https://proj.supabase.co/storage/v1/object/trade-screenshots/${U}/${T}/${F}.png`);
    expect((calls[0].init.headers as Record<string, string>).authorization).toBe("Bearer SECRET-KEY");
    expect(calls[0].url).not.toContain("SECRET");
    const url = await s.signedUrl(`${U}/${T}/${F}.png`, 9999);
    expect(url).toBe("https://proj.supabase.co/storage/v1/object/sign/trade-screenshots/x?token=t");
    expect(JSON.parse(String(calls[1].init.body))).toEqual({ expiresIn: 300 });
    expect(await s.deletePrefix(U)).toBe(1);
    expect(JSON.parse(String(calls.at(-1)!.init.body))).toEqual({ prefixes: [`${U}/${T}/${F}.png`] });
    const bad = new SupabaseStore("https://fail.supabase.co", "SECRET-KEY", fake);
    await expect(bad.delete([`${U}/${T}/${F}.png`])).rejects.toThrow(/^(?!.*SECRET)/);
  });
  it("getStore: memory only outside Vercel production; Supabase only with both env vars; otherwise not available", () => {
    expect(getStore({ SCREENSHOT_STORAGE: "memory" } as unknown as NodeJS.ProcessEnv)?.kind).toBe("memory");
    expect(getStore({ SCREENSHOT_STORAGE: "memory", VERCEL_ENV: "production" } as unknown as NodeJS.ProcessEnv)).toBeNull();
    expect(getStore({ SUPABASE_URL: "https://x.supabase.co" } as unknown as NodeJS.ProcessEnv)).toBeNull();
    expect(getStore({ SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "k" } as unknown as NodeJS.ProcessEnv)?.kind).toBe("supabase");
  });
});
