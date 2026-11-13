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
  check('analytics: mistake-cost card shows the tagged trade', an.includes('What your mistakes cost') && an.includes('Moved stop'));
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
  const free2 = await newUser(browser, `fr2${stamp}@e2e.test`);
  const prem2 = await newUser(browser, `pr2${stamp}@e2e.test`, { viewport: { width: 390, height: 844 } });
  await setPlan(`s2${stamp}@e2e.test`, 'starter'); await setPlan(`o2${stamp}@e2e.test`, 'starter'); await setPlan(`pr2${stamp}@e2e.test`, 'pro');
  const seeded = await seed(`s2${stamp}@e2e.test`, P2_TRADES);
  await seed(`fr2${stamp}@e2e.test`, P2_TRADES); await seed(`pr2${stamp}@e2e.test`, P2_TRADES);

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

  // ---- 3. new analytics (numbers are hand-calculated from the seed above)
  await std.goto(BASE + '/app/analytics');
  t = await bodyOf(std);
  check('P2 analytics: profit factor 3.38 = (1000+590+100) / 500', /Profit factor\s*3\.38/.test(t), t.slice(0, 600));
  check('P2 analytics: expectancy +$297.50 per trade (1190 / 4)', /Expectancy \/ trade\s*\+\$297\.50/.test(t));
  check('P2 analytics: longest streaks 2W / 1L', /Longest streaks\s*2W \/ 1L/.test(t));
  check('P2 analytics: drawdown $500.00, recovered after 1 more trade, now at the high', t.includes('$500.00') && /it took 1 more trade/.test(t) && /at your highest point so far/.test(t), t.slice(0, 800));
  const rBand = await std.locator('ul[aria-label="Trades per R band"] li', { hasText: '2R to 3R' }).innerText();
  check('P2 analytics: R distribution: the +2.0R trade is in 2R to 3R (100% of the 1 trade with a stop); 3 trades have no stop', /1 · 100\.0%/.test(rBand) && /Based on 1 of 4 closed trades that have a stop/.test(t), rBand);
  check('P2 analytics: hold time puts all 4 trades in "1 to 4 hours"', /1 to 4 hours[\s\S]{0,40}\b4\b/.test(t));
  check('P2 analytics: mistake cost: Moved stop 1 trade, -$500.00; others +$1,690.00', t.includes('Moved stop') && t.includes('-$500.00') && t.includes('+$1,690.00') && /3 trades/.test(t));
  const cell = (name) => std.locator(`td[aria-label^="${name}"]`);
  check('P2 analytics: heatmap Monday 08:00 = 1 trade, +$1,000.00, profit, large (sign and size in words)', (await cell('Mon 08:00').getAttribute('aria-label')) === 'Mon 08:00, 1 trade, +$1,000.00, profit, large');
  check('P2 analytics: heatmap Monday 12:00 = loss with sign', /Mon 12:00, 1 trade, -\$500\.00, loss, medium/.test(await cell('Mon 12:00').getAttribute('aria-label')));
  check('P2 analytics: heatmap Tuesday 08:00 = +$590.00', /Tue 08:00, 1 trade, \+\$590\.00, profit/.test(await cell('Tue 08:00').getAttribute('aria-label')));
  check('P2 analytics: colour legend names the colours and the signs', t.includes('blue = profit') && t.includes('orange = loss'));
  await std.setViewportSize({ width: 390, height: 844 });
  await std.goto(BASE + '/app/analytics');
  check('P2 analytics: no horizontal page scroll at 390px (heatmap scrolls inside its card)', !(await std.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
  await std.setViewportSize({ width: 1280, height: 900 });

  // ---- 4. calendar (November 2026 in the default zone UTC: GBPUSD +590.00 on Tue Nov 3, ES +100.00 on Wed Nov 4; October: +1,000.00 on Oct 5, -500.00 on Oct 12)
  await std.goto(BASE + '/app/calendar?month=2026-11');
  t = await bodyOf(std);
  check('P2 calendar (Standard): November net +$690.00, 2 closed trades, 2 trading days', /Net P&L\s*▲ \+\$690\.00/.test(t) && /Closed trades\s*2/.test(t) && /Trading days\s*2/.test(t), t.slice(0, 500));
  check('P2 calendar: Nov 3 cell says trade count, sign, colour word and size in text', (await std.locator('a[aria-label^="Tuesday Nov 3:"]').getAttribute('aria-label')).startsWith('Tuesday Nov 3: 1 trade, +$590.00, profit, large'));
  check('P2 calendar: Nov 4 is a smaller profit than Nov 3', /Wednesday Nov 4: 1 trade, \+\$100\.00, profit, small/.test(await std.locator('a[aria-label^="Wednesday Nov 4:"]').getAttribute('aria-label')));
  check('P2 calendar: weekly total for Nov 2 - 8 is +$690.00 (1280px shows the Week column)', await std.locator('td', { hasText: 'Nov 2 – Nov 8' }).first().innerText().then((x) => x.includes('+$690.00') && x.includes('2 trades'), () => false));
  check('P2 calendar: the colour legend writes out blue = profit, orange = loss', t.includes('blue = profit') && t.includes('orange = loss'));
  await std.locator('a[aria-label^="Wednesday Nov 4:"]').click();
  await std.waitForURL(/\/app\/journal\?/);
  const jr = await std.locator('tbody').innerText();
  check('P2 calendar: clicking a day opens the journal filtered to that day (ES only)', std.url().includes('from=2026-11-04') && std.url().includes('to=2026-11-04') && jr.includes('ES') && !jr.includes('GBPUSD') && !jr.includes('EURUSD'), std.url() + ' ' + jr.slice(0, 200));
  await std.goto(BASE + '/app/calendar?month=2026-10');
  t = await bodyOf(std);
  check('P2 calendar: October net +$500.00; Oct 12 is a loss with its sign', /Net P&L\s*▲ \+\$500\.00/.test(t) && /Monday Oct 12: 1 trade, -\$500\.00, loss/.test(await std.locator('a[aria-label^="Monday Oct 12:"]').getAttribute('aria-label')));
  await std.goto(BASE + '/app/calendar?month=2026-10&side=short');
  check('P2 calendar: the filter bar applies (short only: -$500.00)', /Net P&L\s*▼ -\$500\.00/.test(await bodyOf(std)));
  await std.goto(BASE + '/app/calendar?month=2026-10&side=short&from=2020-01-01&to=2020-01-02');
  check('P2 calendar: a date filter in the URL does not override the month', /Net P&L\s*▼ -\$500\.00/.test(await bodyOf(std)));
  const gm = await std.goto(BASE + '/app/calendar?month=banana');
  check('P2 calendar: garbage month falls back to the current month (no error)', gm.status() === 200 && /\b(January|February|March|April|May|June|July|August|September|October|November|December) \d{4}\b/.test(await std.locator('h2[aria-live]').innerText()));
  await std.goto(BASE + '/app/calendar?month=2026-11');
  check('P2 calendar: in the desktop sidebar', await std.locator('nav[aria-label=App] a[href="/app/calendar"]').first().isVisible());
  // plan matrix: Free is refused on the server, Premium works
  await free2.goto(BASE + '/app/calendar?month=2026-11');
  t = await bodyOf(free2);
  check('P2 calendar (Free): upgrade notice, no grid, none of their own numbers on the page', t.includes('The calendar is part of Standard and Premium') && (await free2.locator('table').count()) === 0 && !t.includes('$590.00'), t.slice(0, 300));
  await prem2.goto(BASE + '/app/calendar?month=2026-11');
  t = await bodyOf(prem2);
  check('P2 calendar (Premium, 390px): grid and totals shown', /Net P&L\s*▲ \+\$690\.00/.test(t) && (await prem2.locator('table').count()) >= 1);
  check('P2 calendar (Premium, 390px): no horizontal scroll', !(await prem2.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
  check('P2 calendar (390px): weekly totals list replaces the Week column', await prem2.getByText('Weekly totals').isVisible());
  check('P2 nav (390px): bottom bar has Calendar and More', await prem2.locator('nav[aria-label=App] a[href="/app/calendar"]').last().isVisible() && await prem2.locator('nav[aria-label=App] a[href="/app/more"]').last().isVisible());
  await prem2.locator('nav[aria-label=App] a[href="/app/more"]').last().click();
  await prem2.waitForURL('**/app/more');
  const moreText = await prem2.locator('main').innerText();
  check('P2 nav (390px): More lists Accounts, Import, Settings, Billing', ['Accounts', 'Import trades', 'Settings', 'Plan and billing'].every((x) => moreText.includes(x)), moreText);
  await other.goto(BASE + `/app/calendar?month=2026-11&account=${seeded.account}`);
  t = await bodyOf(other);
  check('P2 isolation: B calendar (even with A\'s account id) shows no A trades', /Net P&L\s*·?\s*0|Closed trades\s*0/.test(t) && !t.includes('$690.00') && !t.includes('$590.00'), t.slice(0, 300));

  // ---- 6. playbook (EURUSD long +1,000 and short -500 share the strategy London breakout; GBPUSD is Range fade)
  await std.goto(BASE + '/app/playbook');
  t = await bodyOf(std);
  check('P2 playbook (Standard): strategies from the journal are listed, forms are shown', t.includes('London breakout') && t.includes('Range fade') && (await std.locator('input[name=text]').count()) >= 2);
  const rules = ['Waited for the retest', 'Stop below the swing low', 'Risk at most 1 percent'];
  for (const r of rules) {
    const card = std.locator('div[id^="s-"]', { hasText: 'London breakout' }).first();
    await card.locator('input[name=text]').fill(r);
    await card.getByRole('button', { name: 'Add rule' }).click();
    await std.locator('ol li', { hasText: r }).first().waitFor({ timeout: 10000 }); // the redirect URL is the same every time, so wait for the rule itself
  }
  t = await bodyOf(std);
  check('P2 playbook: three rules added to London breakout, in order', rules.every((r) => t.includes(r)) && t.indexOf(rules[0]) < t.indexOf(rules[1]) && t.indexOf(rules[1]) < t.indexOf(rules[2]));
  await std.goto(BASE + '/app/journal');
  await std.locator('tbody tr', { hasText: '+$1,000.00' }).getByRole('link', { name: 'View' }).click();
  await std.waitForURL(/\/app\/journal\/[0-9a-f-]{36}$/);
  const winUrl = std.url();
  t = await bodyOf(std);
  check('P2 playbook: the trade page shows the strategy checklist', t.includes('Playbook checklist') && rules.every((r) => t.includes(r)));
  for (const r of rules) await std.getByLabel(r).check();
  await std.getByRole('button', { name: 'Save checklist' }).click();
  await std.waitForURL(/\?checks=1$/); await std.getByText('Checklist saved.').waitFor({ timeout: 10000 });
  t = await bodyOf(std);
  check('P2 playbook: all three followed -> "Followed 3 of 3 (100.0%)"', t.includes('Checklist saved.') && t.includes('Followed 3 of 3 (100.0%)'), t.slice(0, 200));
  await std.goto(BASE + '/app/journal');
  await std.locator('tbody tr', { hasText: '-$500.00' }).getByRole('link', { name: 'View' }).click();
  await std.waitForURL(/\/app\/journal\/[0-9a-f-]{36}$/);
  const lossUrl = std.url();
  await std.getByLabel(rules[0]).check();
  await std.getByRole('button', { name: 'Save checklist' }).click();
  await std.waitForURL(/\?checks=1$/); await std.getByText('Checklist saved.').waitFor({ timeout: 10000 });
  check('P2 playbook: only one followed -> "Followed 1 of 3 (33.3%)"', (await bodyOf(std)).includes('Followed 1 of 3 (33.3%)'));
  await std.goto(BASE + '/app/playbook');
  t = await bodyOf(std);
  check('P2 playbook: per-rule follow rate (rule 1: 2 of 2, rule 2: 1 of 2)', t.includes('followed 2 of 2 (100.0%)') && t.includes('followed 1 of 2 (50.0%)'), t.slice(0, 700));
  await std.goto(BASE + '/app/analytics');
  t = await bodyOf(std);
  check('P2 analytics: adherence card: average 66.7% (1.0 and 0.333), 2 trades with a checklist, coverage 50.0%', t.includes('Playbook adherence') && /Average adherence\s*66\.7%/.test(t) && /Trades with a checklist\s*2/.test(t) && /Coverage\s*50\.0%/.test(t), t.slice(t.indexOf('Playbook adherence'), t.indexOf('Playbook adherence') + 500));
  const adh = await std.locator('#adherence table tbody').innerText();
  check('P2 analytics: adherence vs results: all followed = 1 trade +$1,000.00; few followed = 1 trade -$500.00', /All rules followed \(100%\)\s+1\*?\s+100\.0%\s+\+\$1,000\.00\s+▲ \+\$1,000\.00/.test(adh) && /Few followed \(under 50%\)\s+1\*?\s+0\.0%\s+-\$500\.00\s+▼ -\$500\.00/.test(adh) && /Most followed \(50% to 99%\)\s+0/.test(adh), adh);
  // retire a rule: it leaves the active list but stays on trades that answered it
  await std.goto(BASE + '/app/playbook');
  await std.getByRole('button', { name: 'Retire rule: ' + rules[2] }).click();
  await std.waitForURL('**/app/playbook?ok=archived');
  await std.goto(winUrl);
  check('P2 playbook: a retired rule stays on trades that answered it, marked as retired', (await bodyOf(std)).includes('(retired rule)'));
  // a duplicate strategy name is reported, not silently "added"
  await std.goto(BASE + '/app/playbook');
  await std.locator('input[name=name]').fill('London breakout');
  await std.getByRole('button', { name: 'Add strategy' }).click();
  await std.getByText('You already have a strategy with that name.').waitFor({ timeout: 10000 });
  check('P2 playbook: adding an existing strategy name says so (no false "added")', !(await bodyOf(std)).includes('Strategy added.'));
  // retire then permanently delete a rule (frees a slot; also removes its answers)
  const lb = std.locator('div[id^="s-"]', { hasText: 'London breakout' }).first();
  await lb.locator('input[name=text]').fill('Temporary rule');
  await lb.getByRole('button', { name: 'Add rule' }).click();
  await std.locator('ol li', { hasText: 'Temporary rule' }).first().waitFor({ timeout: 10000 });
  await std.getByRole('button', { name: 'Retire rule: Temporary rule' }).click();
  await std.getByText('Rule updated.').waitFor({ timeout: 10000 });
  await std.locator('details', { hasText: 'Retired rules' }).first().locator('summary').click();
  await std.getByRole('button', { name: /^Delete retired rule: Temporary rule/ }).click();
  await std.getByRole('button', { name: /Confirm delete retired rule: Temporary rule/ }).click();
  await std.getByText('Retired rule deleted.').waitFor({ timeout: 10000 });
  check('P2 playbook: a retired rule can be deleted for good', !(await bodyOf(std)).includes('Temporary rule'));
  // the 20-rule cap (18 more rules seeded directly, 2 active already)
  { const c = new Client({ connectionString: process.env.DATABASE_URL }); await c.connect();
    const sid = (await c.query(`select id from tradenotes.strategies where user_id = $1 and name = 'London breakout'`, [seeded.user])).rows[0].id;
    await c.query(`insert into tradenotes.playbook_items (user_id, strategy_id, text, position) select $1, $2, 'filler ' || g, 10 + g from generate_series(1, 18) g`, [seeded.user, sid]); await c.end(); }
  await std.goto(BASE + '/app/playbook');
  const cap = std.locator('div[id^="s-"]', { hasText: 'London breakout' }).first();
  await cap.locator('input[name=text]').fill('one rule too many');
  await cap.getByRole('button', { name: 'Add rule' }).click();
  await std.waitForURL('**/app/playbook?error=limit'); await std.getByText('A strategy can have 20 active rules').waitFor({ timeout: 10000 });
  check('P2 playbook: the 21st active rule is refused with a message', (await bodyOf(std)).includes('A strategy can have 20 active rules'));
  // user B cannot see A's playbook or open A's trades
  await other.goto(BASE + '/app/playbook');
  t = await bodyOf(other);
  check('P2 isolation: B sees none of A\'s strategies or rules', !t.includes('London breakout') && !t.includes(rules[0]));
  const bOpen = await other.goto(winUrl);
  check('P2 isolation: B cannot open A\'s trade (the checklist is not reachable by id)', bOpen.status() === 404);
  // Free account that never paid: upgrade notice, no forms, no checklist card on trades
  await free2.goto(BASE + '/app/playbook');
  check('P2 playbook (Free): upgrade notice, no forms', (await bodyOf(free2)).includes('The playbook is part of Standard and Premium') && (await free2.locator('input[name=text]').count()) === 0 && (await free2.locator('input[name=name]').count()) === 0);
  // Premium on a phone
  await prem2.goto(BASE + '/app/playbook');
  await prem2.locator('input[name=name]').fill('Opening drive');
  await prem2.getByRole('button', { name: 'Add strategy' }).click();
  await prem2.waitForURL('**/app/playbook?ok=strategy'); await prem2.getByText('Strategy added.').waitFor({ timeout: 10000 });
  const pc = prem2.locator('div[id^="s-"]', { hasText: 'Opening drive' }).first();
  await pc.locator('input[name=text]').fill('Only the first 30 minutes');
  await pc.getByRole('button', { name: 'Add rule' }).click();
  await prem2.waitForURL('**/app/playbook?ok=item'); await prem2.getByText('Rule added.').waitFor({ timeout: 10000 });
  check('P2 playbook (Premium, 390px): strategy and rule added; no horizontal scroll', (await bodyOf(prem2)).includes('Only the first 30 minutes') && !(await prem2.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
  // held-open checklist form, then the plan lapses: the server action must refuse (see section 5 for the downgrade)
  globalThis.__lossUrl = lossUrl; globalThis.__winUrl = winUrl;
  globalThis.__stale = await std.context().newPage();
  await globalThis.__stale.goto(lossUrl);

  // ---- 5. reviews (week of Mon 2026-11-02: GBPUSD +590 and ES +100 = +$690.00; October: +1,000 and -500 with a Moved stop tag)
  await std.goto(BASE + '/app/reviews');
  check('P2 reviews (Standard): start-a-review shortcuts shown, history empty', (await bodyOf(std)).includes('Start a review') && (await bodyOf(std)).includes('No reviews yet'));
  const odd = await std.goto(BASE + '/app/reviews/week/2026-11-04');
  check('P2 reviews: a mid-week date is redirected to that week\'s Monday', std.url().endsWith('/app/reviews/week/2026-11-02') && odd.status() === 200, std.url());
  t = await bodyOf(std);
  check('P2 reviews: auto-filled stats for the week (+$690.00, 2 trades, 2W / 0L, win rate 100.0%)', t.includes('▲ +$690.00') && t.includes('2 (2W / 0L)') && t.includes('100.0%'), t.slice(0, 600));
  check('P2 reviews: the five template boxes are there', ['What worked', 'What to repeat', 'Mistakes', 'Rule breaks', 'Next plan'].every((x) => t.includes(x)));
  await std.getByRole('button', { name: 'Save review' }).click();
  check('P2 reviews: saving an empty review is refused with a message', await std.getByText('Write something in at least one box before saving.').first().waitFor({ timeout: 8000 }).then(() => true, () => false));
  await std.getByLabel('What worked').fill('Waited for the retest on GBPUSD.');
  await std.getByLabel('Rule breaks').fill('None this week.');
  await std.getByLabel('Next plan').fill('Keep size at 1 lot.');
  await std.getByRole('button', { name: 'Save review' }).click();
  await std.waitForURL('**/app/reviews?saved=1');
  t = await bodyOf(std);
  check('P2 reviews: saved, shows in history with its date range, snapshot figure and first answer', t.includes('Review saved.') && t.includes('Week of Nov 2 – 8, 2026') && t.includes('+$690.00') && t.includes('Waited for the retest'), t.slice(0, 500));
  await std.goto(BASE + '/app/reviews/week/2026-11-02');
  check('P2 reviews: reopening pre-fills what was written', (await std.getByLabel('What worked').inputValue()) === 'Waited for the retest on GBPUSD.');
  await std.getByLabel('Next plan').fill('Keep size at 1 lot. Review stops on Friday.');
  await std.getByRole('button', { name: 'Save review' }).click();
  await std.waitForURL('**/app/reviews?saved=1');
  check('P2 reviews: editing updates the same review (still one entry for the week)', (await std.locator('section[aria-label="Review history"] li').count()) === 1);
  await std.goto(BASE + '/app/reviews/month/2026-10');
  t = await bodyOf(std);
  check('P2 reviews: monthly review for October: +$500.00, costliest mistake Moved stop', t.includes('▲ +$500.00') && /Moved stop \(-\$500\.00, 1\)/.test(t), t.slice(0, 600));
  check('P2 reviews: garbage periods and dates are 404', (await std.goto(BASE + '/app/reviews/year/2026-01-01')).status() === 404 && (await std.goto(BASE + '/app/reviews/week/banana')).status() === 404 && (await std.goto(BASE + '/app/reviews/day/2026-02-30')).status() === 404);
  // downgrade while a form is open: the server must still refuse the write
  await std.goto(BASE + '/app/reviews/day/2026-11-03');
  await std.getByLabel('What worked').fill('Written after the plan lapsed.');
  await setPlan(`s2${stamp}@e2e.test`, 'free');
  await std.getByRole('button', { name: 'Save review' }).click();
  check('P2 reviews (server gate): saving after the plan lapsed is refused', await std.getByText(/Reviews are part of Standard and Premium/).waitFor({ timeout: 8000 }).then(() => true, () => false));
  await std.goto(BASE + '/app/reviews');
  t = await bodyOf(std);
  check('P2 reviews (downgraded to Free): existing review stays readable; writing is blocked', t.includes('Week of Nov 2 – 8, 2026') && t.includes('Writing reviews is part of Standard and Premium') && !t.includes('Start a review'), t.slice(0, 400));
  await std.goto(BASE + '/app/reviews/week/2026-11-02');
  t = await bodyOf(std);
  check('P2 reviews (Free): saved review readable, no editing form', t.includes('Waited for the retest') && (await std.locator('textarea').count()) === 0);
  await std.goto(BASE + '/app/reviews/week/2026-11-09');
  check('P2 reviews (Free, no review): upgrade notice only', (await bodyOf(std)).includes('The reviews page is part of Standard and Premium') && (await std.locator('textarea').count()) === 0);
  await globalThis.__stale.getByLabel(rules[1]).check();
  await globalThis.__stale.getByRole('button', { name: 'Save checklist' }).click();
  await globalThis.__stale.waitForURL(/\?checks=plan$/);
  check('P2 playbook (server gate): saving a checklist after the plan lapsed is refused', (await bodyOf(globalThis.__stale)).includes('Recording checklists is part of Standard and Premium') && (await bodyOf(globalThis.__stale)).includes('Followed 1 of 3'));
  await std.goto(BASE + '/app/playbook');
  t = await bodyOf(std);
  check('P2 playbook (downgraded to Free): rules stay readable, no forms', t.includes(rules[0]) && t.includes('Editing the playbook is part of Standard and Premium') && (await std.locator('input[name=text]').count()) === 0);
  await std.goto(winUrl);
  t = await bodyOf(std);
  check('P2 playbook (Free): recorded answers are shown read-only', t.includes('✓ Followed · ' + rules[0]) && (await std.locator('input[name=done]').count()) === 0, t.slice(0, 300));
  await std.goto(BASE + '/app/analytics');
  check('P2 analytics (Free): adherence stays readable', (await bodyOf(std)).includes('Playbook adherence'));
  await free2.goto(BASE + '/app/reviews');
  check('P2 reviews (Free, never paid): upgrade notice, no form, no history', (await bodyOf(free2)).includes('The reviews page is part of Standard and Premium') && (await free2.locator('textarea').count()) === 0);
  await free2.goto(BASE + '/app/reviews/week/2026-11-02');
  check('P2 reviews (Free): editor has no form', (await free2.locator('textarea').count()) === 0);
  await other.goto(BASE + '/app/reviews');
  check('P2 isolation: B sees none of A\'s reviews', (await bodyOf(other)).includes('No reviews yet') && !(await bodyOf(other)).includes('Waited for the retest'));
  await other.goto(BASE + '/app/reviews/week/2026-11-02');
  check('P2 isolation: B opening the same week sees an empty form, not A\'s text, and no A numbers', (await other.getByLabel('What worked').inputValue()) === '' && !(await bodyOf(other)).includes('$690.00'));
  // Premium on a phone
  await prem2.goto(BASE + '/app/reviews/week/2026-11-02');
  check('P2 reviews (Premium, 390px): editor has no horizontal scroll', !(await prem2.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
  await prem2.locator('textarea[name=to_improve]').fill('Moved my stop on Tuesday.');
  await prem2.getByRole('button', { name: 'Save review' }).click();
  await prem2.waitForURL('**/app/reviews?saved=1');
  check('P2 reviews (Premium, 390px): saved; history fits the screen', !(await prem2.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)) && (await bodyOf(prem2)).includes('Moved my stop'));
  await prem2.locator('section[aria-label="Review history"] li').first().getByRole('button', { name: /^Delete/ }).click();
  await prem2.locator('section[aria-label="Review history"] li').first().getByRole('button', { name: /Confirm delete/ }).click();
  await prem2.waitForURL('**/app/reviews?deleted=1');
  check('P2 reviews: delete works (two-step)', (await bodyOf(prem2)).includes('Review deleted.') && (await bodyOf(prem2)).includes('No reviews yet'));

  // ---- user isolation through the filter parameters (guessing ids / names)
  const guessed = await other.goto(BASE + `/app/journal?account=${seeded.account}&strategy=London+breakout&symbol=EURUSD`);
  t = await bodyOf(other);
  check('P2 isolation: B passing A\'s account id, strategy and symbol sees nothing (and the id is ignored, not widened)', guessed.status() === 200 && t.includes('No trades match those filters') && (await other.locator('tbody').count()) === 0, t.slice(0, 300));
  await other.goto(BASE + `/app?account=${seeded.account}`);
  t = await bodyOf(other);
  check('P2 isolation: B dashboard with A\'s account id shows the empty welcome, no numbers', t.includes('Start in 3 steps') && !t.includes('$1,190.00'));
  await other.goto(BASE + '/app/analytics?account=all');
  check('P2 isolation: B analytics with account=all has no A data', !(await bodyOf(other)).includes('$1,190.00'));
  // ---- account deletion removes reviews, playbook items and checklist answers too (cascade, no orphans)
  const del = await newUser(browser, `del2${stamp}@e2e.test`);
  await setPlan(`del2${stamp}@e2e.test`, 'starter');
  const ds = await seed(`del2${stamp}@e2e.test`, [P2_TRADES[0]]);
  { const c = new Client({ connectionString: process.env.DATABASE_URL }); await c.connect();
    const sid = (await c.query(`select id from tradenotes.strategies where user_id = $1`, [ds.user])).rows[0].id;
    const tid = (await c.query(`select id from tradenotes.trades where user_id = $1`, [ds.user])).rows[0].id;
    const iid = (await c.query(`insert into tradenotes.playbook_items (user_id, strategy_id, text) values ($1,$2,'rule') returning id`, [ds.user, sid])).rows[0].id;
    await c.query(`insert into tradenotes.trade_checks (trade_id, item_id, user_id, followed) values ($1,$2,$3,true)`, [tid, iid, ds.user]);
    await c.query(`insert into tradenotes.reviews (user_id, period, period_start, went_well) values ($1,'week','2026-11-02','x')`, [ds.user]);
    await c.end(); }
  await del.goto(BASE + '/app/settings');
  await del.getByText('Delete my account', { exact: true }).click();
  await del.getByLabel('Type DELETE to confirm').fill('DELETE');
  await del.getByLabel('Current password').fill('correct-horse-battery');
  await del.getByRole('button', { name: 'Delete my account permanently' }).click();
  await del.waitForURL(BASE + '/?deleted=1', { timeout: 15000 }).catch(() => {});
  { const c = new Client({ connectionString: process.env.DATABASE_URL }); await c.connect();
    const left = (await c.query(`select (select count(*) from tradenotes.playbook_items where user_id = $1)::int items, (select count(*) from tradenotes.trade_checks where user_id = $1)::int checks, (select count(*) from tradenotes.reviews where user_id = $1)::int reviews, (select count(*) from tradenotes.trades where user_id = $1)::int trades`, [ds.user])).rows[0];
    check('P2 delete account: reviews, playbook items, checklist answers and trades are all gone', left.items === 0 && left.checks === 0 && left.reviews === 0 && left.trades === 0, JSON.stringify(left));
    await c.end(); }
  await std.context().close(); await other.context().close(); await free2.context().close(); await prem2.context().close();
}
