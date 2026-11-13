import { getAuth } from "@/lib/auth";
import { withUser } from "@/lib/db";
import { getStore, SIGNED_URL_TTL } from "@/lib/storage";
import { removeObjects } from "@/lib/storage/cleanup";
import { sameOrigin } from "@/lib/request-guard";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOT_FOUND = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

/** Look up a screenshot row as the signed-in user. Row-level security: another user's id (guessed or not) finds nothing. */
async function own(req: Request, id: string) {
  if (!UUID.test(id)) return null;
  const session = await getAuth().api.getSession({ headers: req.headers });
  if (!session) return null;
  const [row] = await withUser(session.user.id, (q) => q<{ storage_path: string; content_type: string }>("select storage_path, content_type from tradenotes.trade_screenshots where id = $1", [id]));
  return row ? { userId: session.user.id, ...row } : null;
}

/** View: redirect to a short-lived signed URL (Supabase) or stream the bytes (memory store in tests). Never cached publicly. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const row = await own(req, (await params).id);
  const store = getStore();
  if (!row || !store) return NOT_FOUND();
  const url = await store.signedUrl(row.storage_path, SIGNED_URL_TTL);
  if (url) return new Response(null, { status: 302, headers: { Location: url, "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
  const obj = await store.get(row.storage_path);
  if (!obj) return NOT_FOUND();
  return new Response(obj.bytes as unknown as BodyInit, { headers: { "Content-Type": row.content_type, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox" } });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return new Response("Forbidden", { status: 403 });
  const id = (await params).id;
  const row = await own(req, id);
  if (!row) return NOT_FOUND();
  await withUser(row.userId, (q) => q("delete from tradenotes.trade_screenshots where id = $1", [id]));
  await removeObjects([row.storage_path]);
  return new Response(null, { status: 204 });
}
