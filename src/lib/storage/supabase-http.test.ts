import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "node:http";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { SupabaseStore, BUCKET } from "./index";

/**
 * The Supabase adapter exercised over REAL HTTP (a real socket, real headers and JSON bodies) against a small local emulation of the Storage REST API.
 * This closes the gap of "only tested with a pretend fetch". It does NOT prove the real Supabase service behaves the same: the emulation encodes the
 * documented behaviour (folders come back from `list` with `id: null`, delete takes `{prefixes: [...]}`, signing returns a relative `signedURL`).
 * The real service still needs the owner's bucket and one live check (docs/OWNER_SETUP_STORAGE.md).
 */
const KEY = "service-role-key-for-test";
const files = new Map<string, Buffer>();
const seen: { method: string; url: string; auth: string | undefined; apikey: string | undefined }[] = [];
let server: http.Server; let base = "";

const body = (req: http.IncomingMessage) => new Promise<Buffer>((res) => { const c: Buffer[] = []; req.on("data", (d) => c.push(d)); req.on("end", () => res(Buffer.concat(c))); });
beforeAll(async () => {
  server = http.createServer(async (req, res) => {
    const url = decodeURIComponent(req.url ?? "");
    seen.push({ method: req.method ?? "", url, auth: req.headers.authorization, apikey: req.headers.apikey as string | undefined });
    const send = (status: number, data: unknown, type = "application/json") => { res.writeHead(status, { "content-type": type }); res.end(typeof data === "string" || Buffer.isBuffer(data) ? data : JSON.stringify(data)); };
    if (req.headers.authorization !== `Bearer ${KEY}` || req.headers.apikey !== KEY) return send(401, { message: "unauthorized" });
    const b = await body(req);
    const prefix = `/storage/v1/object/${BUCKET}/`;
    if (req.method === "POST" && url.startsWith(prefix)) {
      const path = url.slice(prefix.length);
      if (files.has(path) && req.headers["x-upsert"] !== "true") return send(409, { message: "exists" });
      files.set(path, b); return send(200, { Key: `${BUCKET}/${path}` });
    }
    if (req.method === "POST" && url === `/storage/v1/object/list/${BUCKET}`) {
      const { prefix: p, limit, offset } = JSON.parse(b.toString());
      const dir = p ? `${p}/` : "";
      const kids = new Map<string, boolean>(); // immediate child name -> is a folder
      for (const k of files.keys()) if (k.startsWith(dir)) { const rest = k.slice(dir.length); const i = rest.indexOf("/"); kids.set(i === -1 ? rest : rest.slice(0, i), i !== -1); }
      return send(200, [...kids].slice(offset, offset + limit).map(([name, folder]) => ({ name, id: folder ? null : randomUUID() })));
    }
    if (req.method === "DELETE" && url === `/storage/v1/object/${BUCKET}`) { for (const k of JSON.parse(b.toString()).prefixes) files.delete(k); return send(200, []); }
    if (req.method === "POST" && url.startsWith(`/storage/v1/object/sign/${BUCKET}/`)) return send(200, { signedURL: `/object/sign/${BUCKET}/${url.split(`/sign/${BUCKET}/`)[1]}?token=abc` });
    if (req.method === "GET" && url.startsWith(`/storage/v1/object/authenticated/${BUCKET}/`)) { const f = files.get(url.split(`/authenticated/${BUCKET}/`)[1]); return f ? send(200, f, "image/png") : send(404, { message: "not found" }); }
    send(404, { message: "no such route" });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((r) => server.close(() => r())));

describe("SupabaseStore over real HTTP (local emulation of the Storage API)", () => {
  const U = randomUUID(), V = randomUUID(), T = randomUUID(), BT = randomUUID();
  const png = (n: number) => new Uint8Array([0x89, 0x50, 0x4e, 0x47, n]);
  const real = () => `${U}/${T}/${randomUUID()}.png`;
  const hyp = () => `${U}/backtest/${BT}/${randomUUID()}.webp`;

  it("stores, reads and signs both kinds of path; the service key travels in headers only, never in a URL", async () => {
    const s = new SupabaseStore(base, KEY);
    const a = real(), b = hyp();
    await s.put(a, png(1), "image/png"); await s.put(b, png(2), "image/webp");
    expect([...(await s.get(a))!.bytes]).toEqual([...png(1)]);
    expect([...(await s.get(b))!.bytes]).toEqual([...png(2)]);
    const url = await s.signedUrl(b, 120);
    expect(url).toBe(`${base}/storage/v1/object/sign/${BUCKET}/${b}?token=abc`);
    for (const r of seen) { expect(r.auth).toBe(`Bearer ${KEY}`); expect(r.apikey).toBe(KEY); expect(r.url).not.toContain(KEY); }
  });

  it("account deletion (deletePrefix) removes the user's real-trade AND backtest screenshots, three folders deep, and nothing of another user's", async () => {
    const s = new SupabaseStore(base, KEY);
    files.clear();
    const mine = [real(), real(), hyp(), hyp(), hyp()];
    const theirs = `${V}/${T}/${randomUUID()}.png`, theirsHyp = `${V}/backtest/${BT}/${randomUUID()}.png`;
    for (const p of [...mine, theirs, theirsHyp]) await s.put(p, png(3), "image/png");
    expect(await s.deletePrefix(U)).toBe(5);
    expect([...files.keys()].sort()).toEqual([theirs, theirsHyp].sort());
  });

  it("refuses a wrong key without leaking it, and never sends a path that is not <user>/<trade>/<file> or <user>/backtest/<id>/<file>", async () => {
    const bad = new SupabaseStore(base, "wrong-key");
    await expect(bad.put(real(), png(1), "image/png")).rejects.toThrow(/401/);
    await expect(bad.put(real(), png(1), "image/png")).rejects.toThrow(/^(?!.*wrong-key)/);
    const s = new SupabaseStore(base, KEY);
    for (const evil of [`${U}/../${V}/x.png`, `${U}/backtests/${BT}/${randomUUID()}.png`, `${U}/${T}/evil.svg`, `${U}/backtest/${BT}/../../x.png`, "x"]) await expect(s.put(evil, png(1), "image/png")).rejects.toThrow();
    const before = files.size; await expect(s.delete([`${U}/../${V}`])).rejects.toThrow(); expect(files.size).toBe(before);
  });
});
