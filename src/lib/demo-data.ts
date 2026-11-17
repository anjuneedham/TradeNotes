import { evaluateTrade, type TradeInput } from "./metrics";
import type { ResultRow } from "./trades-data";

/**
 * Sample journal for the public /demo. FICTIONAL: generated in code from a fixed seed, so it is identical on every request, needs no database and
 * no account, and never contains anyone's real trades. Every page that shows it carries a SAMPLE DATA banner.
 *
 * The dates are fixed (January to October 2026) and `DEMO_NOW` is the fixed "today" the demo pages use for "last 30 days", so the demo
 * does not drift empty as real time passes. Results go through the same engine (metrics.ts `evaluateTrade`) as real trades.
 */
export const DEMO_NOW = new Date("2026-10-31T21:00:00Z");
export const DEMO_CURRENCY = "USD";
export const DEMO_TZ = "UTC";
export const DEMO_ACCOUNT = "Sample account";

export interface DemoTrade {
  id: string; symbol: string; assetClass: "forex" | "future" | "stock"; side: "long" | "short";
  quantity: number; entryPrice: number; stopPrice: number; targetPrice: number; exits: { quantity: number; price: number }[];
  fees: number; multiplier: number; initialRisk: number; openedAt: string; closedAt: string;
  strategy: string; session: string; timeframe: string; emotions: string[]; mistakes: string[];
  preNotes: string; postNotes: string; lesson: string; checksDone: number; checksTotal: number;
}

/** mulberry32: a tiny deterministic PRNG (the same sequence for the same seed, on every machine). */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const INSTRUMENTS = [
  { symbol: "EURUSD", cls: "forex" as const, mult: 100000, dec: 5, stop: [0.0008, 0.0022], size: [0.5, 2], fee: 3.5, step: 0, session: ["London", "London/NY overlap", "New York"] },
  { symbol: "GBPUSD", cls: "forex" as const, mult: 100000, dec: 5, stop: [0.0010, 0.0028], size: [0.5, 1.5], fee: 3.5, step: 0, session: ["London", "London/NY overlap"] },
  { symbol: "AUDUSD", cls: "forex" as const, mult: 100000, dec: 5, stop: [0.0006, 0.0018], size: [1, 2.5], fee: 3.5, step: 0, session: ["Asia", "London"] },
  { symbol: "ES", cls: "future" as const, mult: 50, dec: 2, stop: [4, 9], size: [1, 2], fee: 4.5, step: 0.25, session: ["New York"] },
  { symbol: "AAPL", cls: "stock" as const, mult: 1, dec: 2, stop: [1.2, 3.2], size: [50, 150], fee: 1, step: 0, session: ["New York"] },
];
const STRATEGIES = ["London breakout", "Trend pullback", "Range fade", "News fade"] as const;
const EMOTIONS = ["Calm", "Confident", "Anxious", "FOMO", "Hesitant", "Frustrated"] as const;
const MISTAKE_TAGS = ["Moved stop", "Chased price", "Entered early", "Oversized", "Broke rules", "Held too long"] as const;
const PRE: Record<string, string> = {
  "London breakout": "Asian range is tight; waiting for the London open to break it with a close outside the range.",
  "Trend pullback": "Higher-timeframe trend intact. Looking for a pullback to the 20 EMA with a rejection candle.",
  "Range fade": "Price is stuck between clear levels. Fading the edge with a tight stop beyond it.",
  "News fade": "Spike on the release looks overdone. Fading the first move once momentum stalls.",
};
const post = (win: boolean, mistake: boolean) => win ? (mistake ? "Worked out, but only because I got lucky with the stop. Not repeatable." : "Followed the plan, took profit at target.") : (mistake ? "Broke my own rule and paid for it. The setup itself was fine." : "Stopped out for a normal 1R loss. Nothing wrong with the process.");
const LESSON = (win: boolean, mistake: boolean) => mistake ? "When I move a stop I am no longer trading the plan." : win ? "Waiting for the full confirmation paid off." : "A clean loss is the cost of doing business. Keep size consistent.";

const round = (x: number, d: number) => Math.round(x * 10 ** d) / 10 ** d;
const pick = <T,>(r: () => number, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];
const between = (r: () => number, [lo, hi]: number[]) => lo + r() * (hi - lo);
const pad = (n: number, w = 2) => String(n).padStart(w, "0");
const iso = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, ".000Z");

function generate(): DemoTrade[] {
  const r = mulberry32(20261101);
  const out: DemoTrade[] = [];
  const start = Date.UTC(2026, 0, 5), end = Date.UTC(2026, 9, 30);
  for (let day = start; day <= end; day += 86400000) {
    const dow = new Date(day).getUTCDay();
    if (dow === 0 || dow === 6) continue;
    const n = r() < 0.34 ? 0 : r() < 0.7 ? 1 : 2;
    for (let k = 0; k < n; k++) {
      const ins = pick(r, INSTRUMENTS);
      const strategy = pick(r, STRATEGIES);
      const side: "long" | "short" = r() < 0.5 ? "long" : "short";
      const dist = between(r, ins.stop);
      const stopDist = ins.step ? Math.max(ins.step, Math.round(dist / ins.step) * ins.step) : round(dist, ins.dec);
      const size = ins.cls === "stock" ? Math.round(between(r, ins.size)) : round(between(r, ins.size), ins.cls === "future" ? 0 : 1) || 1;
      const entry = ins.symbol === "EURUSD" ? round(1.04 + r() * 0.1, 5) : ins.symbol === "GBPUSD" ? round(1.22 + r() * 0.1, 5) : ins.symbol === "AUDUSD" ? round(0.63 + r() * 0.06, 5) : ins.symbol === "ES" ? Math.round((5400 + r() * 500) * 4) / 4 : round(190 + r() * 40, 2);
      const sgn = side === "long" ? 1 : -1;
      const stop = round(entry - sgn * stopDist, ins.dec);
      const plannedR = pick(r, [1.5, 2, 2, 2.5, 3]);
      const target = round(entry + sgn * stopDist * plannedR, ins.dec);
      // Discipline story for the demo (fictional): trades where more of the playbook was followed win a bit more often.
      const checksTotal = 4;
      const checksDone = r() < 0.62 ? 4 : r() < 0.6 ? 3 : r() < 0.55 ? 2 : 1;
      const mistake = (checksDone < 3 && r() < 0.55) || r() < 0.06;
      const mistakeTags = mistake ? [pick(r, MISTAKE_TAGS)] : [];
      const pWin = strategy === "Trend pullback" ? 0.5 : strategy === "London breakout" ? 0.44 : strategy === "Range fade" ? 0.47 : 0.38;
      const win = r() < pWin + (checksDone === 4 ? 0.07 : -0.07) - (mistake ? 0.1 : 0);
      let rMult: number;
      if (win) rMult = plannedR * (0.55 + r() * 0.45); // took most of the target
      else rMult = mistake && r() < 0.5 ? -(1.2 + r() * 0.8) : -(0.9 + r() * 0.1); // normal loss, or a loss larger than planned after a mistake
      const exitPrice = round(entry + sgn * stopDist * rMult, ins.dec);
      const session = pick(r, ins.session);
      const hour = ins.cls === "stock" || ins.symbol === "ES" ? 14 + Math.floor(r() * 5) : session === "Asia" ? 1 + Math.floor(r() * 5) : session === "London" ? 7 + Math.floor(r() * 4) : session === "London/NY overlap" ? 12 + Math.floor(r() * 3) : 14 + Math.floor(r() * 4);
      const opened = new Date(day + (hour * 60 + Math.floor(r() * 60)) * 60000);
      const held = (10 + Math.floor(r() * 230)) * 60000;
      const closed = new Date(opened.getTime() + held);
      const fees = round(ins.fee * (ins.cls === "stock" ? Math.max(1, size / 100) : size), 2);
      const emotions = [pick(r, EMOTIONS)];
      out.push({
        id: `demo-${pad(out.length + 1, 3)}`, symbol: ins.symbol, assetClass: ins.cls, side,
        quantity: size, entryPrice: entry, stopPrice: stop, targetPrice: target, exits: [{ quantity: size, price: exitPrice }],
        fees, multiplier: ins.mult, initialRisk: round(stopDist * size * ins.mult, 2), openedAt: iso(opened), closedAt: iso(closed),
        strategy, session, timeframe: ins.cls === "forex" ? "M15" : "M5", emotions, mistakes: mistakeTags,
        preNotes: PRE[strategy], postNotes: post(win, mistake), lesson: LESSON(win, mistake), checksDone, checksTotal,
      });
    }
  }
  return out;
}

let cache: DemoTrade[] | null = null;
/** The sample trades, oldest first. Generated once per server process. */
export const demoTrades = (): DemoTrade[] => (cache ??= generate());
export const demoTrade = (id: string): DemoTrade | undefined => demoTrades().find((t) => t.id === id);

export const demoInput = (t: DemoTrade): TradeInput => ({
  id: t.id, side: t.side, quantity: t.quantity, entryPrice: t.entryPrice, exits: t.exits, fees: t.fees, multiplier: t.multiplier,
  initialRisk: t.initialRisk, sameCurrencyAsAccount: true, closedAt: t.closedAt,
});

/** Per-trade results in the shape the dashboard and analytics components read (the same ResultRow the real pages build from SQL). */
export function demoRows(): ResultRow[] {
  const rows: ResultRow[] = [];
  for (const t of demoTrades()) {
    const res = evaluateTrade(demoInput(t));
    if (typeof res === "string") continue; // every sample trade is fully closed
    rows.push({ ...res, symbol: t.symbol, side: t.side, session: t.session, strategy: t.strategy, openedAt: t.openedAt, mistakes: t.mistakes, emotions: t.emotions, checksDone: t.checksDone, checksTotal: t.checksTotal });
  }
  return rows;
}
