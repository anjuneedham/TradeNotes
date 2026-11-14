/** Attribution tags and the PAID_TEST.md decision rule. The customer app stores the first ?src= tag a visitor arrives with ([a-z0-9-]{1,24}). */
import { SRC_RE } from "./outreach";
export const PREFIX_PLATFORM: Record<string, "tiktok" | "instagram" | "youtube"> = { tt: "tiktok", ig: "instagram", yt: "youtube" };
export const platformOfTag = (tag: string | null | undefined) => (tag ? PREFIX_PLATFORM[tag.split("-")[0]] ?? null : null);
export const PLACEMENTS = ["organic", "dm", "ad", "bio", "comment"] as const;
export function buildTag(prefix: string, placement: string, video?: string): { tag: string | null; error?: string } {
  if (!(prefix in PREFIX_PLATFORM)) return { tag: null, error: "Unknown platform prefix." };
  const v = (video ?? "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
  const tag = [prefix, placement, v].filter(Boolean).join("-");
  return SRC_RE.test(tag) ? { tag } : { tag: null, error: "Tag must be 1–24 characters: a–z, 0–9, hyphens." };
}
/** PAID_TEST.md day-5 rule: more signups-that-logged-a-trade wins; fewer than 3 apart → don't decide. */
export function decide(tt: number, ig: number): { winner: "tiktok" | "instagram" | null; text: string } {
  if (tt === 0 && ig === 0) return { winner: null, text: "No signups that logged a trade yet — nothing to decide." };
  if (Math.abs(tt - ig) < 3) return { winner: null, text: `TikTok ${tt} vs Instagram ${ig}: fewer than 3 apart — don't decide; keep both another week (reply rate is a tiebreaker only).` };
  return tt > ig ? { winner: "tiktok", text: `TikTok leads ${tt} to ${ig} on signups that logged a trade.` } : { winner: "instagram", text: `Instagram leads ${ig} to ${tt} on signups that logged a trade.` };
}
export const cpc = (spend: number, clicks: number) => (clicks > 0 ? spend / clicks : null);
export const PAUSE_RULE = { spend: 15, clicks: 0 };
/** Ad guardrail from PAID_TEST.md: pause if $15 spent with zero clicks. */
export const shouldPauseAd = (spend: number, clicks: number) => spend >= PAUSE_RULE.spend && clicks === PAUSE_RULE.clicks;
