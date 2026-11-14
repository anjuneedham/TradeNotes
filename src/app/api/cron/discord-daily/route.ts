import { NextResponse, type NextRequest } from "next/server";
import { challengeDay, DISCORD } from "@/lib/discord";
import { promptMessage } from "@/lib/discord-prompts";
import { cronAuthorized } from "@/lib/reminders";
import { report } from "@/lib/monitor";

export const dynamic = "force-dynamic";

/**
 * Posts today's Journal Challenge prompt to the #daily-prompt channel webhook. Called once a day by the GitHub Actions workflow
 * (.github/workflows/discord-daily.yml) with `Authorization: Bearer $DISCORD_CRON_SECRET`. Outside the Challenge window it posts nothing.
 * `?dry=1` returns the message without posting it (to check the setup); `?day=N` picks a specific day. The response never contains the webhook URL.
 */
export async function POST(req: NextRequest) {
  // Its own secret (not CRON_SECRET), so enabling Discord posts cannot switch on the unfinished review-reminder emails.
  if (!process.env.DISCORD_CRON_SECRET) return NextResponse.json({ error: "not configured" }, { status: 503 });
  if (!cronAuthorized(req.headers.get("authorization"), process.env.DISCORD_CRON_SECRET)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // `?day=N` (1-30) re-sends a specific day, for example one that was missed. Authorised callers only (the check above).
  const forced = Number(req.nextUrl.searchParams.get("day"));
  const day = Number.isInteger(forced) && forced >= 1 && forced <= DISCORD.challengeDays ? forced : challengeDay(new Date());
  const content = day ? promptMessage(day) : null;
  if (!day || !content) return NextResponse.json({ posted: false, reason: `outside the ${DISCORD.challengeDays}-day Challenge window` });
  if (req.nextUrl.searchParams.get("dry") === "1") return NextResponse.json({ posted: false, dryRun: true, day, content });

  const hook = process.env.DISCORD_DAILY_WEBHOOK;
  if (!hook) return NextResponse.json({ error: "webhook not configured" }, { status: 503 });
  try {
    const res = await fetch(hook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content, allowed_mentions: { parse: [] } }) });
    if (!res.ok) throw new Error(`Discord webhook returned ${res.status}`);
    return NextResponse.json({ posted: true, day });
  } catch (e) {
    report(e, "discord-daily", { day });
    return NextResponse.json({ error: "post failed" }, { status: 502 });
  }
}
