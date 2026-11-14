import { NextResponse, type NextRequest } from "next/server";
import { handleInteraction, verifyDiscordSignature, type Interaction } from "@/lib/discord";
import { saveCheckin, checkinDays, forget } from "@/lib/discord-store";
import { report } from "@/lib/monitor";

export const dynamic = "force-dynamic";
const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? process.env.BETTER_AUTH_URL ?? "https://tradenotes.dev";

/**
 * Discord slash commands arrive here (set this URL as "Interactions Endpoint URL" in the Developer Portal).
 * Every request must carry a valid Ed25519 signature from Discord, or it is rejected before anything else runs.
 */
export async function POST(req: NextRequest) {
  const publicKey = process.env.DISCORD_PUBLIC_KEY;
  if (!publicKey) return NextResponse.json({ error: "not configured" }, { status: 503 });
  const body = await req.text();
  const ok = verifyDiscordSignature({ publicKeyHex: publicKey, signatureHex: req.headers.get("x-signature-ed25519"), timestamp: req.headers.get("x-signature-timestamp"), body });
  if (!ok) return new NextResponse("invalid request signature", { status: 401 });

  let interaction: Interaction;
  try { interaction = JSON.parse(body) as Interaction; } catch { return new NextResponse("bad request", { status: 400 }); }

  try {
    const res = await handleInteraction(interaction, { saveCheckin, checkinDays, forget, guildId: process.env.DISCORD_GUILD_ID, siteUrl: site() });
    return NextResponse.json(res);
  } catch (e) {
    report(e, "discord", {});
    return NextResponse.json({ type: 4, data: { content: "Something went wrong on our side. Please try again in a moment.", flags: 64 } });
  }
}
