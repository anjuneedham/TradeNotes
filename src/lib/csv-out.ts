/** One CSV cell: arrays joined with "; ", spreadsheet formula injection neutralised, quotes/newlines escaped. Shared by every export. */
export const csvCell = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : ""; // real numbers (-125.5) are not text: the formula guard below must not turn them into '-125.5'
  let s = Array.isArray(v) ? v.join("; ") : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
