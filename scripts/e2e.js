// Browser end-to-end test (Playwright). Run against a running app + migrated DB: BASE_URL=http://localhost:3111 node scripts/e2e.js
// Creates two throwaway users; uses an email-disabled setup (no RESEND_API_KEY) so signup needs no confirmation.
const { chromium } = require('playwright');
const { Client } = require('pg');
const SP = process.env.SHOT_DIR || '/tmp';
const BASE = process.env.BASE_URL || 'http://localhost:3111';
const results = [];
const check = (name, ok, extra = '') => { results.push([name, ok]); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  ' + extra}`); };

async function signup(page, email) {
  await page.goto(BASE + '/signup');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL('**/app/onboarding', { timeout: 15000 });
}
async function onboard(page) {
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForURL(BASE + '/app', { timeout: 15000 });
}
async function logTrade(page, o) {
  await page.goto(BASE + '/app/journal/new');
  await page.getByLabel('Instrument').fill(o.symbol);
  await page.getByLabel('Size (lots)').fill(o.size);
  await page.getByLabel('Entry price').fill(o.entry);
  await page.getByLabel('Entry time').fill('2026-11-02T09:00');
  if (o.fees) await page.getByLabel('Fees / commission / swap').fill(o.fees);
  if (o.stop) await page.getByLabel('Stop loss price').fill(o.stop);
  if (o.exit) { await page.getByLabel('Exit 1 price', { exact: true }).fill(o.exit); await page.getByLabel('Exit time').fill('2026-11-02T10:30'); }
  if (o.strategy) await page.getByLabel('Strategy / setup').fill(o.strategy);
  if (o.mistake) await page.getByLabel(o.mistake).check();
  await page.getByRole('button', { name: 'Save trade' }).click();
}

(async () => {
  const browser = await chromium.launch();
  const ctxA = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const A = await ctxA.newPage();
  const errors = []; A.on('pageerror', e => errors.push(e.message));
  const stamp = Date.now();
  const emailA = `a${stamp}@e2e.test`, emailB = `b${stamp}@e2e.test`;

  // --- attribution: ?src= tag is remembered, junk is ignored
  await A.goto(BASE + '/?src=ig-ad');
  await A.goto(BASE + '/pricing?src=tt-organic'); // first tag wins
  // --- auth gate + signup + onboarding
  await A.goto(BASE + '/app');
  check('signed-out /app redirects to login', A.url().includes('/login'));
  await signup(A, emailA);
  check('signup lands on onboarding', A.url().endsWith('/app/onboarding'));
  await A.goto(BASE + '/app');
  check('un-onboarded user is sent to onboarding', A.url().endsWith('/app/onboarding'));
  await onboard(A);
  check('onboarding completes to dashboard', await A.getByText('Start in 3 steps').isVisible());
  if (process.env.DATABASE_URL) {
    const c = new Client({ connectionString: process.env.DATABASE_URL }); await c.connect();
    const q = async (e) => (await c.query('select p.signup_source from tradenotes.profiles p join public.tn_user u on u.id = p.id where u.email = $1', [e])).rows[0]?.signup_source ?? null;
    check('signup source recorded (first tag wins): ig-ad', (await q(emailA)) === 'ig-ad', String(await q(emailA)));
    globalThis.__q = q; globalThis.__c = c;
  }
  check('empty dashboard shows labelled EXAMPLE', await A.getByText('EXAMPLE — not your data').isVisible());

  // --- validation
  await logTrade(A, { symbol: 'eur/usd', size: '1', entry: '1.0850', stop: '1.0900' });
  check('stop on wrong side is rejected with a message', await A.getByText('For a long, the stop must be below entry').waitFor({ timeout: 8000 }).then(() => true, () => false));
  check('rejected trade was NOT saved', !(await (async () => { await A.goto(BASE + '/app/journal'); return await A.locator('body').innerText(); })()).includes('1.0900'));

  // --- real trade
  await logTrade(A, { symbol: 'eur/usd', size: '1', entry: '1.0850', stop: '1.0820', exit: '1.0910', fees: '7', strategy: 'London breakout', mistake: 'Moved stop' });
  await A.waitForURL('**/app/journal?saved=1', { timeout: 15000 });
  check('trade saved, redirected to journal', await A.getByText('Trade saved.').isVisible());
  const row = A.locator('tbody tr').first();
  const rowText = await row.innerText();
  check('journal row: EURUSD normalised', rowText.includes('EURUSD'));
  check('journal row: net P&L $593.00', rowText.includes('$593.00'), rowText);
  check('journal row: R = 1.98', rowText.includes('1.98'), rowText);
  check('journal row: mistake tag shown', rowText.includes('Moved stop'));

  // --- open trade + second closed loser
  await logTrade(A, { symbol: 'GBPUSD', size: '0.5', entry: '1.2500' });
  await A.waitForURL('**/app/journal?saved=1');
  await logTrade(A, { symbol: 'EURUSD', size: '1', entry: '1.0900', stop: '1.0870', exit: '1.0870', strategy: 'London breakout' });
  await A.waitForURL('**/app/journal?saved=1');
  const jt = await A.locator('tbody').innerText();
  check('open trade is shown as Open', /GBPUSD[\s\S]*Open/.test(jt));

  // --- dashboard numbers: wins=1 (593), loss=-300 => net 293, win rate 50%, PF 593/300=1.98
  await A.goto(BASE + '/app');
  const dash = await A.locator('body').innerText();
  check('dashboard: net P&L $293.00', dash.includes('$293.00'), dash.slice(0, 400));
  check('dashboard: win rate 50.0%', dash.includes('50.0%'));
  check('dashboard: profit factor 1.98', dash.includes('1.98'));
  check('dashboard: open trade disclosed as excluded', dash.includes('1 open or partially-closed trade'));
  check('dashboard: small-sample warning', dash.includes('Under 30 trades'));
  check('dashboard: breakdown by strategy present', dash.includes('London breakout'));
  await A.screenshot({ path: SP + '/dashboard-desktop.png', fullPage: true });

  // --- redesigned screens: analytics, trade detail, journal status filter, plan usage, preferences
  await A.goto(BASE + '/app/analytics');
  const an = await A.locator('body').innerText();
  check('analytics: mistake-tag breakdown shows the tagged trade', an.includes('By mistake tag') && an.includes('Moved stop'));
  check('analytics: by instrument present', an.includes('By instrument') && an.includes('EURUSD'));
  await A.goto(BASE + '/app?range=30d');
  check('dashboard: date range keeps valid totals or says none', /\$293\.00|No closed trades in this period/.test(await A.locator('body').innerText()));
  await A.goto(BASE + '/app/journal?status=open');
  const openRows = await A.locator('tbody').innerText();
  check('journal: status=open shows only the open trade', openRows.includes('GBPUSD') && !openRows.includes('EURUSD'), openRows);
  await A.goto(BASE + '/app/journal');
  await A.locator('tbody tr', { hasText: '$593.00' }).getByRole('link', { name: 'View' }).click();
  await A.waitForURL(/\/app\/journal\/[0-9a-f-]{36}$/);
  const det = await A.locator('body').innerText();
  check('trade detail: result, risk plan and tags shown', det.includes('$593.00') && det.includes('Planned risk') && det.includes('$300.00') && /MOVED STOP/i.test(det) && det.includes('London breakout'), det.slice(0, 300));
  const detailUrl = A.url();
  await A.goto(BASE + '/app/billing');
  check('billing: shows current plan and usage against the limit', /Free/.test(await A.locator('body').innerText()) && /3\s*of 50/.test(await A.locator('body').innerText()));
  await A.goto(BASE + '/app/settings');
  await A.getByLabel('Light', { exact: true }).check();
  await A.getByRole('button', { name: 'Save preferences' }).click();
  await A.waitForURL('**/app/settings?saved=1');
  check('settings: appearance preference is applied', (await A.locator('[data-theme]').first().getAttribute('data-theme')) === 'light');
  await A.getByLabel('Match device').check();
  await A.getByRole('button', { name: 'Save preferences' }).click();
  await A.waitForURL('**/app/settings?saved=1');
  globalThis.__detailUrl = detailUrl;

  // --- mobile layout check (no horizontal scroll)
  await A.setViewportSize({ width: 390, height: 800 });
  await A.goto(BASE + '/app');
  const overflow = await A.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  check('mobile: dashboard has no horizontal page scroll', !overflow);
  await A.goto(BASE + '/app/journal/new');
  const overflow2 = await A.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  check('mobile: trade form has no horizontal page scroll', !overflow2);
  await A.screenshot({ path: SP + '/tradeform-mobile.png' });
  await A.setViewportSize({ width: 1280, height: 900 });

  // --- user B isolation
  const ctxB = await browser.newContext(); const B = await ctxB.newPage();
  await B.goto(BASE + "/?src=x%27%3B%20drop%20table");
  await signup(B, emailB); await onboard(B);
  if (globalThis.__q) { check('junk src is ignored (stored as null)', (await globalThis.__q(emailB)) === null, String(await globalThis.__q(emailB))); await globalThis.__c.end(); }
  await B.goto(BASE + '/app/journal');
  check('user B journal is empty (cannot see A trades)', await B.getByText('No trades yet').isVisible());
  const rB = await B.goto(globalThis.__detailUrl);
  check('user B cannot open user A trade detail (404)', rB.status() === 404, String(rB.status()));
  await B.goto(BASE + '/app');
  check('user B dashboard has no A numbers', !(await B.locator('body').innerText()).includes('$293.00'));

  // --- delete + logout + login
  await A.goto(BASE + '/app/journal');
  await A.locator('tbody tr', { hasText: 'GBPUSD' }).getByRole('button', { name: /Delete/ }).click();
  await A.locator('tbody tr', { hasText: 'GBPUSD' }).getByRole('button', { name: /Confirm delete/ }).click(); // delete is two-step: arm, then confirm
  await A.waitForURL('**/app/journal?deleted=1');
  check('delete works', !(await A.locator('tbody').innerText()).includes('GBPUSD'));
  await A.getByRole('button', { name: 'Log out' }).click();
  await A.waitForURL(BASE + '/', { timeout: 10000 });
  await A.goto(BASE + '/app');
  check('after logout /app requires login', A.url().includes('/login'));
  await A.getByLabel('Email').fill(emailA); await A.getByLabel('Password').fill('wrong-password-1');
  await A.getByRole('button', { name: 'Log in' }).click();
  check('wrong password shows generic error', await A.getByText('Incorrect email or password').waitFor({ timeout: 8000 }).then(() => true, () => false));
  await A.getByLabel('Email').fill(emailA); await A.getByLabel('Password').fill('correct-horse-battery');
  await A.getByRole('button', { name: 'Log in' }).click();
  await A.waitForURL('**/app**', { timeout: 15000 });
  check('login with correct password works; data persisted', (await (async () => { await A.goto(BASE + '/app/journal'); return await A.locator('tbody').innerText(); })()).includes('$593.00'));
  check('no browser JS errors', errors.length === 0, errors.join(' | '));

  await browser.close();
  const failed = results.filter(r => !r[1]).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('E2E CRASH', e.message); process.exit(2); });
