import type { Note } from "../content/notes";
import { JAMES } from "./james";
import { siteUrl } from "./newsletter";

export type Platform = "x" | "instagram" | "tiktok" | "youtube";
export type SocialPost = { platform: Platform; label: string; text: string; limit: number };

const NOT_ADVICE = "Not financial advice.";
const TAGS = ["#tradingjournal", "#learntotrade", "#riskmanagement"];
const first = (n: Note) => n.summary.replace(/\s+/g, " ").trim();

/**
 * Copy-ready posts for each platform, written in James's voice. These are drafts for a human to review and post:
 * nothing here publishes anything. Every post carries the link and the not-advice line, within each platform's length limit.
 */
export function socialPosts(note: Note, base = siteUrl()): SocialPost[] {
  const url = `${base}/notes/${note.slug}`;
  const story = note.kind === "story";
  const hook = story ? `Story time (made up): ${note.title}` : note.title;
  const x = `${hook}\n\n${first(note)}\n\n${url}\n${NOT_ADVICE} — James`;
  const instagram = `${hook}\n\n${first(note)}\n\nFull page from my notes: link in bio (${url.replace(/^https?:\/\//, "")}).\n\n${JAMES.signOff}\n\n${NOT_ADVICE} Trading involves risk of loss.${story ? " This story is made up." : ""}\n\n${TAGS.join(" ")}`;
  const tiktok = `${hook} — ${first(note)} ${NOT_ADVICE} ${TAGS.slice(0, 2).join(" ")} #james`;
  const youtube = `${note.title}\n\n${first(note)}\n\nRead the full note: ${url}\nDaily notes by email: ${base}/notes\n\n${NOT_ADVICE} Educational only; trading involves risk of loss.${story ? " The story is made up." : ""}\n\n${TAGS.join(" ")}`;
  return [
    { platform: "x", label: "X / Threads", text: x, limit: 280 },
    { platform: "instagram", label: "Instagram caption", text: instagram, limit: 2200 },
    { platform: "tiktok", label: "TikTok caption", text: tiktok, limit: 2200 },
    { platform: "youtube", label: "YouTube Shorts description", text: youtube, limit: 5000 },
  ];
}
