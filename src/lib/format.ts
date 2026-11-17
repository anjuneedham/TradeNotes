export const money = (n: number | null, cur = "USD") =>
  n === null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: cur, maximumFractionDigits: 2 }).format(n);
/** Money with an explicit sign for results, so gain/loss never depends on colour alone. */
export const signedMoney = (n: number | null, cur = "USD") => (n === null ? "—" : `${n > 0 ? "+" : ""}${money(n, cur)}`);
export const pct = (n: number | null) => (n === null ? "—" : `${(n * 100).toFixed(1)}%`);
export const num = (n: number | null, d = 2) => (n === null ? "—" : n.toFixed(d));
export const signedR = (n: number | null) => (n === null ? "—" : `${n > 0 ? "+" : ""}${n.toFixed(2)}R`);
export const pnlClass = (n: number | null) => (n === null || n === 0 ? "" : n > 0 ? "text-win" : "text-loss");
/** Trade times are stored and shown in UTC (see KNOWN_ISSUES #1). */
export const dateTime = (iso: string) => new Date(iso).toISOString().slice(0, 16).replace("T", " ");
/** Date and time in a given IANA zone as "YYYY-MM-DD HH:MM" (falls back to UTC for an invalid zone). */
export const dateTimeIn = (iso: string, tz: string) => {
  try { return new Intl.DateTimeFormat("sv-SE", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso)); }
  catch { return dateTime(iso); }
};
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const shortDate = (iso: string) => { const d = new Date(iso); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
/** Trim trailing zeros from DB numerics for display (1.08500000 -> 1.085). */
export const plain = (v: number | string | null | undefined) => (v === null || v === undefined || v === "" ? "—" : String(Number(v)));
/** Short money for tight cells: 1,234 -> +1.2k, 999,600 -> +1M, always with a sign (+ or −), no currency symbol. The unit is chosen AFTER rounding. */
export const signedCompact = (n: number) => {
  const a = Math.abs(n), sign = n > 0 ? "+" : n < 0 ? "−" : "";
  const t = (v: number, d: number) => String(Number(v.toFixed(d))); // drops trailing zeros: 1.0 -> "1"
  const body = a >= 999500 ? `${t(a / 1e6, a >= 9.95e6 ? 0 : 1)}M` : a >= 999.5 ? `${t(a / 1e3, a >= 9950 ? 0 : 1)}k` : a >= 100 ? t(a, 0) : t(a, 1);
  return body === "0" ? "0" : `${sign}${body}`;
};
