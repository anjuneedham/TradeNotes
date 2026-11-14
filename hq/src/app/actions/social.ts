"use server";
import { guarded, int, num, opt, str, uuid } from "@/lib/flash";
import { q } from "@/lib/db";

const PL = ["tiktok", "youtube", "instagram"];
export async function saveAccount(fd: FormData) {
  return guarded("/social", async () => {
    const pl = str(fd, "platform"); if (!PL.includes(pl)) throw new Error("Unknown platform.");
    await q(`insert into hq.social_accounts (platform, handle, profile_url, updated_at) values ($1,$2,$3,now()) on conflict (platform) do update set handle=excluded.handle, profile_url=excluded.profile_url, updated_at=now()`, [pl, opt(fd, "handle"), opt(fd, "profile_url")]);
  });
}
export async function logFollowers(fd: FormData) {
  return guarded("/social", async () => {
    const pl = str(fd, "platform"); if (!PL.includes(pl)) throw new Error("Unknown platform.");
    const n = num(fd, "followers"); if (n === null || n < 0) throw new Error("Enter the follower count shown in the app.");
    await q(`insert into hq.follower_snapshots (platform, day, followers) values ($1, $2::date, $3) on conflict (platform, day) do update set followers = excluded.followers`, [pl, str(fd, "day"), Math.round(n)]);
  });
}
export async function logAd(fd: FormData) {
  return guarded("/social", async () => {
    const pl = str(fd, "platform"); if (!["instagram", "tiktok", "other"].includes(pl)) throw new Error("Unknown platform.");
    const spend = num(fd, "spend"); if (spend === null || spend < 0) throw new Error("Enter the amount spent (from the ad manager).");
    await q(`insert into hq.ad_spend (day, platform, spend, impressions, clicks, note) values ($1::date,$2,$3,$4,$5,$6) on conflict (day, platform) do update set spend=excluded.spend, impressions=excluded.impressions, clicks=excluded.clicks, note=excluded.note`,
      [str(fd, "day"), pl, spend, int(fd, "impressions"), int(fd, "clicks"), opt(fd, "note")]);
    return "Ad day saved.";
  });
}
export async function deleteAd(fd: FormData) {
  const id = uuid(str(fd, "id"));
  return guarded("/social", async () => { await q("delete from hq.ad_spend where id = $1", [id]); return "Removed."; });
}
