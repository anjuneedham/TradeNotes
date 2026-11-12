// Edge-safe (no database imports): used by middleware.
/** Program rules in one place. Change here, then update docs/AFFILIATE_PROGRAM.md and /partners (rendered from this). */
export const AFFILIATE = {
  defaultPct: 30,        // % of cash actually collected from the referred customer
  months: 12,            // commission window, counted from the customer's first paid payment
  holdDays: 30,          // a commission becomes payable this long after the customer's payment (covers the refund window)
  minPayoutCents: 2500,  // below this, the balance rolls over
  cookieDays: 30,
} as const;

/** A ?ref= code: 3-24 lowercase letters/digits. Anything else is ignored. */
export const cleanRef = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim().toLowerCase() : "";
  return /^[a-z0-9]{3,24}$/.test(s) ? s : null;
};

