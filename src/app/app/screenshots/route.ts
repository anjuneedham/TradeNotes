import { randomUUID } from "node:crypto";
import { getAuth } from "@/lib/auth";
import { withUser } from "@/lib/db";
import { effectivePlan } from "@/lib/entitlements";
import { getStore } from "@/lib/storage";
import { sniffImage, stripMetadata, checkUpload, quotaBytes, EXT, MAX_SCREENSHOT_BYTES, type ImageType } from "@/lib/screenshots";
import { sameOrigin } from "@/lib/request-guard";
import { report } from "@/lib/monitor";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Platform storage total is a scan of storage.objects; refresh it at most once a minute per server instance (the 80% stop leaves margin). */
const g = globalThis as unknown as { __tnStorageTotal?: { bytes: number; at: number } };
async function storageTotal(q: (sql: string) => Promise<{ b: string }[]>): Promise<number> {
  const c = g.__tnStorageTotal;
  if (c && Date.now() - c.at < 60_000) return c.bytes;
  const [t] = await q("select tradenotes.storage_used_bytes() as b");
  g.__tnStorageTotal = { bytes: Number(t.b), at: Date.now() };
  return g.__tnStorageTotal.bytes;
}
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/**
 * Upload one screenshot to a trade. Order of checks: same-origin, session, storage configured, trade ownership (row-level
 * security), plan / type / size / per-trade / rate / quota / platform allowance, then store bytes and record the row.
 * The object path is built here; the client's file name is never used.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Forbidden" }, 403);
  const session = await getAuth().api.getSession({ headers: req.headers });
  if (!session) return json({ error: "Not signed in" }, 401);
  const store = getStore();
  if (!store) return json({ error: "Screenshots aren't available yet." }, 503);
  if (Number(req.headers.get("content-length") ?? 0) > MAX_SCREENSHOT_BYTES + 64 * 1024) return json({ error: "Images must be 2 MB or smaller." }, 413);

  let form: FormData;
  try { form = await req.formData(); } catch { return json({ error: "Upload failed. Please try again." }, 400); }
  const tradeId = String(form.get("trade_id") ?? "");
  const file = form.get("file");
  if (!UUID.test(tradeId) || !(file instanceof Blob)) return json({ error: "Trade not found." }, 404);
  if (file.size > MAX_SCREENSHOT_BYTES) return json({ error: "Images must be 2 MB or smaller." }, 413);
  const raw = new Uint8Array(await file.arrayBuffer());
  const type = sniffImage(raw);
  const userId = session.user.id;

  // Read everything needed for the decision under RLS. Another user's trade id simply matches no row.
  const ctx = await withUser(userId, async (q) => {
    const [trade] = await q<{ id: string }>("select id from tradenotes.trades where id = $1", [tradeId]);
    if (!trade) return null;
    const [sub] = await q<{ plan: string; status: string; current_period_end: string | null }>("select plan, status, current_period_end from tradenotes.subscriptions where user_id = $1", [userId]);
    const [u] = await q<{ on_trade: number; user_bytes: string }>(
      "select count(*) filter (where trade_id = $1)::int as on_trade, coalesce(sum(size_bytes), 0)::bigint as user_bytes from tradenotes.trade_screenshots", [tradeId]);
    const [r] = await q<{ n: number }>("select case when shot_window_start > now() - interval '1 hour' then shot_window_count else 0 end as n from tradenotes.profiles where id = $1", [userId]);
    return { plan: effectivePlan(sub ?? null), onTrade: u.on_trade, userBytes: Number(u.user_bytes), lastHour: r?.n ?? 0, totalBytes: await storageTotal(q) };
  });
  if (!ctx) return json({ error: "Trade not found." }, 404);
  const bytes = type ? stripMetadata(raw, type) : raw;
  const refusal = checkUpload({ plan: ctx.plan, size: bytes.length, type, onTrade: ctx.onTrade, userBytes: ctx.userBytes, totalBytes: ctx.totalBytes, lastHour: ctx.lastHour });
  if (refusal) {
    if (refusal.code === "allowance") report(new Error("screenshot storage at 80% of allowance"), "screenshots", { totalBytes: ctx.totalBytes });
    return json({ error: refusal.message, code: refusal.code }, refusal.code === "plan" ? 402 : refusal.code === "rate" ? 429 : 400);
  }

  const path = `${userId}/${tradeId}/${randomUUID()}.${EXT[type as ImageType]}`;
  try { await store.put(path, bytes, type!); }
  catch (e) { report(e, "screenshots"); console.error("screenshot upload failed", e instanceof Error ? e.message : e); return json({ error: "Upload failed. Please try again." }, 502); }
  try {
    const caption = String(form.get("caption") ?? "").trim().slice(0, 500) || null;
    // Insert under a per-user lock and re-check the quota, so parallel uploads cannot overshoot it together.
    // The database trigger enforces 5 per trade and 30 per hour on the same insert.
    const row = await withUser(userId, async (q) => {
      await q("select pg_advisory_xact_lock(hashtext('tn_shots:' || $1))", [userId]);
      const [u] = await q<{ b: string }>("select coalesce(sum(size_bytes), 0)::bigint as b from tradenotes.trade_screenshots");
      if (Number(u.b) + bytes.length > quotaBytes(ctx.plan)) throw new Error("quota exceeded");
      const [r] = await q<{ id: string }>(
        "insert into tradenotes.trade_screenshots (trade_id, user_id, storage_path, size_bytes, content_type, caption) values ($1, $2, $3, $4, $5, $6) returning id",
        [tradeId, userId, path, bytes.length, type, caption]);
      return r;
    });
    if (g.__tnStorageTotal) g.__tnStorageTotal.bytes += bytes.length;
    return json({ id: row.id }, 201);
  } catch (e) {
    await store.delete([path]).catch(() => undefined); // keep storage and rows in step
    const m = e instanceof Error ? e.message : "";
    const msg = /limit reached for this trade/.test(m) ? "A trade can have up to 5 screenshots." : /rate limit/.test(m) ? "You've uploaded a lot of screenshots in the last hour. Please try again later." : /quota/.test(m) ? "You've used your screenshot storage. Delete some screenshots to add more." : "Upload failed. Please try again.";
    return json({ error: msg }, /rate limit/.test(m) ? 429 : 400);
  }
}
