import { describe, it, expect } from "vitest";
import { generateKeyPairSync, sign } from "node:crypto";
import { verifyDiscordSignature, challengeDay, streakFrom, dayInZone, handleInteraction, DISCORD, type Deps, type Interaction } from "./discord";
import { PROMPTS, promptMessage } from "./discord-prompts";
import commands from "./discord-commands.json";

// A throwaway Ed25519 key pair stands in for Discord's.
const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const publicKeyHex = publicKey.export({ type: "spki", format: "der" }).subarray(-32).toString("hex");
const signed = (timestamp: string, body: string, key = privateKey) => sign(null, Buffer.from(timestamp + body), key).toString("hex");
const NOW = Date.parse("2026-12-03T15:00:00Z");

describe("Discord request signature", () => {
  const body = JSON.stringify({ type: 1 });
  const ts = String(Math.floor(NOW / 1000));
  it("accepts a correctly signed, fresh request", () => {
    expect(verifyDiscordSignature({ publicKeyHex, signatureHex: signed(ts, body), timestamp: ts, body, now: NOW })).toBe(true);
  });
  it("rejects a tampered body, a wrong key, a stale timestamp and malformed input", () => {
    const sig = signed(ts, body);
    expect(verifyDiscordSignature({ publicKeyHex, signatureHex: sig, timestamp: ts, body: body + " ", now: NOW })).toBe(false);
    const other = generateKeyPairSync("ed25519");
    expect(verifyDiscordSignature({ publicKeyHex, signatureHex: signed(ts, body, other.privateKey), timestamp: ts, body, now: NOW })).toBe(false);
    expect(verifyDiscordSignature({ publicKeyHex, signatureHex: sig, timestamp: ts, body, now: NOW + 3_600_000 })).toBe(false);
    expect(verifyDiscordSignature({ publicKeyHex, signatureHex: null, timestamp: ts, body, now: NOW })).toBe(false);
    expect(verifyDiscordSignature({ publicKeyHex, signatureHex: "zz", timestamp: ts, body, now: NOW })).toBe(false);
    expect(verifyDiscordSignature({ publicKeyHex: "abc", signatureHex: sig, timestamp: ts, body, now: NOW })).toBe(false);
    expect(verifyDiscordSignature({ publicKeyHex, signatureHex: sig, timestamp: "not-a-number", body, now: NOW })).toBe(false);
  });
});

describe("Challenge calendar", () => {
  it("has 30 unique days with text that fits one Discord message", () => {
    expect(PROMPTS).toHaveLength(30);
    expect(new Set(PROMPTS.map((p) => p.day)).size).toBe(30);
    for (const p of PROMPTS) { expect(p.text.length).toBeGreaterThan(20); expect(promptMessage(p.day)!.length).toBeLessThan(1800); }
    expect(PROMPTS[0].week).toBe(1); expect(PROMPTS[6].week).toBe(1); expect(PROMPTS[7].week).toBe(2); expect(PROMPTS[27].week).toBe(4); expect(PROMPTS[29].theme).toBe("Graduate");
    expect(promptMessage(31)).toBeNull();
  });
  it("maps dates to Challenge days in the Jamaica time zone", () => {
    expect(challengeDay(new Date("2026-12-01T12:00:00Z"))).toBe(1);       // 07:00 in Jamaica on 1 Dec
    expect(challengeDay(new Date("2026-12-01T03:00:00Z"))).toBeNull();    // still 30 Nov 22:00 in Jamaica
    expect(challengeDay(new Date("2026-12-30T12:00:00Z"))).toBe(30);
    expect(challengeDay(new Date("2026-12-31T12:00:00Z"))).toBeNull();
    expect(challengeDay(new Date("2026-11-14T12:00:00Z"))).toBeNull();
    expect(dayInZone(new Date("2026-12-01T03:00:00Z"))).toBe("2026-11-30");
  });
});

describe("streaks", () => {
  it("counts consecutive days ending today, or yesterday if today is not checked in", () => {
    expect(streakFrom([], "2026-12-05")).toBe(0);
    expect(streakFrom(["2026-12-05", "2026-12-04", "2026-12-03"], "2026-12-05")).toBe(3);
    expect(streakFrom(["2026-12-04", "2026-12-03"], "2026-12-05")).toBe(2);
    expect(streakFrom(["2026-12-03"], "2026-12-05")).toBe(0);
    expect(streakFrom(["2026-12-05", "2026-12-03", "2026-12-02"], "2026-12-05")).toBe(1);
    expect(streakFrom(["2026-12-01", "2026-11-30", "2026-11-29"], "2026-12-01")).toBe(3);   // across a month boundary
  });
});

describe("slash command handler", () => {
  const saved: unknown[] = [];
  let days: string[] = [];
  let forgotten = 0;
  const deps = (over: Partial<Deps> = {}): Deps => ({
    saveCheckin: async (c) => { saved.push(c); days = [...new Set([c.day, ...days])]; },
    checkinDays: async () => days,
    forget: async () => { forgotten++; const n = days.length; days = []; return n; },
    guildId: "1571190560965009540",
    siteUrl: "https://tradenotes.dev",
    ...over,
  });
  const base = (data: Interaction["data"], type = 2, extra: Partial<Interaction> = {}): Interaction => ({ type, guild_id: "1571190560965009540", member: { user: { id: "111111111111111111" } }, data, ...extra });
  const when = new Date("2026-12-03T15:00:00Z");

  it("answers Discord's PING", async () => { expect(await handleInteraction({ type: 1 }, deps())).toEqual({ type: 1 }); });

  it("/checkin saves once per day, replies publicly without pinging anyone, and shows the streak", async () => {
    days = ["2026-12-02", "2026-12-01"]; saved.length = 0;
    const r = await handleInteraction(base({ name: "checkin", options: [{ name: "followed", value: "partly" }, { name: "mistake", value: "Revenge trade" }, { name: "note", value: "Moved on  too fast\n@everyone" }] }), deps(), when);
    expect(saved).toEqual([{ userId: "111111111111111111", day: "2026-12-03", followed: "partly", mistake: "Revenge trade", note: "Moved on too fast @everyone" }]);
    expect(r.data?.content).toContain("followed plan: **partly**");
    expect(r.data?.content).toContain("streak: **3** days");
    expect(r.data?.flags).toBeUndefined();
    expect(r.data?.allowed_mentions).toEqual({ parse: [] });
  });
  it("/checkin treats 'None today' as no mistake and rejects bad input without saving", async () => {
    saved.length = 0; days = [];
    await handleInteraction(base({ name: "checkin", options: [{ name: "followed", value: "yes" }, { name: "mistake", value: "None today" }] }), deps(), when);
    expect((saved[0] as { mistake: unknown }).mistake).toBeNull();
    saved.length = 0;
    const bad = await handleInteraction(base({ name: "checkin", options: [{ name: "followed", value: "maybe" }] }), deps(), when);
    expect(saved).toHaveLength(0); expect(bad.data?.flags).toBe(64);
    const badMistake = await handleInteraction(base({ name: "checkin", options: [{ name: "followed", value: "yes" }, { name: "mistake", value: "x".repeat(500) }] }), deps(), when);
    expect(saved).toHaveLength(0); expect(badMistake.data?.flags).toBe(64);
  });
  it("/streak, /rules and /tradenotes reply privately", async () => {
    days = ["2026-12-03", "2026-12-02"];
    const s = await handleInteraction(base({ name: "streak" }), deps(), when);
    expect(s.data?.content).toContain("**2** days"); expect(s.data?.flags).toBe(64);
    const r = await handleInteraction(base({ name: "rules" }), deps(), when);
    expect(r.data?.content).toContain("no signals"); expect(r.data?.flags).toBe(64);
    const t = await handleInteraction(base({ name: "tradenotes" }), deps(), when);
    expect(t.data?.content).toContain("https://tradenotes.dev/?src=discord"); expect(t.data?.flags).toBe(64);
  });
  it("/plan opens a form and its submission posts the plan", async () => {
    const m = await handleInteraction(base({ name: "plan" }), deps(), when);
    expect(m.type).toBe(9); expect((m.data as { custom_id: string }).custom_id).toBe("plan_modal");
    const submit = await handleInteraction(base({ custom_id: "plan_modal", components: [
      { components: [{ custom_id: "setup", value: "London breakout" }] }, { components: [{ custom_id: "risk", value: "1% of account" }] }, { components: [{ custom_id: "wrong", value: "close below 1.0850" }] },
    ] }, 5), deps(), when);
    expect(submit.data?.content).toContain("London breakout"); expect(submit.data?.content).toContain("1% of account"); expect(submit.data?.content).toContain("close below 1.0850");
    const empty = await handleInteraction(base({ custom_id: "plan_modal", components: [{ components: [{ custom_id: "setup", value: " " }] }] }, 5), deps(), when);
    expect(empty.data?.flags).toBe(64);
  });
  it("/forgetme deletes the member's data", async () => {
    days = ["2026-12-03", "2026-12-02"]; forgotten = 0;
    const r = await handleInteraction(base({ name: "forgetme" }), deps(), when);
    expect(forgotten).toBe(1); expect(r.data?.content).toContain("deleted 2"); expect(r.data?.flags).toBe(64);
  });
  it("refuses other servers, missing users and unknown commands", async () => {
    expect((await handleInteraction(base({ name: "streak" }, 2, { guild_id: "999999999999999999" }), deps(), when)).data?.content).toContain("only works");
    expect((await handleInteraction({ type: 2, guild_id: "1571190560965009540", data: { name: "streak" } }, deps(), when)).data?.flags).toBe(64);
    expect((await handleInteraction(base({ name: "nope" }), deps(), when)).data?.content).toContain("don't know");
  });
});

describe("command definitions", () => {
  it("follow Discord's limits and cover every handled command", () => {
    expect(commands.map((c) => c.name).sort()).toEqual(["checkin", "forgetme", "plan", "rules", "streak", "tradenotes"]);
    for (const c of commands) {
      expect(c.name).toMatch(/^[a-z0-9_-]{1,32}$/); expect(c.description.length).toBeLessThanOrEqual(100);
      for (const o of ("options" in c ? c.options : []) as { description: string; choices?: unknown[]; max_length?: number }[]) {
        expect(o.description.length).toBeLessThanOrEqual(100); expect((o.choices ?? []).length).toBeLessThanOrEqual(25);
        if (o.max_length) expect(o.max_length).toBeLessThanOrEqual(DISCORD.maxNote);
      }
    }
  });
});
