import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { evaluateTrade, summarize, summarizeResults, type TradeInput } from "./metrics";
import { toTradeInputs, type ExitRow } from "./trade-schema";
import { parseFilters, dateWindow, type Filters } from "./filters";

// Integration test (real Postgres with db/paste applied): the SQL per-trade result must equal metrics.ts `evaluateTrade`, and every aggregate
// computed from the SQL rows must equal `summarize` on the same trades, on a seeded 10,000+ trade journal. Runs only when
// FOUNDING_TEST_DATABASE_URL is set (CI database job; locally `FOUNDING_TEST_DATABASE_URL=postgresql://... npx vitest run src/lib/aggregate.db.test.ts`).
const url = process.env.FOUNDING_TEST_DATABASE_URL;
const require = createRequire(import.meta.url);

interface OracleRow {
  id: string; side: "long" | "short"; quantity: string; entry_price: string; fees: string; multiplier: string; initial_risk: string | null; currency: string | null;
  fx_to_account: string | null; closed_at: string | null; opened_at: string; account_currency: string; strategy: string | null; mistakes: string[]; emotions: string[]; exits: ExitRow[];
}

/** The pre-SQL pipeline: DB rows -> TradeInput (display currency rule as in the old toExt) -> evaluateTrade. */
function oracle(rows: OracleRow[], display: string): TradeInput[] {
  return rows.map((r) => {
    const t = toTradeInputs([r], r.exits, r.account_currency)[0];
    return r.account_currency === display ? t : { ...t, sameCurrencyAsAccount: false, fxToAccount: null };
  });
}

describe.skipIf(!url)("SQL aggregation vs the metrics engine (real database, 10,000+ trades)", () => {
  it("per-trade results, exclusions, aggregates, filters and isolation agree; timings recorded", async () => {
    process.env.DATABASE_URL = url;
    const { pool, withUser } = await import("./db");
    const { loadResults, loadLatest } = await import("./trades-data");
    const seed = require("../../scripts/lib/seed-trades.js");
    await pool.query("delete from public.tn_user where email like 'agg-test-%'");
    try {
      const A = await seed.createUser(pool, "agg-test-a@example.com");
      const B = await seed.createUser(pool, "agg-test-b@example.com");
      await seed.insertTrades(pool, A.userId, A.accountId, seed.genTrades(10000, 7));
      const eur = (await pool.query(`insert into tradenotes.accounts (user_id, name, currency) values ($1, 'EUR book', 'EUR') returning id`, [A.userId])).rows[0].id as string;
      await seed.insertTrades(pool, A.userId, eur, seed.genTrades(300, 8));
      await seed.insertTrades(pool, B.userId, B.accountId, seed.genTrades(3, 9));
      await pool.query("analyze tradenotes.trades");

      const raw = (await pool.query<OracleRow>(
        `select t.id, t.side, t.quantity, t.entry_price, t.fees, t.multiplier, t.initial_risk, t.currency, t.fx_to_account, t.closed_at, t.opened_at, a.currency as account_currency, s.name as strategy, t.mistakes, t.emotions,
           coalesce((select json_agg(json_build_object('trade_id', e.trade_id, 'quantity', e.quantity, 'price', e.price)) from tradenotes.trade_exits e where e.trade_id = t.id), '[]'::json) as exits
         from tradenotes.trades t join tradenotes.accounts a on a.id = t.account_id left join tradenotes.strategies s on s.id = t.strategy_id
         where t.user_id = $1 order by t.opened_at, t.id`, [A.userId])).rows;
      expect(raw.length).toBe(10300); // nothing is capped or dropped

      const check = async (label: string, display: string, accountIds: string[] | null, filters: Filters, tz: string, keep: (r: OracleRow) => boolean) => {
        const t0 = performance.now();
        const got = await withUser(A.userId, (q) => loadResults((fn) => fn(q), accountIds, display, filters, tz));
        const sqlMs = performance.now() - t0;
        const subset = raw.filter(keep);
        const expected = oracle(subset, display);
        const exp = expected.map((t) => evaluateTrade(t));
        // 1. exclusions identical (ids per reason)
        const expExcluded = { open_or_partial: [] as string[], missing_fx: [] as string[], invalid: [] as string[] };
        expected.forEach((t, i) => { const e = exp[i]; if (typeof e === "string") expExcluded[e].push(t.id); });
        for (const k of ["open_or_partial", "missing_fx", "invalid"] as const) expect([...got.excluded[k]].sort(), `${label}: excluded ${k}`).toEqual([...expExcluded[k]].sort());
        // 2. per-trade results equal (money to 1e-6, R to 1e-9)
        const byId = new Map(got.rows.map((r) => [r.id, r]));
        let compared = 0;
        exp.forEach((e) => {
          if (typeof e === "string") return;
          const g = byId.get(e.id);
          expect(g, `${label}: trade ${e.id} present`).toBeTruthy();
          expect(Math.abs(g!.netPnl - e.netPnl), `${label}: net ${e.id}`).toBeLessThan(1e-6);
          expect(Math.abs(g!.grossPnl - e.grossPnl), `${label}: gross ${e.id}`).toBeLessThan(1e-6);
          expect(Math.abs(g!.fees - e.fees), `${label}: fees ${e.id}`).toBeLessThan(1e-6);
          if (e.r === null) expect(g!.r, `${label}: r null ${e.id}`).toBeNull(); else expect(Math.abs((g!.r as number) - e.r), `${label}: r ${e.id}`).toBeLessThan(1e-9);
          compared++;
        });
        expect(got.rows.length, `${label}: same number of counted trades`).toBe(compared);
        // 3. every aggregate computed from SQL rows equals summarize() on the same trades
        const t1 = performance.now();
        const a = summarizeResults(got.rows, got.excluded);
        const sumMs = performance.now() - t1;
        const b = summarize(expected);
        expect(a.tradeCount).toBe(b.tradeCount); expect(a.wins).toBe(b.wins); expect(a.losses).toBe(b.losses); expect(a.breakevens).toBe(b.breakevens);
        expect(a.maxWinStreak).toBe(b.maxWinStreak); expect(a.maxLossStreak).toBe(b.maxLossStreak);
        expect(a.rCoverage).toEqual(b.rCoverage); expect(a.smallSample).toBe(b.smallSample);
        const near = (x: number | null, y: number | null, tol: number, n: string) => { if (x === null || y === null) expect(x, `${label}: ${n}`).toBe(y); else expect(Math.abs(x - y), `${label}: ${n} ${x} vs ${y}`).toBeLessThan(tol); };
        near(a.netPnl, b.netPnl, 1e-3, "netPnl"); near(a.grossPnl, b.grossPnl, 1e-3, "grossPnl"); near(a.totalFees, b.totalFees, 1e-3, "fees");
        near(a.expectancy, b.expectancy, 1e-6, "expectancy"); near(a.avgWin, b.avgWin, 1e-6, "avgWin"); near(a.avgLoss, b.avgLoss, 1e-6, "avgLoss");
        near(a.profitFactor, b.profitFactor, 1e-6, "profitFactor"); near(a.avgR, b.avgR, 1e-6, "avgR"); near(a.winRate, b.winRate, 1e-12, "winRate");
        near(a.maxDrawdown, b.maxDrawdown, 1e-3, "maxDrawdown");
        expect(a.equityCurve.length).toBe(b.equityCurve.length);
        if (a.equityCurve.length) near(a.equityCurve.at(-1)!.cumulative, b.equityCurve.at(-1)!.cumulative, 1e-3, "final equity");
        return { got, a, sqlMs, sumMs, excluded: got.excluded };
      };

      const all = { n: 0 };
      // --- whole journal, USD view: the 300 EUR-account trades must be reported as missing_fx, never mixed in
      const full = await check("all/USD", "USD", null, parseFilters({}), "UTC", () => true);
      all.n = full.a.tradeCount;
      expect(full.a.tradeCount).toBeGreaterThan(9000);
      expect(full.excluded.open_or_partial.length).toBeGreaterThan(100);   // open + partially closed rows exist
      expect(full.excluded.invalid.length).toBeGreaterThan(10);            // over-exited rows exist
      expect(full.excluded.missing_fx.length).toBeGreaterThan(300);        // 300 EUR-account trades + EUR trades with no rate
      // --- EUR account in its own currency
      await check("EUR account/EUR", "EUR", [eur], parseFilters({}), "UTC", (r) => r.account_currency === "EUR");
      // --- USD account only
      await check("USD account", "USD", [A.accountId], parseFilters({}), "UTC", (r) => r.account_currency === "USD");

      // --- filters: strategy + side + tags (any of) + custom dates in New York time
      const tz = "America/New_York";
      const f = parseFilters({ strategy: "London breakout", side: "long", tag: ["FOMO", "Moved stop"], from: "2025-06-01", to: "2026-03-31" });
      const w = dateWindow(f, tz);
      const inWin = (r: OracleRow) => {
        const d = new Date(r.closed_at ?? r.opened_at).getTime();
        return d >= w.start!.getTime() && d < w.end!.getTime();
      };
      const filt = await check("filters", "USD", [A.accountId], f, tz, (r) => r.account_currency === "USD" && r.strategy === "London breakout" && r.side === "long" && inWin(r)
        && (r.mistakes.some((t) => f.tags.includes(t)) || r.emotions.some((t) => f.tags.includes(t))));
      expect(filt.a.tradeCount).toBeGreaterThan(5); expect(filt.a.tradeCount).toBeLessThan(all.n / 20); // the filter really narrowed the set

      // --- the latest-trades query agrees with the oracle ordering
      const latest = await withUser(A.userId, (q) => loadLatest((fn) => fn(q), [A.accountId], "USD", parseFilters({}), "UTC", 5));
      const expLatest = raw.filter((r) => r.account_currency === "USD").sort((x, y) => (x.opened_at < y.opened_at ? 1 : x.opened_at > y.opened_at ? -1 : x.id < y.id ? -1 : 1)).slice(0, 5).map((r) => r.id);
      expect(latest.map((r) => r.id)).toEqual(expLatest);

      // --- isolation: B sees none of A's trades, even when asking for A's account id explicitly
      const bSees = await withUser(B.userId, (q) => loadResults((fn) => fn(q), [A.accountId], "USD", parseFilters({}), "UTC"));
      expect(bSees.rows.length + bSees.excluded.open_or_partial.length + bSees.excluded.missing_fx.length + bSees.excluded.invalid.length).toBe(0);
      const bOwn = await withUser(B.userId, (q) => loadResults((fn) => fn(q), null, "USD", parseFilters({}), "UTC"));
      expect(bOwn.rows.length + bOwn.excluded.open_or_partial.length + bOwn.excluded.missing_fx.length + bOwn.excluded.invalid.length).toBe(3);

      // --- timings (target: whole dashboard/analytics server time under 1.5 s; the data layer is a fraction of that)
      const times: number[] = [];
      for (let i = 0; i < 5; i++) { const t = performance.now(); await withUser(A.userId, (q) => loadResults((fn) => fn(q), null, "USD", parseFilters({}), "UTC")); times.push(performance.now() - t); }
      const median = [...times].sort((x, y) => x - y)[2];
      console.log(`[10k timing] loadResults over ${raw.length} trades: median ${median.toFixed(0)} ms (min ${Math.min(...times).toFixed(0)}, max ${Math.max(...times).toFixed(0)}); summarizeResults ${full.sumMs.toFixed(0)} ms`);
      expect(median).toBeLessThan(1500);
      expect(full.sumMs).toBeLessThan(500);
    } finally {
      await pool.query("delete from public.tn_user where email like 'agg-test-%'");
      await pool.end();
    }
  }, 180000);
});
