// Timing of the Phase 3 pages with a seeded Premium user (default 10,000 real trades + 2,000 hypothetical trades + a share link).
//   N=10000 node scripts/perf-phase3.js      (needs a running app at BASE_URL and DATABASE_URL; local/CI only)
const { chromium } = require('playwright');
const { Client } = require('pg');
const crypto = require('crypto');
const seed = require('./lib/seed-trades');
const BASE = process.env.BASE_URL || 'http://localhost:3111';
const N = Number(process.env.N || 10000);
const RUNS = Number(process.env.RUNS || 6);
const med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
(async () => {
  const email = `perf3${Date.now()}@e2e.test`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext(); const page = await ctx.newPage();
  await page.goto(BASE + '/signup');
  await page.getByLabel('Email').fill(email); await page.getByLabel('Password').fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL('**/app/onboarding'); await page.getByRole('button', { name: 'Continue' }).click(); await page.waitForURL(BASE + '/app');
  const c = new Client({ connectionString: process.env.DATABASE_URL }); await c.connect();
  const u = (await c.query('select id from public.tn_user where email = $1', [email])).rows[0].id;
  await c.query(`update tradenotes.subscriptions set plan = 'pro', status = 'active', current_period_end = now() + interval '30 days' where user_id = $1`, [u]);
  const acct = (await c.query('select id from tradenotes.accounts where user_id = $1', [u])).rows[0].id;
  await seed.insertTrades(c, u, acct, seed.genTrades(N, 42));
  await c.query(`insert into tradenotes.backtest_trades (user_id, symbol, asset_class, side, quantity, entry_price, stop_price, multiplier, initial_risk, opened_at, closed_at, exits, strategy)
    select $1, 'BT' || (g % 7), 'other', 'long', 1, 100, 98, 1, 2, now() - (g || ' hours')::interval - interval '1 hour', now() - (g || ' hours')::interval,
           jsonb_build_array(jsonb_build_object('quantity', 1, 'price', 98 + (g % 5))), 'Setup ' || (g % 4) from generate_series(1, 2000) g`, [u]);
  await c.query('analyze tradenotes.trades'); await c.query('analyze tradenotes.backtest_trades');
  const tok = crypto.randomBytes(32).toString('base64url');
  await c.query(`insert into tradenotes.share_links (user_id, token_hash, expires_at) values ($1,$2, now() + interval '3 days')`, [u, crypto.createHash('sha256').update(tok).digest('hex')]);
  const names = (await c.query(`select name from tradenotes.strategies where user_id = $1 order by name limit 4`, [u])).rows.map((r) => r.name);
  const cmp = '/app/strategies/compare?' + names.map((n) => 's=' + encodeURIComponent(n)).join('&');
  const pages = [['/app (dashboard, 10k)', '/app', true], ['/app/strategies/compare (4 strategies)', cmp, true], ['/app/backtests (2,000)', '/app/backtests', true], ['/app/backtests/export (2,000)', '/app/backtests/export', true], ['/app/quick', '/app/quick', true], ['/r/<token> (public report)', '/r/' + tok, false], ['/demo', '/demo', false]];
  console.log(`seeded ${N} real + 2000 hypothetical trades. page  cold / median / max (ms, ${RUNS} runs), status, bytes`);
  for (const [label, p, auth] of pages) {
    const ms = []; let status = 0, bytes = 0;
    const req = auth ? ctx.request : (await browser.newContext()).request;
    for (let i = 0; i < RUNS; i++) { const s = Date.now(); const r = await req.get(BASE + p); const b = await r.body(); ms.push(Date.now() - s); status = r.status(); bytes = b.length; }
    console.log(`${label.padEnd(40)} ${String(ms[0]).padStart(5)} ${String(med(ms.slice(1))).padStart(6)} ${String(Math.max(...ms.slice(1))).padStart(6)}   ${status}  ${bytes}`);
  }
  await c.query('delete from public.tn_user where id = $1', [u]);
  await c.end(); await browser.close();
})();
