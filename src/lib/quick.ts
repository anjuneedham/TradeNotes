import { defaultMultiplierFor } from "./instruments";

/**
 * Mobile quick-log helpers (pure). The quick form has six fields: instrument, side, size, entry, exit (blank = still open) and stop.
 * Everything else a real trade needs is filled in here, then the trade goes through the SAME validation and insert as the full form
 * (lib/trade-save.ts), so a quick trade is an ordinary trade: same limits, same metrics.
 */
export interface QuickDefaults { symbol: string; side: "long" | "short"; quantity: string; accountId: string | null; assetClass: string | null }
export const NO_DEFAULTS: QuickDefaults = { symbol: "", side: "long", quantity: "", accountId: null, assetClass: null };

const CRYPTO_BASE = /^(BTC|ETH|SOL|XRP|ADA|DOGE|BNB|LTC|DOT|AVAX|LINK|MATIC)/;

/**
 * Market for a symbol: what the user last logged for that exact symbol; else known futures contracts; else a 6-letter pair is forex and
 * a coin ticker (BTC, ETH, ...) followed by any quote is crypto; else the market chosen at onboarding (stocks/options/futures/forex/crypto); else "other".
 */
export function inferAssetClass(symbol: string, previous: string | null, primaryMarket: string | null): string {
  const s = symbol.toUpperCase().replace(/[\s/]/g, "");
  if (previous) return previous;
  if (defaultMultiplierFor("future", s) !== null && /^[A-Z]{1,3}[FGHJKMNQUVXZ]?\d{0,2}$/.test(s) && s.length <= 4) return "future";
  if (CRYPTO_BASE.test(s) && /^[A-Z]{5,10}$/.test(s)) return "crypto"; // BTCUSDT, ETHUSD, BTCEUR, ETHBTC: a coin ticker first, any quote
  if (/^[A-Z]{6}$/.test(s)) return "forex";
  const m = primaryMarket === "stocks" ? "stock" : primaryMarket === "options" ? "option" : primaryMarket === "futures" ? "future" : primaryMarket;
  return m && ["forex", "future", "stock", "option", "crypto", "other"].includes(m) ? m : "other";
}

const pad = (n: number) => String(n).padStart(2, "0");
/** A `datetime-local`-style value (YYYY-MM-DDTHH:mm, UTC) for `now`; the schema reads it as UTC like the full form's stored values. */
export const stampUtc = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;

/**
 * The full-form field set for six quick fields. Entry time is now; when an exit price is given the exit time is now too (the user
 * can correct times by editing the trade). Blank exit = an open trade, blank stop = no R-multiple. Any other input is dropped.
 */
export function quickToFormData(i: { symbol?: string; side?: string; quantity?: string; entry_price?: string; exit_price?: string; stop_price?: string }, ctx: { accountId: string; assetClass: string; now?: Date }): FormData {
  const fd = new FormData();
  const now = stampUtc(ctx.now ?? new Date());
  fd.set("account_id", ctx.accountId);
  fd.set("asset_class", ctx.assetClass);
  fd.set("symbol", (i.symbol ?? "").trim());
  fd.set("side", i.side === "short" ? "short" : "long");
  fd.set("quantity", (i.quantity ?? "").trim());
  fd.set("entry_price", (i.entry_price ?? "").trim());
  fd.set("opened_at", now);
  const exit = (i.exit_price ?? "").trim();
  if (exit) { fd.set("exit1_price", exit); fd.set("closed_at", now); }
  const stop = (i.stop_price ?? "").trim();
  if (stop) fd.set("stop_price", stop);
  return fd;
}

/** State returned to the quick-log form. `n` changes on every successful save so the form can clear itself. */
export interface QuickState { errors?: Record<string, string>; message?: string; values?: Record<string, string>; code?: "limit"; savedId?: string; savedLabel?: string; n?: number }
