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
  /** The owner's choice per link. When false every money field below is null and the curve is rescaled (see buildReport). */
  showAmounts: boolean;
  trades: number; wins: number; losses: number; breakevens: number;
  winRate: number | null; profitFactor: number | null; avgR: number | null; rTrades: number;
  maxWinStreak: number; maxLossStreak: number; smallSample: boolean;
  /** Money amounts: null unless the owner chose to show them. */
  netPnl: number | null; expectancy: number | null; avgWin: number | null; avgLoss: number | null; maxDrawdown: number | null;
  /** Cumulative net P&L by trade number (money amounts) when shown; otherwise the SAME shape rescaled to the range -1..1 (no currency, no size). No dates and no trade ids. */
  curve: { cumulative: number; n: number }[];
  curveTotal: number;
}

/**
 * `showAmounts` is required (no default) so a caller cannot forget to decide. When false the report carries ratios and counts only: win rate,
 * profit factor, average R, streaks, and the SHAPE of the equity curve rescaled so its largest absolute value is 1. The money fields are null,
 * so they cannot reach the browser, whatever the page does with them.
 */
export function buildReport(rows: readonly TradeResult[], scope: string, currency: string, opts: { showAmounts: boolean; now?: Date }): ShareReport {
  const s: Summary = summarizeResults(rows);
  const show = opts.showAmounts;
  const pts = downsampleCurve(s.equityCurve, 300);
  const peak = Math.max(0, ...pts.map((p) => Math.abs(p.cumulative)));
  const scaled = (v: number) => (peak > 0 ? Math.round((v / peak) * 1e4) / 1e4 : 0);
  return {
    scope, scopeLabel: scopeLabel(scope), currency, generatedOn: (opts.now ?? new Date()).toISOString().slice(0, 10), showAmounts: show,
    trades: s.tradeCount, wins: s.wins, losses: s.losses, breakevens: s.breakevens,
    winRate: s.winRate, profitFactor: s.profitFactor, avgR: s.avgR, rTrades: s.rCoverage.withR,
    maxWinStreak: s.maxWinStreak, maxLossStreak: s.maxLossStreak, smallSample: s.smallSample,
    netPnl: show ? s.netPnl : null, expectancy: show ? s.expectancy : null, avgWin: show ? s.avgWin : null, avgLoss: show ? s.avgLoss : null, maxDrawdown: show ? s.maxDrawdown : null,
    curve: pts.map((p) => ({ cumulative: show ? p.cumulative : scaled(p.cumulative), n: p.n })),
    curveTotal: s.equityCurve.length,
  };
}
