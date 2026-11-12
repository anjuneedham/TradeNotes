import Papa from "papaparse";
import { parseBrokerTime, type DateOrder } from "./timezone";
import { defaultMultiplierFor, futuresRoot, guessAssetClass, OPTION_MULTIPLIER, FOREX_LOT } from "./instruments";
import { previewImport, type ColumnMapping } from "./csv-import";

/**
 * Broker import presets. Pure (no I/O) so the browser preview and the server import run the same code.
 *
 * Two shapes of export exist:
 * - round-trip: one row per closed position (MetaTrader, cTrader, Tradovate, NinjaTrader, Bybit closed P&L);
 * - fills: one row per execution (Thinkorswim, Interactive Brokers, TradingView, Webull, Binance, Bybit spot).
 *   Fills are grouped into trades per symbol: a trade opens when the position leaves zero and closes when it returns to zero;
 *   a fill that flips the position is split. Positions still open at the end of the file are reported, not imported.
 * When the broker states its own realised profit, the contract multiplier is derived from it so our P&L reconciles with the
 * broker's report to the cent (this covers CFDs, metals and indices whose contract sizes vary by broker).
 *
 * Column layouts follow each broker's documented/common export as of 2026. Brokers change exports; anything not recognised
 * falls back to manual column mapping.
 */
export type AssetClass = "stock" | "option" | "future" | "forex" | "crypto" | "other";
export interface Fill { symbol: string; side: "buy" | "sell"; quantity: number; price: number; at: string; fees: number; assetClass?: AssetClass; multiplier?: number; row: number }
export interface ImportedTrade {
  symbol: string; side: "long" | "short"; quantity: number; entryPrice: number; exits: { quantity: number; price: number; at: string | null }[];
  openedAt: string; closedAt: string | null; fees: number; assetClass: AssetClass | null; multiplier: number | null;
  /** Broker-reported net P&L in account currency, when the export has one (used for the reconciliation check). */
  brokerNet: number | null; fingerprint: string;
}
export interface RowError { row: number; message: string }
export interface Ctx { tz: string; dateOrder: DateOrder }
export interface ParseResult { trades: ImportedTrade[]; errors: RowError[]; warnings: string[]; openPositions: number; ignoredRows: number }
type Row = Record<string, string>;

export interface Preset {
  id: string; name: string; kind: "round-trip" | "fills";
  /** Normalised header names that must all be present for auto-detect. */
  signature: string[];
  /** Times are always UTC in this export (the user's time-zone setting is ignored). */
  utc?: boolean;
  formats: string; help: string;
  parse(rows: Row[], ctx: Ctx, firstRow: number): { trades?: ImportedTrade[]; fills?: Fill[]; errors: RowError[]; warnings?: string[]; ignoredRows?: number };
}

// ---------- low-level parsing ----------
export const norm = (h: string) => h.replace(/^﻿/, "").trim().toLowerCase().replace(/[_]+/g, " ").replace(/\s+/g, " ");

/** Numbers like "1,234.50", "$(12.50)", "-3.2 USDT", "0.0123BTC", "1.00 Lots". */
export function num(v: unknown): number {
  if (v === undefined || v === null) return NaN;
  let s = String(v).trim();
  if (!s || s === "-" || s === "--") return NaN;
  const neg = /^\(.*\)$/.test(s.replace(/[$€£\s]/g, "")) || /^-/.test(s.replace(/^[$€£]/, ""));
  s = s.replace(/[^0-9.eE+-]/g, "").replace(/^[+-]/, "");
  if (!s) return NaN;
  const n = Number(s);
  return Number.isFinite(n) ? (neg ? -n : n) : NaN;
}
const r8 = (x: number) => Math.round(x * 1e8) / 1e8;
const cleanSymbol = (s: string) => s.trim().toUpperCase().replace(/^[A-Z_]+:(?=\S)/, "").replace(/\s+/g, " ").slice(0, 40);
const dbSymbol = (s: string) => s.replace(/[\s/]/g, "").slice(0, 24);

/** Table from CSV or HTML text, with duplicate header names made unique ("Price", "Price 2"). `headerAt` finds the header line by signature. */
export function readTable(text: string, isHtml: boolean): string[][] {
  if (isHtml) return htmlRows(text);
  const parsed = Papa.parse<string[]>(text.replace(/^﻿/, ""), { header: false, skipEmptyLines: true });
  return parsed.data.map((r) => r.map((c) => String(c ?? "")));
}
export const looksLikeHtml = (text: string) => /<table[\s>]/i.test(text.slice(0, 200000));

function htmlRows(html: string): string[][] {
  const rows: string[][] = [];
  const decode = (s: string) => s.replace(/<[^>]*>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
  for (const tr of html.match(/<tr[\s\S]*?<\/tr>/gi) ?? []) {
    const cells: string[] = [];
    for (const m of tr.matchAll(/<t([dh])([^>]*)>([\s\S]*?)<\/t[dh]>/gi)) {
      const span = Number((m[2].match(/colspan\s*=\s*["']?(\d+)/i) ?? [])[1] ?? 1);
      cells.push(decode(m[3]));
      for (let i = 1; i < Math.min(span, 20); i++) cells.push("");
    }
    if (cells.some((c) => c)) rows.push(cells);
  }
  return rows;
}

function uniqueHeaders(hs: string[]): string[] {
  const seen: Record<string, number> = {};
  return hs.map((h) => { const k = norm(h); seen[k] = (seen[k] ?? 0) + 1; return seen[k] > 1 ? `${k} ${seen[k]}` : k; });
}

/** Locate the first row whose (normalised) cells contain all `sig` names; return records for the rows below it (until a blank/short row). */
export function recordsFrom(table: string[][], sig: string[]): { rows: Row[]; firstRow: number } | null {
  for (let i = 0; i < table.length; i++) {
    const hs = uniqueHeaders(table[i]);
    if (!sig.every((s) => hs.includes(s))) continue;
    const rows: Row[] = [];
    for (let j = i + 1; j < table.length; j++) {
      const cells = table[j];
      if (cells.filter((c) => c.trim()).length < Math.min(3, sig.length)) { if (rows.length) break; continue; }
      if (uniqueHeaders(cells).join() === hs.join()) continue; // repeated header (paged statements)
      rows.push(Object.fromEntries(hs.map((h, k) => [h, cells[k] ?? ""])));
    }
    return { rows, firstRow: i + 2 };
  }
  return null;
}

// ---------- shared helpers ----------
export function fingerprintOf(t: Omit<ImportedTrade, "fingerprint">): string {
  const exitVwap = t.exits.length ? r8(t.exits.reduce((s, e) => s + e.price * e.quantity, 0) / t.exits.reduce((s, e) => s + e.quantity, 0)) : "";
  return [dbSymbol(t.symbol), t.side, r8(t.quantity), r8(t.entryPrice), exitVwap, t.openedAt, t.closedAt ?? ""].join("|");
}
function trade(t: Omit<ImportedTrade, "fingerprint">): ImportedTrade { return { ...t, fingerprint: fingerprintOf(t) }; }

/**
 * Multiplier implied by the broker's own gross profit (account currency): gross / (price move × quantity).
 * Null when the move is zero (cannot be derived) or the result is not a sensible positive number.
 */
export function impliedMultiplier(side: "long" | "short", qty: number, entry: number, exitVwap: number, grossProfit: number): number | null {
  const move = (side === "long" ? 1 : -1) * (exitVwap - entry) * qty;
  if (Math.abs(move) < 1e-12 || !Number.isFinite(grossProfit)) return null;
  const m = grossProfit / move;
  return m > 0 && Number.isFinite(m) ? r8(m) : null;
}

/** Round-trip row -> trade, reconciling against a broker-stated profit when available. */
function roundTrip(p: { symbol: string; side: "long" | "short"; qty: number; entry: number; exit: number; openedAt: string; closedAt: string; fees: number; credit?: number; brokerGross?: number | null; brokerNet?: number | null; assetClass?: AssetClass | null; multiplier?: number | null }): ImportedTrade {
  const asset = p.assetClass ?? guessAssetClass(p.symbol);
  let mult = p.multiplier ?? null;
  if (p.brokerGross !== undefined && p.brokerGross !== null) {
    const implied = impliedMultiplier(p.side, p.qty, p.entry, p.exit, p.brokerGross + (p.credit ?? 0));
    if (implied !== null) mult = implied;
  }
  mult ??= defaultMultiplierFor(asset, p.symbol);
  return trade({ symbol: p.symbol, side: p.side, quantity: p.qty, entryPrice: p.entry, exits: [{ quantity: p.qty, price: p.exit, at: p.closedAt }], openedAt: p.openedAt, closedAt: p.closedAt, fees: r8(Math.max(0, p.fees)), assetClass: asset, multiplier: mult, brokerNet: p.brokerNet ?? null });
}

/** Group executions into round-trip trades (FIFO position per symbol). */
export function groupFills(fills: Fill[]): { trades: ImportedTrade[]; openPositions: number } {
  const bySym = new Map<string, Fill[]>();
  for (const f of fills) { const k = f.symbol; (bySym.get(k) ?? bySym.set(k, []).get(k)!).push(f); }
  const trades: ImportedTrade[] = [];
  let openPositions = 0;
  for (const [, fs] of bySym) {
    fs.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : a.row - b.row));
    let pos = 0; // signed
    let cur: { side: "long" | "short"; qty: number; cost: number; openedAt: string; exits: { quantity: number; price: number; at: string }[]; fees: number; f: Fill } | null = null;
    for (const f of fs) {
      let remaining = f.quantity;
      const signed = f.side === "buy" ? 1 : -1;
      while (remaining > 1e-12) {
        if (!cur || Math.abs(pos) < 1e-12) {
          cur = { side: signed > 0 ? "long" : "short", qty: 0, cost: 0, openedAt: f.at, exits: [], fees: 0, f };
          cur.qty = remaining; cur.cost = remaining * f.price; cur.fees += f.fees * (remaining / f.quantity);
          pos = signed * remaining; remaining = 0;
        } else if (Math.sign(pos) === signed) {
          cur.qty += remaining; cur.cost += remaining * f.price; cur.fees += f.fees * (remaining / f.quantity);
          pos += signed * remaining; remaining = 0;
        } else {
          const closing = Math.min(remaining, Math.abs(pos));
          cur.exits.push({ quantity: closing, price: f.price, at: f.at });
          cur.fees += f.fees * (closing / f.quantity);
          pos += signed * closing; remaining -= closing;
          if (Math.abs(pos) < 1e-9) {
            pos = 0;
            const t = cur;
            trades.push(trade({
              symbol: t.f.symbol, side: t.side, quantity: r8(t.qty), entryPrice: r8(t.cost / t.qty), exits: t.exits.map((e) => ({ ...e, quantity: r8(e.quantity) })),
              openedAt: t.openedAt, closedAt: t.exits[t.exits.length - 1].at, fees: r8(t.fees), assetClass: t.f.assetClass ?? guessAssetClass(t.f.symbol),
              multiplier: t.f.multiplier ?? defaultMultiplierFor(t.f.assetClass ?? guessAssetClass(t.f.symbol), t.f.symbol), brokerNet: null,
            }));
            cur = null;
          }
        }
      }
    }
    if (cur && Math.abs(pos) > 1e-12) openPositions++;
  }
  trades.sort((a, b) => (a.openedAt < b.openedAt ? -1 : 1));
  return { trades, openPositions };
}

const side = (v: string): "buy" | "sell" | null => {
  const s = v.trim().toLowerCase();
  if (/^(buy|b|bot|bought|long|buy to open|buy to close|btc|bto)$/.test(s) || s.startsWith("buy")) return "buy";
  if (/^(sell|s|sld|sold|short|sell short|sell to open|sell to close|stc|sto)$/.test(s) || s.startsWith("sell")) return "sell";
  return null;
};
const need = (errors: RowError[], row: number, cond: boolean, msg: string) => { if (!cond) errors.push({ row, message: msg }); return cond; };

// ---------- presets ----------
const metatrader: Preset = {
  id: "metatrader", name: "MetaTrader 4 / 5", kind: "round-trip", signature: ["symbol", "type", "volume", "price", "price 2", "profit"],
  formats: "MT5 report (HTML or CSV, “Positions” table) and MT4 statement (HTML or CSV, “Closed Transactions”).",
  help: "MT5: History tab → right-click → Report → HTML. MT4: Account History → right-click → Save as Detailed Report.",
  parse(rows, ctx, first) {
    const errors: RowError[] = []; const trades: ImportedTrade[] = []; let ignored = 0;
    rows.forEach((r, i) => {
      const row = first + i;
      const type = (r.type ?? "").toLowerCase();
      if (type !== "buy" && type !== "sell") { ignored++; return; } // balance, credit, pending orders, totals
      const symbol = cleanSymbol(r.symbol ?? r.item ?? "");
      const qty = num(r.volume ?? r.size), entry = num(r.price), exit = num(r["price 2"]);
      const openedAt = parseBrokerTime(r.time ?? r["open time"], ctx.tz, "ymd"), closedAt = parseBrokerTime(r["time 2"] ?? r["close time"], ctx.tz, "ymd");
      if (!need(errors, row, !!symbol && qty > 0 && entry > 0 && exit > 0 && !!openedAt && !!closedAt, "missing symbol, volume, prices or times")) return;
      const commission = num(r.commission) || 0, swap = num(r.swap) || 0, taxes = num(r.taxes) || 0, profit = num(r.profit);
      const costs = -(commission + swap + taxes);
      trades.push(roundTrip({ symbol, side: type === "buy" ? "long" : "short", qty, entry, exit, openedAt: openedAt!, closedAt: closedAt!, fees: costs, credit: costs < 0 ? -costs : 0, brokerGross: Number.isFinite(profit) ? profit : null, brokerNet: Number.isFinite(profit) ? r8(profit - costs) : null, assetClass: /^[A-Z]{6}$/.test(symbol) ? "forex" : "other" }));
    });
    return { trades, errors, ignoredRows: ignored };
  },
};
// MT4 names columns Open Time / Type / Size / Item / Price / ... / Close Time / Price / Commission / Taxes / Swap / Profit.
const metatrader4: Preset = { ...metatrader, id: "metatrader4", signature: ["open time", "type", "size", "item", "price", "close time", "price 2", "profit"] };

const ctrader: Preset = {
  id: "ctrader", name: "cTrader", kind: "round-trip", signature: ["symbol", "opening direction", "opening time", "closing time", "entry price", "closing price"],
  formats: "History tab export (CSV).", help: "cTrader: History tab → export (CSV).",
  parse(rows, ctx, first) {
    const errors: RowError[] = []; const trades: ImportedTrade[] = [];
    rows.forEach((r, i) => {
      const row = first + i;
      const dir = side(r["opening direction"] ?? "");
      const symbol = cleanSymbol(r.symbol ?? "");
      const qtyRaw = r["closing quantity"] ?? r.quantity ?? r.volume ?? "";
      let qty = num(qtyRaw);
      const forex = /^[A-Z]{6}$/.test(symbol);
      if (forex && !/lot/i.test(qtyRaw)) qty = r8(qty / FOREX_LOT); // units -> lots
      const entry = num(r["entry price"]), exit = num(r["closing price"]);
      const openedAt = parseBrokerTime(r["opening time"], ctx.tz, "dmy"), closedAt = parseBrokerTime(r["closing time"], ctx.tz, "dmy");
      if (!need(errors, row, !!dir && !!symbol && qty > 0 && entry > 0 && exit > 0 && !!openedAt && !!closedAt, "missing direction, symbol, quantity, prices or times")) return;
      const commission = num(r.commission) || 0, swap = num(r.swap) || 0;
      const net = num(r["net $"] ?? r["net"] ?? r["net profit"]);
      const costs = -(commission + swap);
      const gross = Number.isFinite(net) ? net + costs : null;
      trades.push(roundTrip({ symbol, side: dir === "buy" ? "long" : "short", qty, entry, exit, openedAt: openedAt!, closedAt: closedAt!, fees: costs, credit: costs < 0 ? -costs : 0, brokerGross: gross, brokerNet: Number.isFinite(net) ? net : null, assetClass: forex ? "forex" : null }));
    });
    return { trades, errors };
  },
};

const tradovate: Preset = {
  id: "tradovate", name: "Tradovate", kind: "round-trip", signature: ["symbol", "qty", "buyprice", "sellprice", "pnl", "boughttimestamp", "soldtimestamp"],
  formats: "Performance report (CSV). Commissions are not in this report; add them per trade if needed.", help: "Tradovate: Reports → Performance → Download CSV.",
  parse(rows, ctx, first) {
    const errors: RowError[] = []; const trades: ImportedTrade[] = [];
    rows.forEach((r, i) => {
      const row = first + i;
      const symbol = cleanSymbol(r.symbol ?? ""), qty = num(r.qty), buy = num(r.buyprice), sell = num(r.sellprice), pnl = num(r.pnl);
      const bought = parseBrokerTime(r.boughttimestamp, ctx.tz, "mdy"), sold = parseBrokerTime(r.soldtimestamp, ctx.tz, "mdy");
      if (!need(errors, row, !!symbol && qty > 0 && buy > 0 && sell > 0 && !!bought && !!sold, "missing symbol, qty, prices or timestamps")) return;
      const long = bought! <= sold!;
      trades.push(roundTrip({ symbol, side: long ? "long" : "short", qty, entry: long ? buy : sell, exit: long ? sell : buy, openedAt: long ? bought! : sold!, closedAt: long ? sold! : bought!, fees: 0, brokerGross: Number.isFinite(pnl) ? pnl : null, brokerNet: Number.isFinite(pnl) ? pnl : null, assetClass: "future", multiplier: defaultMultiplierFor("future", symbol) }));
    });
    return { trades, errors, warnings: ["Tradovate's performance report has no commissions. Add fees on each trade if you want net figures."] };
  },
};

const ninjatrader: Preset = {
  id: "ninjatrader", name: "NinjaTrader", kind: "round-trip", signature: ["instrument", "market pos.", "qty", "entry price", "exit price", "entry time", "exit time"],
  formats: "Trade Performance → Trades grid (CSV).", help: "NinjaTrader: Trade Performance → Trades → right-click → Export.",
  parse(rows, ctx, first) {
    const errors: RowError[] = []; const trades: ImportedTrade[] = [];
    rows.forEach((r, i) => {
      const row = first + i;
      const symbol = cleanSymbol(r.instrument ?? ""), pos = (r["market pos."] ?? "").toLowerCase();
      const qty = num(r.qty), entry = num(r["entry price"]), exit = num(r["exit price"]), profit = num(r.profit), comm = Math.abs(num(r.commission) || 0);
      const openedAt = parseBrokerTime(r["entry time"], ctx.tz, "mdy"), closedAt = parseBrokerTime(r["exit time"], ctx.tz, "mdy");
      if (!need(errors, row, (pos === "long" || pos === "short") && !!symbol && qty > 0 && entry > 0 && exit > 0 && !!openedAt && !!closedAt, "missing position, instrument, qty, prices or times")) return;
      // NinjaTrader's Profit column is gross of commission.
      trades.push(roundTrip({ symbol, side: pos as "long" | "short", qty, entry, exit, openedAt: openedAt!, closedAt: closedAt!, fees: comm, brokerGross: Number.isFinite(profit) ? profit : null, brokerNet: Number.isFinite(profit) ? r8(profit - comm) : null, assetClass: futuresRoot(symbol) ? "future" : null }));
    });
    return { trades, errors };
  },
};

const bybitPnl: Preset = {
  id: "bybit-derivatives", name: "Bybit (derivatives, closed P&L)", kind: "round-trip", utc: true, signature: ["contracts", "closing direction", "qty", "entry price", "exit price", "closed p&l"],
  formats: "Derivatives → Closed P&L export (CSV, UTC). The export has no open time, so hold time is unknown for these trades.", help: "Bybit: Orders → Derivatives → Closed P&L → Export.",
  parse(rows, _ctx, first) {
    const errors: RowError[] = []; const trades: ImportedTrade[] = [];
    rows.forEach((r, i) => {
      const row = first + i;
      const symbol = cleanSymbol(r.contracts ?? ""), dir = side(r["closing direction"] ?? "");
      const qty = num(r.qty), entry = num(r["entry price"]), exit = num(r["exit price"]), pnl = num(r["closed p&l"]);
      const fee = Math.abs(num(r["opening fee"]) || 0) + Math.abs(num(r["closing fee"]) || 0) + Math.max(0, num(r["funding fee"]) || 0);
      const at = parseBrokerTime(r["trade time(utc)"] ?? r["trade time"] ?? r["create time"], "UTC", "ymd");
      if (!need(errors, row, !!dir && !!symbol && qty > 0 && entry > 0 && exit > 0 && !!at, "missing contract, direction, qty, prices or time")) return;
      // Closing with a Sell means the position was long.
      trades.push(roundTrip({ symbol, side: dir === "sell" ? "long" : "short", qty, entry, exit, openedAt: at!, closedAt: at!, fees: fee, brokerGross: Number.isFinite(pnl) ? r8(pnl + fee) : null, brokerNet: Number.isFinite(pnl) ? pnl : null, assetClass: "crypto" }));
    });
    return { trades, errors, warnings: ["Bybit's closed P&L export has no open time; these trades show a hold time of zero."] };
  },
};

// ---- fill-based ----
const thinkorswim: Preset = {
  id: "thinkorswim", name: "Thinkorswim (Schwab)", kind: "fills", signature: ["exec time", "side", "qty", "pos effect", "symbol", "price"],
  formats: "Account Statement (CSV), “Account Trade History” section. Commissions are listed elsewhere in the statement and are not imported.", help: "Thinkorswim: Monitor → Account Statement → export (CSV).",
  parse(rows, ctx, first) {
    const errors: RowError[] = []; const fills: Fill[] = [];
    rows.forEach((r, i) => {
      const row = first + i;
      const s = side(r.side ?? ""), qty = Math.abs(num(r.qty)), price = num(r.price), at = parseBrokerTime(r["exec time"], ctx.tz, "mdy");
      const type = (r.type ?? "").toUpperCase();
      let symbol = cleanSymbol(r.symbol ?? "");
      let assetClass: AssetClass = "stock", multiplier: number | undefined;
      if (type === "CALL" || type === "PUT") { symbol = `${symbol} ${r.exp ?? ""} ${r.strike ?? ""} ${type}`.replace(/\s+/g, " ").trim(); assetClass = "option"; multiplier = OPTION_MULTIPLIER; }
      else if (type === "FUTURE" || symbol.startsWith("/")) { assetClass = "future"; multiplier = defaultMultiplierFor("future", symbol) ?? undefined; }
      if (!need(errors, row, !!s && !!symbol && qty > 0 && price > 0 && !!at, "missing side, symbol, qty, price or time")) return;
      fills.push({ symbol, side: s!, quantity: qty, price, at: at!, fees: 0, assetClass, multiplier, row });
    });
    return { fills, errors, warnings: ["Thinkorswim's trade history has no commissions; add fees per trade if you want net figures."] };
  },
};

const ibkr: Preset = {
  id: "ibkr", name: "Interactive Brokers (Flex Query)", kind: "fills", signature: ["symbol", "datetime", "quantity", "tradeprice", "buy/sell"],
  formats: "Flex Query → Trades (CSV) with Symbol, AssetClass, Multiplier, DateTime, Buy/Sell, Quantity, TradePrice, IBCommission.", help: "IBKR: Performance & Reports → Flex Queries → Trades, format CSV.",
  parse(rows, ctx, first) {
    const errors: RowError[] = []; const fills: Fill[] = []; let ignored = 0;
    const AC: Record<string, AssetClass> = { STK: "stock", OPT: "option", FOP: "option", FUT: "future", CASH: "forex", CRYPTO: "crypto" };
    rows.forEach((r, i) => {
      const row = first + i;
      if ((r["levelofdetail"] ?? "EXECUTION").toUpperCase() !== "EXECUTION") { ignored++; return; }
      const s = side(r["buy/sell"] ?? ""), qty = Math.abs(num(r.quantity)), price = num(r.tradeprice), at = parseBrokerTime(r.datetime ?? r["date/time"], ctx.tz, "ymd");
      const rawSym = cleanSymbol(r.symbol ?? ""), assetClass = AC[(r.assetclass ?? "").toUpperCase()] ?? guessAssetClass(rawSym);
      const symbol = assetClass === "forex" ? rawSym.replace(/[^A-Z]/g, "") : rawSym;
      const m = num(r.multiplier);
      if (!need(errors, row, !!s && !!symbol && qty > 0 && price > 0 && !!at, "missing side, symbol, quantity, price or time")) return;
      // IB CASH (forex) quantities are in units of the base currency; convert to lots so sizes match manual entries.
      const fx = assetClass === "forex";
      fills.push({ symbol, side: s!, quantity: fx ? r8(qty / FOREX_LOT) : qty, price, at: at!, fees: Math.abs(num(r.ibcommission) || 0), assetClass, multiplier: fx ? FOREX_LOT : m > 0 ? m : undefined, row });
    });
    return { fills, errors, ignoredRows: ignored, warnings: ["IB commissions are in the commission currency; if that differs from the trade currency, check fees on affected trades."] };
  },
};

const tradingview: Preset = {
  id: "tradingview", name: "TradingView (Paper Trading)", kind: "fills", signature: ["symbol", "side", "qty", "fill price", "status", "closing time"],
  formats: "Paper Trading → History/Orders export (CSV); filled orders only.", help: "TradingView: Trading Panel → Paper Trading → History → Export data.",
  parse(rows, ctx, first) {
    const errors: RowError[] = []; const fills: Fill[] = []; let ignored = 0;
    rows.forEach((r, i) => {
      const row = first + i;
      if (!/^filled$/i.test((r.status ?? "").trim())) { ignored++; return; }
      const s = side(r.side ?? ""), qty = Math.abs(num(r.qty)), price = num(r["fill price"]), at = parseBrokerTime(r["closing time"], ctx.tz, "ymd");
      const symbol = cleanSymbol(r.symbol ?? "");
      if (!need(errors, row, !!s && !!symbol && qty > 0 && price > 0 && !!at, "missing side, symbol, qty, fill price or time")) return;
      const ac = guessAssetClass(symbol);
      fills.push({ symbol, side: s!, quantity: qty, price, at: at!, fees: Math.abs(num(r.commission) || 0), assetClass: ac, row });
    });
    return { fills, errors, ignoredRows: ignored };
  },
};

const webull: Preset = {
  id: "webull", name: "Webull", kind: "fills", signature: ["symbol", "side", "status", "filled", "avg price", "filled time"],
  formats: "Orders export (CSV); filled orders only. Webull does not include fees in this export.", help: "Webull desktop: Orders → Order history → Export.",
  parse(rows, ctx, first) {
    const errors: RowError[] = []; const fills: Fill[] = []; let ignored = 0;
    rows.forEach((r, i) => {
      const row = first + i;
      if (!/^filled$/i.test((r.status ?? "").trim())) { ignored++; return; }
      const s = side(r.side ?? ""), qty = Math.abs(num(r.filled)), price = num(r["avg price"]), at = parseBrokerTime(r["filled time"], ctx.tz, "mdy");
      const symbol = cleanSymbol(r.symbol ?? "");
      if (!need(errors, row, !!s && !!symbol && qty > 0 && price > 0 && !!at, "missing side, symbol, filled qty, price or time")) return;
      fills.push({ symbol, side: s!, quantity: qty, price, at: at!, fees: 0, assetClass: "stock", row });
    });
    return { fills, errors, ignoredRows: ignored };
  },
};

/** Split "0.01234BTC" into number + asset. */
const amountAsset = (v: string) => { const m = String(v ?? "").trim().match(/^(-?[\d.,]+)\s*([A-Za-z]+)?$/); return m ? { n: num(m[1]), asset: (m[2] ?? "").toUpperCase() } : { n: NaN, asset: "" }; };
const QUOTES = ["USDT", "USDC", "FDUSD", "BUSD", "TUSD", "USD", "EUR", "BTC", "ETH", "BNB"];
const quoteOf = (pair: string) => QUOTES.find((q) => pair.endsWith(q) && pair.length > q.length) ?? "";

const binanceSpot: Preset = {
  id: "binance-spot", name: "Binance (spot)", kind: "fills", utc: true, signature: ["date(utc)", "pair", "side", "price", "executed", "amount", "fee"],
  formats: "Spot Order → Trade History export (CSV, UTC).", help: "Binance: Orders → Spot Order → Trade History → Export.",
  parse(rows, _ctx, first) {
    const errors: RowError[] = []; const fills: Fill[] = []; let unconverted = 0;
    rows.forEach((r, i) => {
      const row = first + i;
      const pair = cleanSymbol(r.pair ?? ""), s = side(r.side ?? ""), price = num(r.price), ex = amountAsset(r.executed ?? ""), fee = amountAsset(r.fee ?? "");
      const at = parseBrokerTime(r["date(utc)"], "UTC", "ymd");
      if (!need(errors, row, !!s && !!pair && ex.n > 0 && price > 0 && !!at, "missing pair, side, executed amount, price or time")) return;
      const quote = quoteOf(pair), base = pair.slice(0, pair.length - quote.length);
      let fees = 0;
      if (fee.n > 0) { if (fee.asset === quote) fees = fee.n; else if (fee.asset === base) fees = r8(fee.n * price); else unconverted++; }
      fills.push({ symbol: pair, side: s!, quantity: ex.n, price, at: at!, fees, assetClass: "crypto", multiplier: 1, row });
    });
    return { fills, errors, warnings: unconverted ? [`${unconverted} fee(s) were paid in a third asset (e.g. BNB) and are not included in fees.`] : [] };
  },
};

const binanceFutures: Preset = {
  id: "binance-futures", name: "Binance (USDⓈ-M futures)", kind: "fills", utc: true, signature: ["time(utc)", "symbol", "side", "price", "quantity", "fee", "realized profit"],
  formats: "Futures → Trade History export (CSV, UTC).", help: "Binance: Orders → Futures Order → Trade History → Export.",
  parse(rows, _ctx, first) {
    const errors: RowError[] = []; const fills: Fill[] = [];
    rows.forEach((r, i) => {
      const row = first + i;
      const symbol = cleanSymbol(r.symbol ?? ""), s = side(r.side ?? ""), price = num(r.price), qty = Math.abs(num(r.quantity)), at = parseBrokerTime(r["time(utc)"], "UTC", "ymd");
      if (!need(errors, row, !!s && !!symbol && qty > 0 && price > 0 && !!at, "missing symbol, side, quantity, price or time")) return;
      fills.push({ symbol, side: s!, quantity: qty, price, at: at!, fees: Math.abs(amountAsset(r.fee ?? "").n || 0), assetClass: "crypto", multiplier: 1, row });
    });
    return { fills, errors };
  },
};

const bybitSpot: Preset = {
  id: "bybit-spot", name: "Bybit (spot)", kind: "fills", utc: true, signature: ["spot pairs", "direction", "filled price", "filled quantity", "fees"],
  formats: "Spot → Trade History export (CSV, UTC).", help: "Bybit: Orders → Spot Order → Trade History → Export.",
  parse(rows, _ctx, first) {
    const errors: RowError[] = []; const fills: Fill[] = []; let unconverted = 0;
    rows.forEach((r, i) => {
      const row = first + i;
      const pair = cleanSymbol((r["spot pairs"] ?? "").replace("/", "")), s = side(r.direction ?? ""), price = num(r["filled price"]), qty = num(r["filled quantity"]);
      const at = parseBrokerTime(r["timestamp (utc)"] ?? r["transaction time"] ?? r.timestamp, "UTC", "ymd");
      if (!need(errors, row, !!s && !!pair && qty > 0 && price > 0 && !!at, "missing pair, direction, quantity, price or time")) return;
      const fee = amountAsset(r.fees ?? ""), quote = quoteOf(pair), base = pair.slice(0, pair.length - quote.length);
      let fees = 0;
      if (fee.n > 0) { if (!fee.asset || fee.asset === quote) fees = fee.n; else if (fee.asset === base) fees = r8(fee.n * price); else unconverted++; }
      fills.push({ symbol: pair, side: s!, quantity: qty, price, at: at!, fees, assetClass: "crypto", multiplier: 1, row });
    });
    return { fills, errors, warnings: unconverted ? [`${unconverted} fee(s) were paid in a third asset and are not included in fees.`] : [] };
  },
};

/** Detection order matters only where signatures overlap (more specific first). */
export const PRESETS: Preset[] = [metatrader, metatrader4, ctrader, tradovate, ninjatrader, bybitPnl, thinkorswim, ibkr, tradingview, webull, binanceFutures, binanceSpot, bybitSpot];
export const PRESET_LIST = PRESETS.filter((p) => p.id !== "metatrader4").map((p) => ({ id: p.id, name: p.name, formats: p.formats, help: p.help }));

/** Find a preset whose signature matches a header row anywhere in the file (statements often have preamble rows). */
export function detectPreset(text: string): Preset | null {
  const table = readTable(text, looksLikeHtml(text));
  for (const p of PRESETS) if (recordsFrom(table, p.signature)) return p;
  return null;
}
export const presetById = (id: string) => PRESETS.find((p) => p.id === id) ?? (id === "metatrader" ? metatrader : null);

/** Parse a file with a preset (auto-detected when `presetId` is "auto"). MetaTrader's two layouts are tried together. */
export function parseWithPreset(text: string, presetId: string, ctx: Ctx): { preset: Preset | null; result: ParseResult } {
  const table = readTable(text, looksLikeHtml(text));
  const candidates = presetId === "auto" ? PRESETS : PRESETS.filter((p) => p.id === presetId || (presetId === "metatrader" && p.id === "metatrader4"));
  for (const p of candidates) {
    const rec = recordsFrom(table, p.signature);
    if (!rec) continue;
    const out = p.parse(rec.rows, ctx, rec.firstRow);
    let trades = out.trades ?? [], openPositions = 0;
    if (out.fills) ({ trades, openPositions } = groupFills(out.fills));
    const seen = new Set<string>(); let dups = 0;
    trades = trades.filter((t) => (seen.has(t.fingerprint) ? (dups++, false) : (seen.add(t.fingerprint), true)));
    const warnings = [...(out.warnings ?? [])];
    if (dups) warnings.push(`${dups} duplicate row(s) in the file were skipped.`);
    const unknownMult = trades.filter((t) => t.multiplier === null).length;
    if (unknownMult) warnings.push(`${unknownMult} trade(s) are futures we don't have specs for; their point value is set to 1. Edit them to set the right value.`);
    return { preset: p.id === "metatrader4" ? metatrader : p, result: { trades, errors: out.errors, warnings, openPositions, ignoredRows: out.ignoredRows ?? 0 } };
  }
  return { preset: null, result: { trades: [], errors: [{ row: 0, message: presetId === "auto" ? "We didn't recognise this file. Use manual column mapping." : "This file doesn't match the chosen broker format." }], warnings: [], openPositions: 0, ignoredRows: 0 } };
}

/** Manual mapping (generic CSV, one row per round trip) converted to the same shape; naive times read in the user's time zone. */
export function parseManual(text: string, mapping: ColumnMapping, assetClass: AssetClass, ctx: Ctx): ParseResult {
  const p = previewImport(text, mapping, (v) => parseBrokerTime(v, ctx.tz, ctx.dateOrder));
  const trades = p.valid.map((t) => trade({
    symbol: t.symbol, side: t.side, quantity: t.quantity, entryPrice: t.entryPrice, exits: [{ quantity: t.quantity, price: t.exitPrice, at: t.closedAt ?? t.openedAt }],
    openedAt: t.openedAt, closedAt: t.closedAt ?? t.openedAt, fees: t.fees, assetClass, multiplier: defaultMultiplierFor(assetClass, t.symbol), brokerNet: null,
  }));
  return { trades, errors: p.errors, warnings: p.duplicatesInFile ? [`${p.duplicatesInFile} duplicate row(s) in the file were skipped.`] : [], openPositions: 0, ignoredRows: 0 };
}

/** Validation report: totals by our engine vs the broker's own net P&L where the export states it. */
export function reconcile(trades: ImportedTrade[]): { count: number; netOurs: number; netBroker: number | null; withBroker: number; mismatches: number } {
  let netOurs = 0, netBroker = 0, withBroker = 0, mismatches = 0;
  for (const t of trades) {
    const dir = t.side === "long" ? 1 : -1, m = t.multiplier ?? 1;
    const net = t.exits.reduce((s, e) => s + dir * (e.price - t.entryPrice) * e.quantity * m, 0) - t.fees;
    netOurs += net;
    if (t.brokerNet !== null) { withBroker++; netBroker += t.brokerNet; if (Math.abs(net - t.brokerNet) > 0.01) mismatches++; }
  }
  return { count: trades.length, netOurs: Math.round(netOurs * 100) / 100, netBroker: withBroker ? Math.round(netBroker * 100) / 100 : null, withBroker, mismatches };
}
