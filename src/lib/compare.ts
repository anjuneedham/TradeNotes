import { summarizeResults, type Summary, type TradeResult } from "./metrics";
import { downsampleCurve } from "./curve";

/**
 * Strategy comparison (Premium). Pure logic, no I/O: the page loads the user's REAL closed trades once (same loader and filters as the
 * dashboard) and this groups them by strategy name and summarises each group with the one metrics engine, so a number here equals the same
 * number on the analytics page for that strategy and filter. Hypothetical (backtest) trades are never an input.
 */
export const MIN_COMPARE = 2;
export const MAX_COMPARE = 4;

type Raw = Record<string, string | string[] | undefined> | URLSearchParams | undefined | null;
const CONTROL = /[\u0000-\u001f\u007f]/;

/** `?s=<name>` repeated. Trimmed, de-duplicated, at most MAX_COMPARE, in the order given; garbage is dropped, never thrown. */
export function parseSelection(sp: Raw, known?: readonly string[]): string[] {
  if (!sp) return [];
  const raw = sp instanceof URLSearchParams ? sp.getAll("s") : sp.s === undefined ? [] : Array.isArray(sp.s) ? sp.s : [sp.s];
  const out: string[] = [];
  for (const v of raw) {
    const t = v.trim();
    if (t.length < 1 || t.length > 60 || CONTROL.test(t) || out.includes(t)) continue;
    if (known && !known.includes(t)) continue;
    out.push(t);
    if (out.length >= MAX_COMPARE) break;
  }
  return out;
}

export interface CompareColumn {
  name: string;
  summary: Summary;
  /** Equity curve thinned for display only (every statistic comes from the full series). */
  curve: { cumulative: number; n: number }[];
}

export function compareStrategies<T extends TradeResult & { strategy: string | null }>(rows: readonly T[], names: readonly string[]): CompareColumn[] {
  return names.map((name) => {
    const summary = summarizeResults(rows.filter((r) => r.strategy === name));
    return { name, summary, curve: downsampleCurve(summary.equityCurve, 300).map((p) => ({ cumulative: p.cumulative, n: p.n })) };
  });
}

/** Colour-blind-safe series colours (Okabe-Ito) plus a different line style per series, so colour is never the only signal. */
export const SERIES = [
  { color: "#0072B2", dash: undefined, label: "solid line" },
  { color: "#E69F00", dash: "7 4", label: "dashed line" },
  { color: "#009E73", dash: "2 3", label: "dotted line" },
  { color: "#CC79A7", dash: "9 3 2 3", label: "dash-dot line" },
] as const;
