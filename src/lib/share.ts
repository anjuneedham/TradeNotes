import { summarizeResults, type Summary, type TradeResult } from "./metrics";
import { downsampleCurve } from "./curve";
import type { RangeId } from "./filters";

/**
 * Share links: an owner-controlled, revocable, read-only public report of AGGREGATE results.
 *
 * What a link can ever show is decided here, by the `ShareReport` type: counts, rates, totals and an equity curve, nothing else.
 * There is deliberately no field for notes, tags, instrument names, strategy names, account names, e-mail addresses, screenshots or
 * per-trade dates, so a page built from this type cannot leak them (tests also scan the rendered HTML for planted private strings).
 *
 * The token is 256 random bits. Only its SHA-256 hash is stored (tradenotes.share_links.token_hash), so a database leak does not
 * expose working links. The token itself is shown to the owner once, at creation.
 */
export const SHARE_SCOPES = [
  { value: "all", label: "All time", range: "all" },
  { value: "ytd", label: "This year", range: "ytd" },
  { value: "90d", label: "Last 90 days", range: "90d" },
  { value: "30d", label: "Last 30 days", range: "30d" },
] as const satisfies readonly { value: string; label: string; range: RangeId }[];
export type ShareScope = (typeof SHARE_SCOPES)[number]["value"];
export const EXPIRY_DAYS = [7, 30, 90] as const;
export const DEFAULT_EXPIRY_DAYS = 30;
export const MAX_ACTIVE_LINKS = 5;

export const parseScope = (v: unknown): ShareScope | null => SHARE_SCOPES.find((s) => s.value === v)?.value ?? null;
export const scopeLabel = (v: string) => SHARE_SCOPES.find((s) => s.value === v)?.label ?? "All time";
export const scopeRange = (v: string): RangeId => SHARE_SCOPES.find((s) => s.value === v)?.range ?? "all";
export const parseExpiryDays = (v: unknown): number | null => { const n = Number(v); return (EXPIRY_DAYS as readonly number[]).includes(n) ? n : null; };
/** Label: trimmed, control characters removed, at most 60 characters. */
export const cleanLabel = (v: unknown): string | null => { const t = String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 60); return t || null; };

export type LinkStatus = "active" | "expired" | "revoked";
export function linkStatus(l: { expires_at: string; revoked_at: string | null }, now = new Date()): LinkStatus {
  if (l.revoked_at) return "revoked";
  return new Date(l.expires_at).getTime() > now.getTime() ? "active" : "expired";
}

/** The ONLY data a public report page receives. */
export interface ShareReport {
  scope: string;
  scopeLabel: string;
  currency: string;
  generatedOn: string; // YYYY-MM-DD
  trades: number; wins: number; losses: number; breakevens: number;
  winRate: number | null; netPnl: number; profitFactor: number | null; expectancy: number | null;
  avgWin: number | null; avgLoss: number | null; avgR: number | null; rTrades: number; maxDrawdown: number;
  maxWinStreak: number; maxLossStreak: number; smallSample: boolean;
  /** Cumulative net P&L by trade number. No dates and no trade ids: the dates of individual trades are not shared. */
  curve: { cumulative: number; n: number }[];
  curveTotal: number;
}

export function buildReport(rows: readonly TradeResult[], scope: string, currency: string, now = new Date()): ShareReport {
  const s: Summary = summarizeResults(rows);
  return {
    scope, scopeLabel: scopeLabel(scope), currency, generatedOn: now.toISOString().slice(0, 10),
    trades: s.tradeCount, wins: s.wins, losses: s.losses, breakevens: s.breakevens,
    winRate: s.winRate, netPnl: s.netPnl, profitFactor: s.profitFactor, expectancy: s.expectancy,
    avgWin: s.avgWin, avgLoss: s.avgLoss, avgR: s.avgR, rTrades: s.rCoverage.withR, maxDrawdown: s.maxDrawdown,
    maxWinStreak: s.maxWinStreak, maxLossStreak: s.maxLossStreak, smallSample: s.smallSample,
    curve: downsampleCurve(s.equityCurve, 300).map((p) => ({ cumulative: p.cumulative, n: p.n })),
    curveTotal: s.equityCurve.length,
  };
}
