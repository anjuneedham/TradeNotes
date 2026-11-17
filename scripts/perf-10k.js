// Timing of the real pages with a seeded user (default 10,000 trades). Needs a running app (BASE_URL) and DATABASE_URL (local/CI only).
//   N=10000 PAGES=/app,/app/analytics node scripts/perf-10k.js
// Reports wall-clock time for the full server response (page rendered on the server, body downloaded) over localhost.
const { chromium } = require('playwright');
const { Client } = require('pg');
const seed = require('./lib/seed-trades');
const BASE = process.env.BASE_URL || 'http://localhost:3111';
const N = Number(process.env.N || 10000);
const PAGES = (process.env.PAGES || '/app,/app/analytics,/app/journal').split(',');
const RUNS = Number(process.env.RUNS || 6);
const med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];

(async () => {
  const email = `perf${Date.now()}@e2e.test`;
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
  const t0 = Date.now();
  await seed.insertTrades(c, u, acct, seed.genTrades(N, 42));
  await c.query('analyze tradenotes.trades'); await c.query('analyze tradenotes.trade_exits');
  console.log(`seeded ${N} trades in ${Date.now() - t0} ms`);
  console.log(`page${' '.repeat(22)}  cold   min   median   max   (ms, ${RUNS} runs)  status  bytes`);
  const rows = [];
  for (const p of PAGES) {
    const ms = []; let status = 0, bytes = 0;
    for (let i = 0; i < RUNS; i++) {
      const s = Date.now(); const r = await ctx.request.get(BASE + p); const body = await r.body(); ms.push(Date.now() - s); status = r.status(); bytes = body.length;
    }
    rows.push({ p, cold: ms[0], min: Math.min(...ms.slice(1)), median: med(ms.slice(1)), max: Math.max(...ms.slice(1)), status, bytes });
    console.log(`${p.padEnd(26)}  ${String(ms[0]).padStart(5)}  ${String(Math.min(...ms.slice(1))).padStart(5)}  ${String(med(ms.slice(1))).padStart(6)}  ${String(Math.max(...ms.slice(1))).padStart(5)}   status ${status}  ${bytes}`);
  }
  // headline sanity: the dashboard body must contain a net P&L figure
  const html = await (await ctx.request.get(BASE + '/app')).text();
  console.log('dashboard rendered with figures:', /Net P&amp;L/.test(html));
  await c.query('delete from public.tn_user where id = $1', [u]);
  await c.end(); await browser.close();
  const worst = Math.max(...rows.map((r) => r.max));
  console.log(`worst warm response: ${worst} ms (target < 1500)`);
})().catch((e) => { console.error('PERF CRASH', e.message); process.exit(2); });
