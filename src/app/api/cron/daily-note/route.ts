import { NextResponse, type NextRequest } from "next/server";
import { cronAuthorized } from "@/lib/reminders";
import { emailEnabled } from "@/lib/email";
import { sendDailyNote } from "@/lib/subscribers";

export const dynamic = "force-dynamic";

/**
 * Daily note sender. Called by the GitHub Actions workflow (.github/workflows/daily-note.yml) with `Authorization: Bearer $CRON_SECRET`.
 * Sends today's note (Jamaica date; nothing if none is written) to confirmed subscribers who have not had it. Idempotent per subscriber,
 * capped per run by NEWSLETTER_BATCH (default 80) to stay inside the email provider's daily limit. The response has counts only.
 */
export async function POST(req: NextRequest) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "not configured" }, { status: 503 });
  if (!cronAuthorized(req.headers.get("authorization"), process.env.CRON_SECRET)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!emailEnabled()) return NextResponse.json({ error: "email not configured" }, { status: 503 });
  try { return NextResponse.json(await sendDailyNote()); }
  catch { return NextResponse.json({ error: "send failed" }, { status: 500 }); }
}
