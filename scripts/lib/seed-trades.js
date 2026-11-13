// Deterministic trade seeder for the 10,000-trade tests and timings (owner connection; local/CI databases only).
// CommonJS so both scripts/*.js and vitest can load it. Same seed => same trades.
const { randomUUID } = require('crypto');

/** mulberry32: tiny seeded PRNG. */
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const STRATEGIES = ['London breakout', 'Range fade', 'Trend pullback', 'News scalp', 'Opening drive', 'Swing hold', 'Mean reversion', 'Breakout retest'];
const MISTAKES = ['Entered early', 'Entered late', 'Moved stop', 'No stop loss', 'Oversized', 'Revenge trade', 'Broke rules', 'Closed too early', 'Held too long', 'Chased price'];
const EMOTIONS = ['Calm', 'Confident', 'Anxious', 'FOMO', 'Greedy', 'Frustrated', 'Revenge', 'Bored', 'Hesitant'];
const SESSIONS = ['Asia', 'London', 'London/NY overlap', 'New York', 'Other'];
const INSTR = [
  { symbol: 'EURUSD', asset: 'forex', px: 1.1, sd: 0.003, mult: 100000, qty: [0.1, 3], dp: 5 },
  { symbol: 'GBPUSD', asset: 'forex', px: 1.3, sd: 0.004, mult: 100000, qty: [0.1, 2], dp: 5 },
  { symbol: 'USDJPY', asset: 'forex', px: 150, sd: 0.4, mult: 1000, qty: [0.1, 2], dp: 3 },
  { symbol: 'AAPL', asset: 'stock', px: 180, sd: 2.5, mult: 1, qty: [10, 200], dp: 2 },
  { symbol: 'TSLA', asset: 'stock', px: 240, sd: 6, mult: 1, qty: [5, 100], dp: 2 },
  { symbol: 'ES', asset: 'future', px: 5000, sd: 12, mult: 50, qty: [1, 3], dp: 2 },
  { symbol: 'NQ', asset: 'future', px: 18000, sd: 60, mult: 20, qty: [1, 2], dp: 2 },
  { symbol: 'BTCUSD', asset: 'crypto', px: 60000, sd: 700, mult: 1, qty: [0.01, 0.5], dp: 2 },
];
const round = (x, dp) => Math.round(x * 10 ** dp) / 10 ** dp;

/**
 * n trades over the 730 days before `anchor`. Mix: shorts and longs, 1 or 2 exits, ~2% open, ~1.5% partially closed,
 * ~0.3% over-exited (invalid), ~5% EUR trades on a USD account with a rate, ~0.5% EUR trades with NO rate, ~30% without a stop.
 */
function genTrades(n, seed = 42, anchor = '2026-11-01T00:00:00Z') {
  const r = rng(seed), end = new Date(anchor).getTime(), out = [];
  const pick = (a) => a[Math.floor(r() * a.length)];
  const gauss = () => { let u = 0, v = 0; while (u === 0) u = r(); v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  for (let i = 0; i < n; i++) {
    const ins = pick(INSTR), side = r() < 0.55 ? 'long' : 'short', dir = side === 'long' ? 1 : -1;
    const qty = round(ins.qty[0] + r() * (ins.qty[1] - ins.qty[0]), ins.qty[1] < 1 ? 2 : ins.asset === 'forex' ? 1 : 0) || ins.qty[0];
    const entry = round(ins.px * (1 + (r() - 0.5) * 0.02), ins.dp);
    const opened = end - Math.floor(r() * 730 * 86400000);
    const hold = Math.round(Math.exp(Math.log(300000) + r() * (Math.log(3 * 86400000) - Math.log(300000)))); // 5 min .. 3 days
    const closed = opened + hold;
    const kind = r();
    const move = () => dir * (0.04 * ins.sd + gauss() * ins.sd);
    const exits = [];
    let closedAt = new Date(closed).toISOString();
    if (kind < 0.02) { closedAt = null; }                                                           // open
    else if (kind < 0.035) { exits.push({ qty: round(qty / 2, 8), price: round(entry + move(), ins.dp) }); }  // partially closed
    else if (kind < 0.038) { exits.push({ qty: round(qty * 1.5, 8), price: round(entry + move(), ins.dp) }); } // over-exited
    else if (kind < 0.35) {                                                                          // two exits
      const q1 = round(qty / 2, 8);
      exits.push({ qty: q1, price: round(entry + move(), ins.dp) }, { qty: round(qty - q1, 8), price: round(entry + move(), ins.dp) });
    } else exits.push({ qty, price: round(entry + move(), ins.dp) });
    for (const e of exits) if (!(e.price > 0)) e.price = round(entry, ins.dp);
    const c = r();
    const currency = c < 0.05 ? 'EUR' : c < 0.055 ? 'EUR' : null;
    const fx = c < 0.05 ? 1.08 : null; // 0.5% EUR trades have no rate on purpose
    out.push({
      id: randomUUID(), symbol: ins.symbol, asset: ins.asset, side, qty, entry, mult: ins.mult,
      fees: round(r() * 15, 2), risk: r() < 0.7 ? round(50 + r() * 450, 2) : null, currency, fx,
      opened: new Date(opened).toISOString(), closed: closedAt, session: r() < 0.9 ? pick(SESSIONS) : null, strategy: r() < 0.85 ? pick(STRATEGIES) : null,
      mistakes: r() < 0.3 ? [...new Set([pick(MISTAKES), r() < 0.3 ? pick(MISTAKES) : null].filter(Boolean))] : [],
      emotions: r() < 0.4 ? [pick(EMOTIONS)] : [],
      exits: exits.map((e) => ({ ...e, at: closedAt })),
    });
  }
  return out;
}

/** Creates a user + one USD account (owner connection; skips the app's ensure_user so no role switching is needed). */
async function createUser(client, email, { plan = 'pro' } = {}) {
  const id = randomUUID();
  await client.query(`insert into public.tn_user (id, name, email, "emailVerified", "createdAt", "updatedAt") values ($1, 'seed', $2, true, now(), now())`, [id, email]);
  await client.query(`insert into tradenotes.profiles (id, onboarding_completed_at) values ($1, now()) on conflict do nothing`, [id]);
  await client.query(`insert into tradenotes.subscriptions (user_id, plan, status, current_period_end) values ($1, $2, 'active', now() + interval '365 days') on conflict (user_id) do update set plan = excluded.plan, status = 'active', current_period_end = excluded.current_period_end`, [id, plan]);
  const acct = (await client.query(`insert into tradenotes.accounts (user_id, name, currency, starting_balance) values ($1, 'Seed account', 'USD', 10000) returning id`, [id])).rows[0].id;
  return { userId: id, accountId: acct };
}

/** Inserts the generated trades (batched) and their exits. Returns the strategy ids by name. */
async function insertTrades(client, userId, accountId, trades) {
  const strat = {};
  for (const name of STRATEGIES) strat[name] = (await client.query(`insert into tradenotes.strategies (user_id, name) values ($1, $2) on conflict (user_id, name) do update set name = excluded.name returning id`, [userId, name])).rows[0].id;
  const B = 1000;
  for (let i = 0; i < trades.length; i += B) {
    const b = trades.slice(i, i + B);
    await client.query(
      `insert into tradenotes.trades (id, user_id, account_id, strategy_id, symbol, asset_class, side, quantity, entry_price, multiplier, fees, initial_risk, currency, fx_to_account, opened_at, closed_at, session, mistakes, emotions)
       select u.id, $1, $2, u.strategy_id, u.symbol, u.asset, u.side, u.qty, u.entry, u.mult, u.fees, u.risk, u.currency, u.fx, u.opened, u.closed, u.session, coalesce(u.mistakes::text[], '{}'), coalesce(u.emotions::text[], '{}')
       from jsonb_to_recordset($3::jsonb) as u(id uuid, strategy_id uuid, symbol text, asset text, side text, qty numeric, entry numeric, mult numeric, fees numeric, risk numeric, currency text, fx numeric, opened timestamptz, closed timestamptz, session text, mistakes text, emotions text)`,
      [userId, accountId, JSON.stringify(b.map((t) => ({ ...t, strategy_id: t.strategy ? strat[t.strategy] : null, mistakes: pgArr(t.mistakes), emotions: pgArr(t.emotions) })))]);
    const ex = b.flatMap((t) => t.exits.map((e) => ({ trade_id: t.id, qty: e.qty, price: e.price, at: e.at })));
    if (ex.length) await client.query(
      `insert into tradenotes.trade_exits (trade_id, user_id, quantity, price, exited_at) select u.trade_id, $1, u.qty, u.price, u.at from jsonb_to_recordset($2::jsonb) as u(trade_id uuid, qty numeric, price numeric, at timestamptz)`,
      [userId, JSON.stringify(ex)]);
  }
  return strat;
}
const pgArr = (a) => '{' + a.map((x) => '"' + String(x).replace(/(["\\])/g, '\\$1') + '"').join(',') + '}';

module.exports = { rng, genTrades, createUser, insertTrades, STRATEGIES, MISTAKES, EMOTIONS, SESSIONS };
