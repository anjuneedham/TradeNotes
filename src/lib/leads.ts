import { pool } from "./db";

/** Free downloads offered in exchange for an email (with consent). Files live in /public/downloads; pages under /free. */
export const MAGNETS = {
  "journal-template": { title: "Trading journal template + 30-trade review checklist", file: "/downloads/tradenotes-journal-template.csv", page: "/free/review-checklist" },
} as const;
export type MagnetId = keyof typeof MAGNETS;
export const isMagnet = (v: string): v is MagnetId => v in MAGNETS;

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,189}\.[^\s@]{2,}$/;
export function normalizeEmail(raw: string): string | null {
  const e = raw.trim().toLowerCase();
  return e.length <= 254 && EMAIL.test(e) ? e : null;
}

/** Store (or keep) a lead. Re-subscribing an address that unsubscribed earlier needs a fresh consent, so we clear unsubscribed_at. */
export async function saveLead(email: string, magnet: MagnetId, source: string | null): Promise<void> {
  await pool.query(
    `insert into tradenotes.leads (email, magnet, source) values ($1, $2, $3)
     on conflict (email) do update set unsubscribed_at = null, consent_at = now()`,
    [email, magnet, source],
  );
}

export async function unsubscribeLead(token: string): Promise<boolean> {
  if (!/^[0-9a-f]{32}$/.test(token)) return false;
  const r = await pool.query("update tradenotes.leads set unsubscribed_at = coalesce(unsubscribed_at, now()) where unsubscribe_token = $1", [token]);
  return (r.rowCount ?? 0) > 0;
}
