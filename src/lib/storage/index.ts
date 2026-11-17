/**
 * Object storage for trade screenshots, behind one small interface so unit tests, e2e and CI never need a Supabase account.
 * - Supabase adapter: Storage REST API with the service-role key (server only; never sent to the browser, never logged).
 * - Memory adapter: in-process Map, for tests and local e2e (SCREENSHOT_STORAGE=memory). Refused on Vercel production.
 * Paths are always "<user_id>/<trade_id>/<uuid>.<ext>" (real trades) or "<user_id>/backtest/<backtest_id>/<uuid>.<ext>" (hypothetical trades), built on the server.
 */
export interface ObjectStore {
  readonly kind: "supabase" | "memory";
  put(path: string, bytes: Uint8Array, contentType: string): Promise<void>;
  delete(paths: string[]): Promise<void>;
  /** Short-lived URL for viewing (Supabase), or null when the caller must stream bytes via `get` (memory). */
  signedUrl(path: string, ttlSeconds: number): Promise<string | null>;
  get(path: string): Promise<{ bytes: Uint8Array; contentType: string } | null>;
  /** Delete every object under "<prefix>/" (account deletion). Returns the number deleted. */
  deletePrefix(prefix: string): Promise<number>;
}

export const BUCKET = "trade-screenshots";
export const SIGNED_URL_TTL = 120;
const PATH = /^[0-9a-f-]{36}(\/(backtest\/)?[0-9a-f-]{36}(\/[0-9a-f-]{36}\.(png|jpg|webp))?)?$/;
const assertPath = (p: string) => { if (!PATH.test(p)) throw new Error("invalid object path"); };

export class MemoryStore implements ObjectStore {
  readonly kind = "memory" as const;
  readonly objects = new Map<string, { bytes: Uint8Array; contentType: string }>();
  async put(path: string, bytes: Uint8Array, contentType: string) { assertPath(path); this.objects.set(path, { bytes, contentType }); }
  async delete(paths: string[]) { for (const p of paths) this.objects.delete(p); }
  async signedUrl() { return null; }
  async get(path: string) { return this.objects.get(path) ?? null; }
  async deletePrefix(prefix: string) {
    assertPath(prefix);
    let n = 0;
    for (const k of [...this.objects.keys()]) if (k.startsWith(prefix + "/")) { this.objects.delete(k); n++; }
    return n;
  }
}

export class SupabaseStore implements ObjectStore {
  readonly kind = "supabase" as const;
  constructor(private url: string, private key: string, private fetcher: typeof fetch = fetch) {}
  private async call(path: string, init: RequestInit & { json?: unknown } = {}) {
    const headers: Record<string, string> = { authorization: `Bearer ${this.key}`, apikey: this.key, ...(init.headers as Record<string, string>) };
    let body = init.body;
    if (init.json !== undefined) { headers["content-type"] = "application/json"; body = JSON.stringify(init.json); }
    const res = await this.fetcher(`${this.url.replace(/\/$/, "")}/storage/v1${path}`, { ...init, headers, body, cache: "no-store" });
    if (!res.ok) throw new Error(`storage ${init.method ?? "GET"} ${path.split("/").slice(0, 3).join("/")} failed: ${res.status}`); // no key, no full path in errors
    return res;
  }
  async put(path: string, bytes: Uint8Array, contentType: string) {
    assertPath(path);
    await this.call(`/object/${BUCKET}/${path}`, { method: "POST", body: bytes as unknown as BodyInit, headers: { "content-type": contentType, "x-upsert": "false", "cache-control": "private, max-age=0" } });
  }
  async delete(paths: string[]) {
    paths.forEach(assertPath);
    for (let i = 0; i < paths.length; i += 100) await this.call(`/object/${BUCKET}`, { method: "DELETE", json: { prefixes: paths.slice(i, i + 100) } });
  }
  async signedUrl(path: string, ttlSeconds: number) {
    assertPath(path);
    const res = await this.call(`/object/sign/${BUCKET}/${path}`, { method: "POST", json: { expiresIn: Math.min(300, Math.max(60, ttlSeconds)) } });
    const j = (await res.json()) as { signedURL?: string; signedUrl?: string };
    const rel = j.signedURL ?? j.signedUrl;
    if (!rel) throw new Error("storage sign: no url");
    return `${this.url.replace(/\/$/, "")}/storage/v1${rel.startsWith("/") ? rel : "/" + rel}`;
  }
  async get(path: string) {
    assertPath(path);
    const res = await this.call(`/object/authenticated/${BUCKET}/${path}`);
    return { bytes: new Uint8Array(await res.arrayBuffer()), contentType: res.headers.get("content-type") ?? "application/octet-stream" };
  }
  private async list(prefix: string): Promise<{ name: string; id: string | null }[]> {
    const out: { name: string; id: string | null }[] = [];
    for (let offset = 0; ; offset += 1000) {
      const res = await this.call(`/object/list/${BUCKET}`, { method: "POST", json: { prefix, limit: 1000, offset } });
      const page = (await res.json()) as { name: string; id: string | null }[];
      out.push(...page);
      if (page.length < 1000) return out;
    }
  }
  async deletePrefix(prefix: string) {
    assertPath(prefix);
    const files: string[] = [];
    // Walk the folders below the prefix (<user>/<trade>/<file> and <user>/backtest/<id>/<file>: at most 3 levels), collecting every object.
    const walk = async (dir: string, depth: number) => {
      for (const e of await this.list(dir)) {
        if (e.id) files.push(`${dir}/${e.name}`);
        else if (depth < 3) await walk(`${dir}/${e.name}`, depth + 1);
      }
    };
    await walk(prefix, 1);
    if (files.length) await this.delete(files.filter((f) => PATH.test(f)));
    return files.length;
  }
}

const g = globalThis as unknown as { __tnMemStore?: MemoryStore };
/** The configured store, or null when screenshots are not set up yet (UI shows "not available yet"; the rest of the app works). */
export function getStore(env: NodeJS.ProcessEnv = process.env): ObjectStore | null {
  if (env.SCREENSHOT_STORAGE === "memory") {
    if (env.VERCEL_ENV === "production") { console.error("SCREENSHOT_STORAGE=memory is ignored in production"); return null; }
    return (g.__tnMemStore ??= new MemoryStore());
  }
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) return new SupabaseStore(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  return null;
}
