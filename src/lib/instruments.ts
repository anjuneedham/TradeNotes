/**
 * Instrument specifications. Pure data + helpers, no I/O.
 *
 * P&L in the metrics engine is (exit − entry) × quantity × multiplier. The multiplier therefore carries the
 * contract economics:
 * - Futures: point value (e.g. ES = $50 per 1.00 point; tick 0.25 = $12.50).
 * - Options: contract multiplier (US equity options = 100 shares per contract).
 * - Forex: units per lot (standard lot = 100,000; quantity is entered in lots, so 0.1 = mini, 0.01 = micro).
 * - Stocks / crypto: 1 (quantity is shares / coins).
 * Specs are exchange-published values as of 2026; a user can always override the multiplier on a trade.
 */
export interface FuturesSpec { root: string; name: string; tickSize: number; tickValue: number; pointValue: number; currency: string; exchange: string }

const F = (root: string, name: string, tickSize: number, tickValue: number, exchange: string, currency = "USD"): FuturesSpec =>
  ({ root, name, tickSize, tickValue, pointValue: round(tickValue / tickSize), currency, exchange });

export const FUTURES: Record<string, FuturesSpec> = Object.fromEntries([
  F("ES", "E-mini S&P 500", 0.25, 12.5, "CME"), F("MES", "Micro E-mini S&P 500", 0.25, 1.25, "CME"),
  F("NQ", "E-mini Nasdaq-100", 0.25, 5, "CME"), F("MNQ", "Micro E-mini Nasdaq-100", 0.25, 0.5, "CME"),
  F("YM", "E-mini Dow", 1, 5, "CBOT"), F("MYM", "Micro E-mini Dow", 1, 0.5, "CBOT"),
  F("RTY", "E-mini Russell 2000", 0.1, 5, "CME"), F("M2K", "Micro E-mini Russell 2000", 0.1, 0.5, "CME"),
  F("CL", "Crude Oil", 0.01, 10, "NYMEX"), F("MCL", "Micro Crude Oil", 0.01, 1, "NYMEX"),
  F("NG", "Natural Gas", 0.001, 10, "NYMEX"),
  F("GC", "Gold", 0.1, 10, "COMEX"), F("MGC", "Micro Gold", 0.1, 1, "COMEX"),
  F("SI", "Silver", 0.005, 25, "COMEX"), F("HG", "Copper", 0.0005, 12.5, "COMEX"),
  F("ZB", "30-Year T-Bond", 1 / 32, 31.25, "CBOT"), F("ZN", "10-Year T-Note", 1 / 64, 15.625, "CBOT"),
  F("ZC", "Corn", 0.25, 12.5, "CBOT"), F("ZS", "Soybeans", 0.25, 12.5, "CBOT"),
  F("6E", "Euro FX", 0.00005, 6.25, "CME"), F("6J", "Japanese Yen", 0.0000005, 6.25, "CME"), F("6B", "British Pound", 0.0001, 6.25, "CME"),
  F("FDAX", "DAX", 1, 25, "Eurex", "EUR"), F("FESX", "Euro Stoxx 50", 1, 10, "Eurex", "EUR"),
].map((s) => [s.root, s]));

/** CME month codes used in contract symbols such as ESZ5 / ESZ2025 / ES DEC25. */
const MONTH = "FGHJKMNQUVXZ";

/** Root of a futures symbol: "ESZ5" -> "ES", "MNQH2026" -> "MNQ", "/ESZ25" -> "ES", "ES 12-25" -> "ES", "CL.F" -> "CL". */
export function futuresRoot(symbol: string): string | null {
  const s = symbol.toUpperCase().replace(/^\//, "").replace(/[\s.:_-].*$/, "");
  if (FUTURES[s]) return s;
  const m = s.match(new RegExp(`^([A-Z0-9]{1,4}?)[${MONTH}]\\d{1,4}$`));
  if (m && FUTURES[m[1]]) return m[1];
  // Longest known root that prefixes the symbol (e.g. "MESM6" if the regex above missed).
  const roots = Object.keys(FUTURES).sort((a, b) => b.length - a.length);
  return roots.find((r) => s.startsWith(r) && /^[A-Z]?\d*$/.test(s.slice(r.length))) ?? null;
}

export const futuresSpec = (symbol: string): FuturesSpec | null => { const r = futuresRoot(symbol); return r ? FUTURES[r] : null; };

/** Standard equity/ETF option contract multiplier. */
export const OPTION_MULTIPLIER = 100;
/** Units per standard forex lot. */
export const FOREX_LOT = 100000;
/** Pip size: 0.01 for JPY-quoted pairs, 0.0001 otherwise. */
export const pipSize = (pair: string) => (/JPY$/i.test(pair.replace(/[^A-Za-z]/g, "")) ? 0.01 : 0.0001);
/** Quote currency of a 6-letter pair (EURUSD -> USD), or null. */
export const forexQuote = (pair: string) => { const p = pair.replace(/[^A-Za-z]/g, "").toUpperCase(); return /^[A-Z]{6}$/.test(p) ? p.slice(3) : null; };
/** Crypto quantities and prices keep up to 8 decimals (satoshi precision); the DB column is numeric(20,8). */
export const CRYPTO_DECIMALS = 8;
export const roundCrypto = (x: number) => Math.round(x * 1e8) / 1e8;

/**
 * Default multiplier for an instrument. Unknown futures return null so the caller can ask the user rather than guess;
 * every other class has a safe default.
 */
export function defaultMultiplierFor(assetClass: string, symbol = ""): number | null {
  switch (assetClass) {
    case "forex": return FOREX_LOT;
    case "option": return OPTION_MULTIPLIER;
    case "future": return futuresSpec(symbol)?.pointValue ?? null;
    default: return 1;
  }
}

/** Price move in ticks (futures) or pips (forex), for display. Null when not applicable. */
export function moveInUnits(assetClass: string, symbol: string, move: number): { value: number; unit: "ticks" | "pips" } | null {
  if (assetClass === "forex") return { value: round(move / pipSize(symbol), 1), unit: "pips" };
  if (assetClass === "future") { const s = futuresSpec(symbol); return s ? { value: round(move / s.tickSize, 2), unit: "ticks" } : null; }
  return null;
}

/** Guess an asset class from a symbol when a broker export does not say. Conservative: falls back to "other". */
export function guessAssetClass(symbol: string): "forex" | "future" | "crypto" | "option" | "stock" | "other" {
  const s = symbol.toUpperCase().replace(/^\//, "");
  if (/^[A-Z]{1,6}\s*\d{6}[CP]\d{8}$/.test(s.replace(/\s+/g, " ")) || /^[A-Z]{1,6}\s+\d{2}\w{3}\d{2}\s+\d+(\.\d+)?\s+[CP]/.test(s)) return "option";
  if (/^[A-Z0-9]{2,10}(USDT|USDC|BUSD|FDUSD)(\.P|PERP)?$/.test(s) || /^(BTC|ETH|SOL|XRP|DOGE|ADA|BNB)[-/]?(USD|EUR)$/.test(s)) return "crypto";
  if (/^(EUR|GBP|USD|AUD|NZD|CAD|CHF|JPY)(EUR|GBP|USD|AUD|NZD|CAD|CHF|JPY)$/.test(s.replace(/[^A-Z]/g, ""))) return "forex";
  if (futuresRoot(s) && (/\d/.test(s) || symbol.startsWith("/"))) return "future";
  if (/^[A-Z]{1,5}(\.[A-Z])?$/.test(s)) return "stock";
  return "other";
}

function round(x: number, dp = 8) { const f = 10 ** dp; return Math.round(x * f) / f; }
