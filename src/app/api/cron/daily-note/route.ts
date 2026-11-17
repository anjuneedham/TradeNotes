import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { sendDailyNote } from "@/lib/subscribers";

export const dynamic = "force-dynamic";

/** Vercel Cron calls this daily with `Authorization: Bearer $CRON_SECRET`. Sends today's note (if one is written) to confirmed subscribers. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("authorization") ?? "";
  const want = `Bearer ${secret ?? ""}`;
  const ok = Boolean(secret) && given.length === want.length && timingSafeEqual(Buffer.from(given), Buffer.from(want));
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try { return NextResponse.json(await sendDailyNote()); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 }); }
}
