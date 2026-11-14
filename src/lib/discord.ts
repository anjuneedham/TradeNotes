import { createPublicKey, verify } from "node:crypto";
import { FOOTER } from "./discord-prompts";

/** Community settings. Education and process only (docs/DISCORD_COMMUNITY_PLAN.md). */
export const DISCORD = {
  challengeStart: "2026-12-01",
  challengeDays: 30,
  tz: "America/Jamaica",
  maxNote: 280,
  maxPlanField: 200,
} as const;

// ---- request authenticity -------------------------------------------------------------------------------------------
const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

/**
 * Discord signs every interaction with Ed25519: signature over (timestamp + raw body), verified with the application's public key.
 * Also rejects timestamps more than `toleranceSec` (default 10 minutes) away from now, so a captured request cannot be replayed later.
 */
export function verifyDiscordSignature(o: { publicKeyHex: string; signatureHex: string | null; timestamp: string | null; body: string; now?: number; toleranceSec?: number }): boolean {
  try {
    if (!o.signatureHex || !o.timestamp) return false;
    if (!/^[0-9a-f]{64}$/i.test(o.publicKeyHex) || !/^[0-9a-f]{128}$/i.test(o.signatureHex)) return false;
    const ts = Number(o.timestamp);
    if (!Number.isFinite(ts)) return false;
    if (Math.abs((o.now ?? Date.now()) / 1000 - ts) > (o.toleranceSec ?? 600)) return false;
    const key = createPublicKey({ key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(o.publicKeyHex, "hex")]), format: "der", type: "spki" });
    return verify(null, Buffer.from(o.timestamp + o.body), key, Buffer.from(o.signatureHex, "hex"));
  } catch {
    return false;
  }
}

// ---- days and streaks -----------------------------------------------------------------------------------------------
/** YYYY-MM-DD in the community's time zone. */
export const dayInZone = (d: Date, tz: string = DISCORD.tz): string =>
  new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

const prevDay = (s: string) => new Date(Date.parse(`${s}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

/** 1..30 inside the Challenge window (in the community time zone), otherwise null. */
export function challengeDay(d: Date): number | null {
  const diff = Math.round((Date.parse(`${dayInZone(d)}T00:00:00Z`) - Date.parse(`${DISCORD.challengeStart}T00:00:00Z`)) / 86_400_000) + 1;
  return diff >= 1 && diff <= DISCORD.challengeDays ? diff : null;
}

/** Consecutive check-in days ending today, or ending yesterday if today is not checked in yet. */
export function streakFrom(days: readonly string[], today: string): number {
  const set = new Set(days);
  let cursor = set.has(today) ? today : prevDay(today);
  let n = 0;
  while (set.has(cursor)) { n++; cursor = prevDay(cursor); }
  return n;
}

// ---- interactions ---------------------------------------------------------------------------------------------------
export interface Interaction {
  type: number;
  guild_id?: string;
  channel_id?: string;
  member?: { user?: { id?: string } };
  user?: { id?: string };
  data?: {
    name?: string;
    custom_id?: string;
    options?: { name: string; value?: string | number | boolean }[];
    components?: { components?: { custom_id?: string; value?: string }[] }[];
  };
}
export interface InteractionResponse { type: number; data?: Record<string, unknown> }
export interface Deps {
  saveCheckin(c: { userId: string; day: string; followed: string; mistake: string | null; note: string | null }): Promise<void>;
  checkinDays(userId: string): Promise<string[]>;
  forget(userId: string): Promise<number>;
  guildId?: string;
  siteUrl: string;
}

const PING = 1, COMMAND = 2, MODAL_SUBMIT = 5;
const EPHEMERAL = 64;
const NO_MENTIONS = { parse: [] as string[] };
const FOLLOWED = new Set(["yes", "partly", "no"]);
const MISTAKES = new Set(["None today", "Moved my stop", "Revenge trade", "Oversized", "Entered early", "Chased a move", "FOMO", "Broke a rule", "Overtraded"]);

export const RULES_TEXT = [
  "**Community rules**",
  "1. Education and process only: no signals, no trade calls, no financial advice.",
  "2. No profit or loss screenshots and no income claims.",
  "3. No unsolicited DMs and no promotion.",
  "4. Be kind. Critique habits, not people.",
  "5. Share only your own data, and only if you want to.",
  "6. No links from new members.",
  "7. Moderators may remove anything. Repeat issues mean removal.",
  "8. Trading is risky. Nothing here is a promise of results.",
].join("\n");

const say = (content: string, o: { private?: boolean } = {}): InteractionResponse => ({
  type: 4,
  data: { content, allowed_mentions: NO_MENTIONS, ...(o.private ? { flags: EPHEMERAL } : {}) },
});
const oneLine = (s: string, max: number) => s.replace(/\s+/g, " ").trim().slice(0, max);
const opt = (i: Interaction, name: string) => i.data?.options?.find((o) => o.name === name)?.value;
const modalValue = (i: Interaction, id: string) => i.data?.components?.flatMap((r) => r.components ?? []).find((c) => c.custom_id === id)?.value ?? "";

/** Handles one verified Discord interaction. Pure apart from the injected store, so it is tested without Discord. */
export async function handleInteraction(i: Interaction, deps: Deps, now: Date = new Date()): Promise<InteractionResponse> {
  if (i.type === PING) return { type: 1 };
  if (deps.guildId && i.guild_id !== deps.guildId) return say("This bot only works in the TradeNotes community server.", { private: true });
  const userId = i.member?.user?.id ?? i.user?.id;
  if (!userId || !/^[0-9]{5,25}$/.test(userId)) return say("I couldn't tell who you are. Please try again in the server.", { private: true });
  const today = dayInZone(now);

  if (i.type === MODAL_SUBMIT && i.data?.custom_id === "plan_modal") {
    const setup = oneLine(modalValue(i, "setup"), DISCORD.maxPlanField);
    const risk = oneLine(modalValue(i, "risk"), DISCORD.maxPlanField);
    const wrong = oneLine(modalValue(i, "wrong"), DISCORD.maxPlanField);
    if (!setup || !risk || !wrong) return say("Please fill in all three lines of your plan.", { private: true });
    return say(`**Pre-session plan** · <@${userId}>\n• Setup: ${setup}\n• Risk per trade: ${risk}\n• I am wrong if: ${wrong}\n${FOOTER}`);
  }

  if (i.type !== COMMAND) return say("I don't know how to handle that yet.", { private: true });

  switch (i.data?.name) {
    case "checkin": {
      const followed = String(opt(i, "followed") ?? "");
      if (!FOLLOWED.has(followed)) return say("Please choose Yes, Partly or No for 'followed'.", { private: true });
      const rawMistake = opt(i, "mistake");
      const mistakeStr = typeof rawMistake === "string" ? rawMistake : "";
      if (mistakeStr && !MISTAKES.has(mistakeStr)) return say("Please pick a mistake from the list.", { private: true });
      const mistake = mistakeStr && mistakeStr !== "None today" ? mistakeStr : null;
      const rawNote = opt(i, "note");
      const note = typeof rawNote === "string" && oneLine(rawNote, DISCORD.maxNote) ? oneLine(rawNote, DISCORD.maxNote) : null;
      await deps.saveCheckin({ userId, day: today, followed, mistake, note });
      const streak = streakFrom(await deps.checkinDays(userId), today);
      const parts = [`**Check-in** · <@${userId}>`, `followed plan: **${followed}**`, ...(mistake ? [`mistake: **${mistake}**`] : []), `streak: **${streak}** day${streak === 1 ? "" : "s"}`];
      return say(parts.join(" · ") + (note ? `\n> ${note}` : ""));
    }
    case "streak": {
      const days = await deps.checkinDays(userId);
      const streak = streakFrom(days, today);
      return say(`Your streak: **${streak}** day${streak === 1 ? "" : "s"}. Total check-ins: **${days.length}**. Miss a day and keep going; the goal is the habit, not perfection.`, { private: true });
    }
    case "plan":
      return {
        type: 9,
        data: {
          custom_id: "plan_modal",
          title: "Pre-session plan",
          components: [
            { type: 1, components: [{ type: 4, custom_id: "setup", label: "Your setup", style: 1, required: true, max_length: DISCORD.maxPlanField }] },
            { type: 1, components: [{ type: 4, custom_id: "risk", label: "Risk per trade", style: 1, required: true, max_length: DISCORD.maxPlanField }] },
            { type: 1, components: [{ type: 4, custom_id: "wrong", label: "Where you are wrong", style: 1, required: true, max_length: DISCORD.maxPlanField }] },
          ],
        },
      };
    case "rules":
      return say(RULES_TEXT, { private: true });
    case "tradenotes":
      return say(`Your free trading journal: ${deps.siteUrl}/?src=discord\n${FOOTER}`, { private: true });
    case "forgetme": {
      const n = await deps.forget(userId);
      return say(n > 0 ? `Done. I deleted ${n} stored check-in${n === 1 ? "" : "s"}.` : "You had no stored check-ins, so there is nothing to delete.", { private: true });
    }
    default:
      return say("I don't know that command.", { private: true });
  }
}
