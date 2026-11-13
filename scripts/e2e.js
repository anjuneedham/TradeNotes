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
  check('dashboard: date range keeps valid totals or says none', /\$293\.00|No closed trades match these filters/.test(await A.locator('body').innerText()));
  await A.goto(BASE + '/app/journal?status=open');
  const openRows = await A.locator('tbody').innerText();
  check('journal: status=open shows only the open trade', openRows.includes('GBPUSD') && !openRows.includes('EURUSD'), openRows);
  await A.goto(BASE + '/app/journal');
  await A.locator('tbody tr', { hasText: '$593.00' }).getByRole('link', { name: 'View' }).click();
  await A.waitForURL(/\/app\/journal\/[0-9a-f-]{36}$/);
  const det = await A.locator('body').innerText();
  check('trade detail: result, risk plan and tags shown', det.includes('$593.00') && det.includes('Planned risk') && det.includes('$300.00') && /MOVED STOP/i.test(det) && det.includes('London breakout'), det.slice(0, 300));
  const detailUrl = A.url();
  // --- edit (H-2): pre-filled form, change notes, P&L must be unchanged (exits re-created correctly)
  await A.goto(detailUrl + '/edit');
  check('edit: form is pre-filled', (await A.getByLabel('Instrument').inputValue()) === 'EURUSD' && (await A.getByLabel('Entry price').inputValue()) === '1.085' && await A.getByLabel('Moved stop').isChecked());
  await A.getByLabel('Lesson learned').fill('Edited lesson: wait for the retest');
  await A.getByRole('button', { name: 'Save changes' }).click();
  await A.waitForURL(/\/app\/journal\/[0-9a-f-]{36}\?saved=1$/);
  const ed = await A.locator('body').innerText();
  check('edit: saved, notes changed, P&L unchanged', ed.includes('Changes saved.') && ed.includes('Edited lesson: wait for the retest') && ed.includes('$593.00') && /MOVED STOP/i.test(ed), ed.slice(0, 300));
  await A.goto(detailUrl + '/edit');
  await A.getByLabel('Exit 1 price', { exact: true }).fill('1.0950');
  await A.getByRole('button', { name: 'Save changes' }).click();
  await A.waitForURL(/\?saved=1$/);
  check('edit: changing the exit price recalculates P&L ($993.00)', (await A.locator('body').innerText()).includes('$993.00'));
  await A.goto(detailUrl + '/edit');
  await A.getByLabel('Exit 1 price', { exact: true }).fill('1.0910');
  await A.getByRole('button', { name: 'Save changes' }).click();
  await A.waitForURL(/\?saved=1$/);
  check('edit: restored to $593.00', (await A.locator('body').innerText()).includes('$593.00'));
  // --- futures (H-1): previously failed with "Could not save the trade"
  await A.goto(BASE + '/app/journal/new');
  await A.getByLabel('Market').selectOption('future');
  await A.getByLabel('Instrument').fill('ES');
  await A.getByLabel('Contracts').fill('1');
  await A.getByLabel('Entry price').fill('5000');
  await A.getByLabel('Entry time').fill('2026-11-03T14:00');
  await A.getByRole('button', { name: 'Save trade' }).click();
  check('futures trade saves (H-1 fixed)', await A.waitForURL('**/app/journal?saved=1', { timeout: 10000 }).then(() => true, () => false) && (await A.locator('tbody').innerText()).includes('ES'));
  await A.locator('tbody tr', { hasText: 'ES' }).filter({ hasNotText: 'EURUSD' }).getByRole('button', { name: /Delete/ }).click();
  await A.locator('tbody tr', { hasText: 'ES' }).filter({ hasNotText: 'EURUSD' }).getByRole('button', { name: /Confirm delete/ }).click();
  await A.waitForURL('**/app/journal?deleted=1');
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
  await A.goto(BASE + '/app/journal/new');
  globalThis.__aAccount = await A.locator('input[name=account_id]').getAttribute('value');

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
  // --- forged requests from B against A's records (server must not trust ids from the browser)
  const rE = await B.goto(globalThis.__detailUrl + '/edit');
  check('user B cannot open user A edit page (404)', rE.status() === 404, String(rE.status()));
  await logTrade(B, { symbol: 'USDCAD', size: '1', entry: '1.3500' });
  await B.waitForURL('**/app/journal?saved=1');
  await B.locator('tbody tr', { hasText: 'USDCAD' }).getByRole('link', { name: 'View' }).click();
  await B.waitForURL(/\/app\/journal\/[0-9a-f-]{36}$/);
  await B.goto(B.url() + '/edit');
  const aId = globalThis.__detailUrl.split('/').pop();
  await B.getByLabel('Instrument').fill('HACKED'); // type first: the form re-renders while typing, then forge the hidden id
  await B.evaluate((id) => { const old = document.querySelector('input[name=trade_id]'); const f = old.form; old.removeAttribute('name'); const i = document.createElement('input'); i.type = 'hidden'; i.name = 'trade_id'; i.value = id; f.appendChild(i); }, aId);
  await B.getByRole('button', { name: 'Save changes' }).click();
  check('forged update of A trade by B is refused', await B.getByText('Trade not found.').waitFor({ timeout: 8000 }).then(() => true, () => false));
  await B.goto(BASE + '/app/journal/new');
  const aAcct = globalThis.__aAccount;
  if (aAcct) {
    await B.getByLabel('Instrument').fill('HACKED'); await B.getByLabel('Size (lots)').fill('1'); await B.getByLabel('Entry price').fill('1.1');
    await B.evaluate((id) => { const old = document.querySelector('input[name=account_id]'); const f = old.form; old.removeAttribute('name'); const i = document.createElement('input'); i.type = 'hidden'; i.name = 'account_id'; i.value = id; f.appendChild(i); }, aAcct);
    await B.getByRole('button', { name: 'Save trade' }).click();
    const fc = await B.getByText('Account not found.').waitFor({ timeout: 8000 }).then(() => true, () => false);
    check('forged create into A account by B is refused', fc, (await B.locator('main').innerText()).slice(0, 300));
  }
  const fd = await B.request.post(BASE + '/app/journal', { form: { id: aId } }).catch(() => null);
  check('raw POST to journal without a server-action id changes nothing', !fd || fd.status() < 500);

  // --- self-service export + account deletion (B)
  const exB = await B.request.get(BASE + '/app/export');
  const csvB = await exB.text();
  check('export: B gets own trades as CSV, none of A\'s', exB.status() === 200 && /text\/csv/.test(exB.headers()['content-type']) && csvB.includes('USDCAD') && !csvB.includes('EURUSD'), csvB.slice(0, 200));
  const exAnon = await (await browser.newContext()).request.get(BASE + '/app/export', { maxRedirects: 0 });
  check('export: signed-out request is refused', exAnon.status() === 401 || exAnon.status() === 307, String(exAnon.status()));
  await B.goto(BASE + '/app/settings');
  await B.getByText('Delete my account', { exact: true }).click();
  await B.getByLabel('Type DELETE to confirm').fill('DELETE');
  await B.getByLabel('Current password').fill('wrong-password-xx');
  await B.getByRole('button', { name: 'Delete my account permanently' }).click();
  check('delete: wrong password refuses and keeps the account', await B.getByText("That password didn't match").waitFor({ timeout: 8000 }).then(() => true, () => false));
  await B.getByLabel('Type DELETE to confirm').fill('DELETE');
  await B.getByLabel('Current password').fill('correct-horse-battery');
  await B.getByRole('button', { name: 'Delete my account permanently' }).click();
  await B.waitForURL(BASE + '/?deleted=1', { timeout: 15000 }).catch(() => {});
  if (process.env.DATABASE_URL) {
    const { Client } = require('pg'); const c2 = new Client({ connectionString: process.env.DATABASE_URL }); await c2.connect();
    const left = (await c2.query(`select (select count(*) from public.tn_user where email = $1)::int u, (select count(*) from tradenotes.trades t where not exists (select 1 from public.tn_user x where x.id = t.user_id))::int orphans`, [emailB])).rows[0];
    check('delete: user and all their data removed (no orphans)', left.u === 0 && left.orphans === 0, JSON.stringify(left));
    await c2.end();
  }
  await B.goto(BASE + '/app');
  check('delete: deleted user is signed out', B.url().includes('/login'));
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
  const finalJ = await (async () => { await A.goto(BASE + '/app/journal'); return await A.locator('tbody').innerText(); })();
  check('login with correct password works; data persisted', finalJ.includes('$593.00'));
  check('A trade not modified by B (no HACKED rows)', !finalJ.includes('HACKED'));
  check('no browser JS errors', errors.length === 0, errors.join(' | '));

  await phase1(browser, stamp);
  await phase2(browser, stamp);

  await browser.close();
  const failed = results.filter(r => !r[1]).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('E2E CRASH', e.message); process.exit(2); });

// ---------------------------------------------------------------------------------------------------------------------
// Phase 1 (capture and evidence): broker import presets, instrument specs, multiple accounts, screenshots.
// Needs DATABASE_URL (to set plans the way the payment webhook would) and the app started with SCREENSHOT_STORAGE=memory.
const path = require('path');
const FIX = path.join(__dirname, '..', 'src', 'lib', 'import-fixtures');
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
async function setPlan(email, plan) {
  const c = new Client({ connectionString: process.env.DATABASE_URL }); await c.connect();
  await c.query(`update tradenotes.subscriptions s set plan = $2, status = 'active', current_period_end = now() + interval '30 days' from public.tn_user u where u.id = s.user_id and u.email = $1`, [email, plan]);
  await c.end();
}
async function newUser(browser, email, opts = {}) {
  const ctx = await browser.newContext(opts); const page = await ctx.newPage();
  await signup(page, email); await onboard(page);
  return page;
}
async function importFile(page, file, { tz } = {}) {
  await page.goto(BASE + '/app/import');
  await page.getByLabel('Trade history file').setInputFiles(path.join(FIX, file));
  if (tz) await page.getByLabel('Times in this file are in').selectOption(tz);
}
async function phase1(browser, stamp) {
  if (!process.env.DATABASE_URL) { check('phase 1 e2e needs DATABASE_URL (skipped)', false); return; }
  const free = await newUser(browser, `f${stamp}@e2e.test`);
  const std = await newUser(browser, `s${stamp}@e2e.test`);
  const prem = await newUser(browser, `p${stamp}@e2e.test`, { viewport: { width: 390, height: 844 } });
  await setPlan(`s${stamp}@e2e.test`, 'starter');
  await setPlan(`p${stamp}@e2e.test`, 'pro');

  // --- Free: import, extra accounts and screenshots are refused (UI and server)
  await free.goto(BASE + '/app/import');
  check('P1 free: import shows upgrade instead of the form', (await free.locator('main').innerText()).includes('Broker import is part of'));
  await free.goto(BASE + '/app/accounts');
  check('P1 free: cannot add a second account (limit shown)', (await free.locator('main').innerText()).includes('Free includes 1 trading account'));

  // --- Standard: broker import with auto-detect, reconciliation and correct futures P&L
  await importFile(std, 'tradovate.csv');
  check('P1 import: Tradovate recognised', await std.getByText('We recognised a Tradovate export').waitFor({ timeout: 8000 }).then(() => true, () => false));
  check('P1 import: matches the broker figures (net 588)', await std.getByText(/Matches the broker's own figures: 3 trades, net 588/).isVisible());
  await std.getByRole('button', { name: 'Import 3 trades' }).click();
  await std.waitForURL('**/app/import?done=*');
  await std.goto(BASE + '/app/journal');
  const sj = await std.locator('tbody').innerText();
  check('P1 import: ES long 2 @ 5000 -> 5010.25 shows +$1,025.00 (point value 50)', sj.includes('ESZ5') && sj.includes('$1,025.00'), sj.slice(0, 300));
  check('P1 import: CL loss shows -$500.00', sj.includes('-$500.00'));
  await importFile(std, 'tradovate.csv');
  await std.getByRole('button', { name: 'Import 3 trades' }).click();
  await std.waitForURL('**/app/import?done=*');
  check('P1 import: re-importing the same file skips all 3 duplicates', await std.getByText('Imported 0 trades, skipped 3 duplicates').waitFor({ timeout: 8000 }).then(() => true, () => false));
  await importFile(std, 'mt5.html', { tz: 'Europe/Athens' });
  check('P1 import: MetaTrader HTML recognised', await std.getByText('We recognised a MetaTrader 4 / 5 export').waitFor({ timeout: 8000 }).then(() => true, () => false));
  await std.getByRole('button', { name: 'Import 3 trades' }).click();
  await std.waitForURL('**/app/import?done=*');
  await std.goto(BASE + '/app');
  const sd = await std.locator('body').innerText();
  check('P1 dashboard after imports: net $1,635.50 (588 + 1,047.50)', sd.includes('$1,635.50'), sd.slice(0, 500));

  // --- Standard: accounts (limit 2), switcher, mixed currency disclosure
  await std.goto(BASE + '/app/accounts');
  await std.getByLabel('Name').last().fill('Prop EUR');
  await std.getByLabel('Currency').last().fill('EUR');
  await std.getByRole('button', { name: 'Add account' }).click();
  await std.waitForURL('**/app/accounts?created=1');
  check('P1 accounts: second account created on Standard', (await std.locator('main').innerText()).includes('Prop EUR'));
  check('P1 accounts: third account refused on Standard', (await std.locator('main').innerText()).includes('Standard includes 2 trading accounts'));
  const propId = await std.locator('select[name=account]:visible option', { hasText: 'Prop EUR' }).getAttribute('value');
  await std.locator('select[name=account]:visible').selectOption(propId);
  await std.waitForTimeout(1500);
  await std.goto(BASE + '/app/journal');
  check('P1 switcher: Prop EUR shows no trades', (await std.locator('main').innerText()).includes('No trades'));
  await std.locator('select[name=account]:visible').selectOption('all');
  await std.waitForTimeout(1500);
  await std.goto(BASE + '/app');
  const sAll = await std.locator('body').innerText();
  check('P1 switcher: All accounts combines and labels the view', sAll.includes('All accounts') && sAll.includes('$1,635.50'));

  // --- Standard: screenshots (upload, view, delete, type sniffing, cross-user)
  await std.goto(BASE + '/app/journal');
  await std.locator('tbody tr', { hasText: 'ESZ5' }).getByRole('link', { name: 'View' }).click();
  await std.waitForURL(/\/app\/journal\/[0-9a-f-]{36}$/);
  const tradeUrl = std.url(), tradeId = tradeUrl.split('/').pop();
  await std.locator('input[type=file]').setInputFiles({ name: 'chart.png', mimeType: 'image/png', buffer: PNG });
  await std.getByRole('button', { name: 'Open screenshot 1' }).waitFor({ timeout: 10000 }).catch(() => {});
  check('P1 screenshots: upload shows in the gallery', await std.getByRole('button', { name: 'Open screenshot 1' }).isVisible());
  const shotSrc = await std.locator('img[alt^="Trade screenshot"]').first().getAttribute('src');
  const view = await std.request.get(BASE + shotSrc);
  check('P1 screenshots: owner can view (200 image/png, no-store)', view.status() === 200 && view.headers()['content-type'] === 'image/png' && /no-store/.test(view.headers()['cache-control']));
  const svg = await std.request.post(BASE + '/app/screenshots', { headers: { Origin: BASE }, multipart: { trade_id: tradeId, file: { name: 'x.png', mimeType: 'image/png', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>') } } });
  check('P1 screenshots: SVG renamed to .png is rejected by byte sniffing', svg.status() === 400);
  const xsite = await std.request.post(BASE + '/app/screenshots', { headers: { Origin: 'https://evil.example' }, multipart: { trade_id: tradeId, file: { name: 'a.png', mimeType: 'image/png', buffer: PNG } } });
  check('P1 screenshots: cross-site upload refused (403)', xsite.status() === 403);
  const freeUp = await free.request.post(BASE + '/app/screenshots', { headers: { Origin: BASE }, multipart: { trade_id: tradeId, file: { name: 'a.png', mimeType: 'image/png', buffer: PNG } } });
  check('P1 screenshots: another user cannot upload to this trade (404)', freeUp.status() === 404);
  const freeView = await free.request.get(BASE + shotSrc);
  check('P1 screenshots: another user cannot view it by id (404)', freeView.status() === 404);
  const freeDel = await free.request.delete(BASE + shotSrc, { headers: { Origin: BASE } });
  check('P1 screenshots: another user cannot delete it (404)', freeDel.status() === 404);
  const guess = await free.request.get(BASE + '/app/screenshots/00000000-0000-0000-0000-000000000000');
  check('P1 screenshots: guessed id gives 404', guess.status() === 404);
  const anon = await (await browser.newContext()).request.get(BASE + shotSrc, { maxRedirects: 0 });
  check('P1 screenshots: signed-out request does not get the image', anon.status() !== 200 || !/image/.test(anon.headers()['content-type'] || ''));
  for (let i = 0; i < 4; i++) await std.request.post(BASE + '/app/screenshots', { headers: { Origin: BASE }, multipart: { trade_id: tradeId, file: { name: 'a.png', mimeType: 'image/png', buffer: PNG } } });
  const sixth = await std.request.post(BASE + '/app/screenshots', { headers: { Origin: BASE }, multipart: { trade_id: tradeId, file: { name: 'a.png', mimeType: 'image/png', buffer: PNG } } });
  check('P1 screenshots: 6th image on a trade refused', sixth.status() === 400 && /up to 5/.test(await sixth.text()));
  const freeOwn = await free.request.post(BASE + '/app/screenshots', { headers: { Origin: BASE }, multipart: { trade_id: '00000000-0000-0000-0000-000000000000', file: { name: 'a.png', mimeType: 'image/png', buffer: PNG } } });
  check('P1 screenshots: unknown trade id refused', freeOwn.status() === 404);
  const del = await std.request.delete(BASE + shotSrc, { headers: { Origin: BASE } });
  check('P1 screenshots: owner can delete (204), then it is gone', del.status() === 204 && (await std.request.get(BASE + shotSrc)).status() === 404);

  // --- Premium on a 390px phone: pages fit, futures form shows the contract spec
  for (const p of ['/app/accounts', '/app/import', '/app/journal/new', tradeUrl.replace(BASE, '')]) {
    const r = await prem.goto(BASE + p);
    const over = await prem.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    check(`P1 mobile 390px: ${p.replace(/[0-9a-f-]{36}/, ':id')} has no horizontal scroll${r.status() === 404 ? ' (404 for other user, as expected)' : ''}`, !over);
  }
  await prem.goto(BASE + '/app/journal/new');
  await prem.getByLabel('Market').selectOption('future');
  await prem.getByLabel('Instrument').fill('MNQH6');
  check('P1 instrument spec: MNQ point value hint shown', await prem.getByText(/Micro E-mini Nasdaq-100: \$2 per point/).isVisible());
  await prem.goto(BASE + '/app/settings');
  await prem.getByLabel('Your time zone').selectOption('America/New_York');
  await prem.getByRole('button', { name: 'Save preferences' }).click();
  await prem.waitForURL('**/app/settings?saved=1');
  check('P1 settings: time zone saved', (await prem.getByLabel('Your time zone').inputValue()) === 'America/New_York');
  await prem.goto(BASE + '/app/import');
  check('P1 import: default time zone comes from settings', (await prem.locator('body').innerText()).includes('Choose your file'));
  await prem.screenshot({ path: SP + '/p1-premium-mobile.png', fullPage: true });

  // --- Standard deletes their whole account: screenshot rows and files gone
  const c = new Client({ connectionString: process.env.DATABASE_URL }); await c.connect();
  const before = (await c.query(`select count(*)::int n from tradenotes.trade_screenshots s join public.tn_user u on u.id = s.user_id where u.email = $1`, [`s${stamp}@e2e.test`])).rows[0].n;
  await std.goto(BASE + '/app/settings');
  await std.getByText('Delete my account', { exact: true }).click();
  await std.getByLabel('Type DELETE to confirm').fill('DELETE');
  await std.getByLabel('Current password').fill('correct-horse-battery');
  await std.getByRole('button', { name: 'Delete my account permanently' }).click();
  await std.waitForURL(BASE + '/?deleted=1', { timeout: 15000 }).catch(() => {});
  const after = (await c.query(`select count(*)::int n from tradenotes.trade_screenshots s where not exists (select 1 from public.tn_user u where u.id = s.user_id)`)).rows[0].n;
  check('P1 delete account: had screenshots, none left behind', before >= 4 && after === 0, `${before}/${after}`);
  await c.end();
}


// ---------------------------------------------------------------------------------------------------------------------
// Phase 2 (analytics and review). Trades are seeded straight into the database (owner connection) so the expected numbers are exact.
//   1 EURUSD long  London breakout  1.1000 -> 1.1100 x1 lot (x100000)           net +1,000.00  risk 500   closed 2026-10-05 10:00Z
//   2 EURUSD short London breakout  1.1000 -> 1.1050 x1 lot, tag Moved stop      net   -500.00             closed 2026-10-12 14:00Z
//   3 GBPUSD long  Range fade       1.3000 -> 1.3030 x2 lots, fees 10           net   +590.00             closed 2026-11-03 09:30Z
//   4 ES (future)  long, session New York  5000 -> 5002 x1 (x50)                net   +100.00             closed 2026-11-04 15:00Z
//   5 USDJPY open (no exit)
// All closed together: net 1,190.00 over 4 trades.
async function seed(email, rows) {
  const c = new Client({ connectionString: process.env.DATABASE_URL }); await c.connect();
  const u = (await c.query('select id from public.tn_user where email = $1', [email])).rows[0].id;
  await c.query('select 1');
  const acct = (await c.query('select id from tradenotes.accounts where user_id = $1 order by created_at limit 1', [u])).rows[0].id;
  for (const r of rows) {
    let sid = null;
    if (r.strategy) sid = (await c.query('insert into tradenotes.strategies (user_id, name) values ($1, $2) on conflict (user_id, name) do update set name = excluded.name returning id', [u, r.strategy])).rows[0].id;
    const t = (await c.query(`insert into tradenotes.trades (user_id, account_id, strategy_id, symbol, asset_class, side, quantity, entry_price, multiplier, fees, initial_risk, opened_at, closed_at, session, mistakes, emotions)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) returning id`,
      [u, acct, sid, r.symbol, r.asset || 'forex', r.side, r.qty, r.entry, r.mult ?? 1, r.fees ?? 0, r.risk ?? null, r.open, r.close ?? null, r.session ?? null, r.mistakes ?? [], r.emotions ?? []])).rows[0].id;
    if (r.exit) await c.query('insert into tradenotes.trade_exits (trade_id, user_id, quantity, price, exited_at) values ($1,$2,$3,$4,$5)', [t, u, r.exitQty ?? r.qty, r.exit, r.close]);
  }
  await c.end();
  return { user: u, account: acct };
}
const P2_TRADES = [
  { symbol: 'EURUSD', side: 'long', qty: 1, entry: 1.1, exit: 1.11, mult: 100000, risk: 500, strategy: 'London breakout', open: '2026-10-05T08:00:00Z', close: '2026-10-05T10:00:00Z' },
  { symbol: 'EURUSD', side: 'short', qty: 1, entry: 1.1, exit: 1.105, mult: 100000, strategy: 'London breakout', mistakes: ['Moved stop'], open: '2026-10-12T12:00:00Z', close: '2026-10-12T14:00:00Z' },
  { symbol: 'GBPUSD', side: 'long', qty: 2, entry: 1.3, exit: 1.303, mult: 100000, fees: 10, strategy: 'Range fade', open: '2026-11-03T08:00:00Z', close: '2026-11-03T09:30:00Z' },
  { symbol: 'ES', asset: 'future', side: 'long', qty: 1, entry: 5000, exit: 5002, mult: 50, session: 'New York', open: '2026-11-04T14:00:00Z', close: '2026-11-04T15:00:00Z' },
  { symbol: 'USDJPY', side: 'long', qty: 1, entry: 150, open: '2026-11-05T08:00:00Z' },
];
const bodyOf = async (page) => page.locator('body').innerText();
async function applyBar(page, fields) {
  const bar = page.locator('[data-testid=filter-bar]');
  if (!(await bar.evaluate((e) => e.open))) await bar.locator('summary').click();
  for (const [name, value] of Object.entries(fields)) await page.locator(`[data-testid=filter-bar] select[name=${name}]`).selectOption(value);
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await page.waitForLoadState('networkidle');
}
async function phase2(browser, stamp) {
  if (!process.env.DATABASE_URL) { check('phase 2 e2e needs DATABASE_URL (skipped)', false); return; }
  const std = await newUser(browser, `s2${stamp}@e2e.test`);
  const other = await newUser(browser, `o2${stamp}@e2e.test`);
  await setPlan(`s2${stamp}@e2e.test`, 'starter');
  const seeded = await seed(`s2${stamp}@e2e.test`, P2_TRADES);

  // ---- 1. filter bar
  await std.goto(BASE + '/app');
  let t = await bodyOf(std);
  check('P2 filters: unfiltered dashboard = net $1,190.00 over 4 closed trades', t.includes('$1,190.00') && /4 closed trades/.test(t), t.slice(0, 300));
  await std.goto(BASE + '/app?strategy=London+breakout');
  t = await bodyOf(std);
  check('P2 filters (URL): strategy London breakout -> net $500.00, 2 closed trades', t.includes('+$500.00') && /2 closed trades/.test(t), t.slice(0, 300));
  await std.goto(BASE + '/app');
  await applyBar(std, { strategy: 'London breakout' });
  check('P2 filters (bar): choosing a strategy puts it in the URL and changes the totals', std.url().includes('strategy=London') && (await bodyOf(std)).includes('+$500.00'));
  await applyBar(std, { side: 'long' });
  t = await bodyOf(std);
  check('P2 filters (bar): strategy + long -> net $1,000.00, 1 closed trade (two filters change the totals)', t.includes('+$1,000.00') && /1 closed trade,/.test(t) && std.url().includes('side=long'), t.slice(0, 300));
  check('P2 filters: active-filter badge shows 2 active', /2 active/i.test(await std.locator('[data-testid=filter-bar] summary').innerText()));
  await std.goto(BASE + '/app/analytics?strategy=London+breakout&side=long');
  t = await bodyOf(std);
  check('P2 filters: analytics honours the same filters (+$1,000.00, 1 closed trade)', t.includes('+$1,000.00') && /Closed trades\s*1\b/.test(t), t.slice(0, 300));
  await std.goto(BASE + '/app/journal?strategy=London+breakout&side=long');
  t = await bodyOf(std);
  const rowsText = await std.locator('tbody').innerText();
  check('P2 filters: journal honours the same filters (1 trade, EURUSD only)', /1 trade matches your filters/.test(t) && rowsText.includes('EURUSD') && !rowsText.includes('GBPUSD'), rowsText.slice(0, 300));
  await std.goto(BASE + '/app/journal?tag=Moved+stop');
  t = await bodyOf(std);
  check('P2 filters: tag filter finds the one tagged trade', /1 trade matches your filters/.test(t), t.slice(0, 200));
  await std.goto(BASE + '/app?from=2026-11-01&to=2026-11-30');
  t = await bodyOf(std);
  check('P2 filters: custom dates (Nov 2026) -> GBPUSD + ES = +$690.00, 2 closed trades', t.includes('+$690.00') && /2 closed trades/.test(t), t.slice(0, 300));
  await std.goto(BASE + '/app?symbol=EURUSD&side=short');
  check('P2 filters: instrument + direction -> -$500.00', (await bodyOf(std)).includes('-$500.00'));
  await std.goto(BASE + '/app?symbol=NOPE');
  t = await bodyOf(std);
  check('P2 filters: nothing matches -> clear message and a reset link, not the welcome screen', t.includes('No closed trades match these filters') && !t.includes('Start in 3 steps'));
  const rg = await std.goto(BASE + '/app?side=sideways&from=banana&to=2026-02-30&account=zzz&range=forever&tag=%3Cscript%3E&strategy=' + 'x'.repeat(200));
  t = await bodyOf(std);
  check('P2 filters: garbage values are ignored (page renders, totals unchanged)', rg.status() === 200 && t.includes('$1,190.00'), String(rg.status()));
  await std.goto(BASE + '/app?side=short&side=long');
  check('P2 filters: repeated single-valued param takes the first valid value (short -> -$500.00)', (await bodyOf(std)).includes('-$500.00'));

  // ---- user isolation through the filter parameters (guessing ids / names)
  const guessed = await other.goto(BASE + `/app/journal?account=${seeded.account}&strategy=London+breakout&symbol=EURUSD`);
  t = await bodyOf(other);
  check('P2 isolation: B passing A\'s account id, strategy and symbol sees nothing (and the id is ignored, not widened)', guessed.status() === 200 && t.includes('No trades match those filters') && (await other.locator('tbody').count()) === 0, t.slice(0, 300));
  await other.goto(BASE + `/app?account=${seeded.account}`);
  t = await bodyOf(other);
  check('P2 isolation: B dashboard with A\'s account id shows the empty welcome, no numbers', t.includes('Start in 3 steps') && !t.includes('$1,190.00'));
  await other.goto(BASE + '/app/analytics?account=all');
  check('P2 isolation: B analytics with account=all has no A data', !(await bodyOf(other)).includes('$1,190.00'));
  await std.context().close(); await other.context().close();
}
