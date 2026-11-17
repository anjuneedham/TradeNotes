import { NOTES, type Note } from "../content/notes";
import { JAMES } from "./james";

export const NOTES_TZ = "America/Jamaica"; // the business's home time zone: "today" means today in Jamaica
/** YYYY-MM-DD for the given instant in Jamaica time. */
export function dayKey(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: NOTES_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
export function formatDay(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** Published notes (date <= today), newest first. Future-dated notes are never returned. */
export function publishedNotes(now: Date = new Date(), all: Note[] = NOTES): Note[] {
  const today = dayKey(now);
  return all.filter((n) => n.date <= today).sort((a, b) => b.date.localeCompare(a.date));
}
export const noteBySlug = (slug: string, now: Date = new Date(), all: Note[] = NOTES) => publishedNotes(now, all).find((n) => n.slug === slug);
export const noteForDay = (key: string, all: Note[] = NOTES) => all.find((n) => n.date === key);
export const upcomingCount = (now: Date = new Date(), all: Note[] = NOTES) => all.filter((n) => n.date > dayKey(now)).length;
export const kindLabel = (k: Note["kind"]) => (k === "story" ? "Story time" : "Article");

export const DISCLAIMER = "Educational only. Not financial advice. Trading involves a real risk of loss, and nothing here promises or implies results. Stories are made up.";

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? process.env.BETTER_AUTH_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")).replace(/\/$/, "");
}

/** Plain-text daily email. The unsubscribe link and disclaimer are always included. */
export function buildDailyEmail(note: Note, unsubscribeUrl: string, base = siteUrl()) {
  const subject = `${kindLabel(note.kind)}: ${note.title}`;
  const text = [
    `${JAMES.newsletterName} — ${formatDay(note.date)}`,
    "",
    note.title,
    "",
    ...note.body.flatMap((p) => [p, ""]),
    JAMES.signOff,
    "",
    `Read it online: ${base}/notes/${note.slug}`,
    "",
    "—",
    DISCLAIMER,
    `Unsubscribe any time: ${unsubscribeUrl}`,
  ].join("\n");
  return { subject, text };
}
