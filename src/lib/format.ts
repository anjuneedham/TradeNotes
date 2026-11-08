export const money = (n: number | null, cur = "USD") =>
  n === null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: cur, maximumFractionDigits: 2 }).format(n);
export const pct = (n: number | null) => (n === null ? "—" : `${(n * 100).toFixed(1)}%`);
export const num = (n: number | null, d = 2) => (n === null ? "—" : n.toFixed(d));
export const pnlClass = (n: number | null) => (n === null || n === 0 ? "" : n > 0 ? "text-win" : "text-loss");
