import Papa from "papaparse";

/**
 * Generic CSV import: user maps their broker's columns onto these fields.
 * One CSV row = one round-trip trade (entry + full exit). Broker-specific
 * fill-level presets are P1 (see docs/FEATURE_ROADMAP.md).
 */
/** Upload cap (also enforced server-side). */
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export const IMPORT_FIELDS = [
  "symbol", "side", "quantity", "entryPrice", "exitPrice", "openedAt", "closedAt", "fees",
] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];
export const REQUIRED_FIELDS: ImportField[] = ["symbol", "side", "quantity", "entryPrice", "exitPrice", "openedAt"];

export type ColumnMapping = Partial<Record<ImportField, string>>;

export interface ParsedTrade {
  symbol: string;
  side: "long" | "short";
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  openedAt: string;
  closedAt: string | null;
  fees: number;
  fingerprint: string;
}

export interface RowError { row: number; message: string }

export interface ImportPreview {
  headers: string[];
  valid: ParsedTrade[];
  errors: RowError[];
  duplicatesInFile: number;
}

const ALIASES: Record<ImportField, string[]> = {
  symbol: ["symbol", "ticker", "instrument", "market", "pair"],
  side: ["side", "direction", "type", "buy/sell", "action"],
  quantity: ["quantity", "qty", "size", "volume", "lots", "contracts", "shares"],
  entryPrice: ["entry price", "entry", "open price", "avg entry", "price open"],
  exitPrice: ["exit price", "exit", "close price", "avg exit", "price close"],
  openedAt: ["open time", "opened at", "entry time", "open date", "date", "time"],
  closedAt: ["close time", "closed at", "exit time", "close date"],
  fees: ["fees", "commission", "commissions", "fee"],
};

export function guessMapping(headers: string[]): ColumnMapping {
  const norm = (h: string) => h.trim().toLowerCase().replace(/[_\-]+/g, " ");
  const m: ColumnMapping = {};
  const used = new Set<string>();
  for (const f of IMPORT_FIELDS) {
    const h = headers.find((h) => !used.has(h) && ALIASES[f].includes(norm(h)));
    if (h) { m[f] = h; used.add(h); }
  }
  return m;
}

function parseNumber(v: unknown): number {
  if (typeof v !== "string") return NaN;
  const s = v.trim().replace(/[$,\s]/g, "").replace(/^\((.*)\)$/, "-$1");
  return s === "" ? NaN : Number(s);
}

function parseSide(v: unknown): "long" | "short" | null {
  const s = String(v ?? "").trim().toLowerCase();
  if (["long", "buy", "b", "bot", "bought"].includes(s)) return "long";
  if (["short", "sell", "s", "sld", "sold", "sell short"].includes(s)) return "short";
  return null;
}

function parseDate(v: unknown): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/** Stable identity used for duplicate detection across imports (unique per account in DB). */
export function fingerprint(t: Omit<ParsedTrade, "fingerprint">): string {
  return [t.symbol.toUpperCase(), t.side, t.quantity, t.entryPrice, t.exitPrice, t.openedAt, t.closedAt ?? ""].join("|");
}

export function previewImport(csv: string, mapping: ColumnMapping): ImportPreview {
  const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true });
  const headers = parsed.meta.fields ?? [];
  const errors: RowError[] = [];
  const missing = REQUIRED_FIELDS.filter((f) => !mapping[f] || !headers.includes(mapping[f]!));
  if (missing.length) {
    return { headers, valid: [], errors: [{ row: 0, message: `Map required columns: ${missing.join(", ")}` }], duplicatesInFile: 0 };
  }
  const seen = new Set<string>();
  const valid: ParsedTrade[] = [];
  let dups = 0;
  parsed.data.forEach((r, i) => {
    const row = i + 2; // header is row 1
    const get = (f: ImportField) => (mapping[f] ? r[mapping[f]!] : undefined);
    const symbol = String(get("symbol") ?? "").trim();
    const side = parseSide(get("side"));
    const quantity = Math.abs(parseNumber(get("quantity")));
    const entryPrice = parseNumber(get("entryPrice"));
    const exitPrice = parseNumber(get("exitPrice"));
    const openedAt = parseDate(get("openedAt"));
    const closedAt = mapping.closedAt ? parseDate(get("closedAt")) : null;
    const feesRaw = mapping.fees ? get("fees") : undefined;
    const fees = feesRaw === undefined || String(feesRaw).trim() === "" ? 0 : Math.abs(parseNumber(feesRaw));

    const problems: string[] = [];
    if (!symbol) problems.push("symbol is empty");
    if (!side) problems.push(`unrecognised side "${get("side") ?? ""}"`);
    if (!(quantity > 0)) problems.push("quantity must be a positive number");
    if (!(entryPrice > 0)) problems.push("entry price must be positive");
    if (!(exitPrice > 0)) problems.push("exit price must be positive");
    if (!openedAt) problems.push("open time is not a valid date");
    if (mapping.closedAt && get("closedAt") && !closedAt) problems.push("close time is not a valid date");
    if (Number.isNaN(fees)) problems.push("fees is not a number");
    if (closedAt && openedAt && closedAt < openedAt) problems.push("close time is before open time");
    if (problems.length) { errors.push({ row, message: problems.join("; ") }); return; }

    const base = { symbol: symbol.toUpperCase(), side: side!, quantity, entryPrice, exitPrice, openedAt: openedAt!, closedAt, fees };
    const fp = fingerprint(base);
    if (seen.has(fp)) { dups++; return; }
    seen.add(fp);
    valid.push({ ...base, fingerprint: fp });
  });
  return { headers, valid, errors, duplicatesInFile: dups };
}
