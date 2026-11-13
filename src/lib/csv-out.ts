/** One CSV cell: arrays joined with "; ", spreadsheet formula injection neutralised, quotes/newlines escaped. Shared by every export. */
export const csvCell = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  let s = Array.isArray(v) ? v.join("; ") : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
