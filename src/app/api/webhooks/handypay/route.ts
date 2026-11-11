import { handleWebhook } from "@/lib/billing/webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** HandyPay webhook. The raw body is read as text BEFORE parsing: the signature covers the exact bytes sent. */
export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > 512 * 1024) return Response.json({ ok: false, outcome: "too large" }, { status: 413 });
  const r = await handleWebhook(raw, req.headers.get("x-handypay-signature"));
  return Response.json(r.body, { status: r.status });
}
