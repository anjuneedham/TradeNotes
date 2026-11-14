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
  // E2E_ONLY=phase3 runs just the Phase 3 flows (faster while developing); the default runs everything.
  if (process.env.E2E_ONLY === 'phase3') { await phase3(browser, stamp); await browser.close(); const bad = results.filter(r => !r[1]).length; console.log(`\n${results.length - bad}/${results.length} passed (phase 3 only)`); process.exit(bad ? 1 : 0); }
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
  await phase3(browser, stamp);

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

// ---------------------------------------------------------------------------------------------------------------------
// Phase 3 (differentiation and growth): public demo, strategy comparison, backtest log, share links, quick-log.
// Hand-calculated expectations (seeded P2_TRADES, USD, forex lot = 100,000):
//   London breakout: +1,000.00 (risk 500, so +2.00R) and -500.00 (no stop) -> 2 trades, win 50.0%, expectancy +250.00, profit factor 2.00, avg R 2.00R, max drawdown 500.00, net +500.00
//   Range fade:      +590.00 (gross 600 - fees 10, no stop)                -> 1 trade, win 100.0%, expectancy +590.00, profit factor "-", avg R "-", max drawdown 0.00
//   Backtests (units as typed, no conversion): HYPO1 long 2 @100 stop 95 exit 110 = +20.00 (risk 10, +2.00R); HYPO2 long 1 @50 stop 48 exit 49 = -1.00 (risk 2, -0.50R);
//   HYPO3 long 1 @10 exit 10.5 fees 0.10 = +0.40. Closed in the order HYPO2, HYPO3, HYPO1: net +19.40, win 66.7%, PF 20.40/1 = 20.40, expectancy 19.40/3 = 6.47,
//   avg R (2 - 0.5)/2 = 0.75R, max drawdown 1.00 (-1.00 from the 0 peak, never lower).
//   Quick-log EURUSD short 2 lots 1.1000 -> 1.0950, stop 1.1050: gross 0.005 x 2 x 100,000 = +1,000.00, risk 1,000.00 -> +1.00R; dashboard 1,190.00 + 1,000.00 = 2,190.00 over 5 trades.
//   Demo (fixed seed): 190 trades, net +11,623.48, win rate 46.8%, profit factor 1.44, max drawdown 3,600.16.
const sha256 = (x) => require('crypto').createHash('sha256').update(x).digest('hex');
const newTok = () => require('crypto').randomBytes(32).toString('base64url');
async function phase3(browser, stamp) {
  if (!process.env.DATABASE_URL) { check('phase 3 e2e needs DATABASE_URL (skipped)', false); return; }
  const db = new Client({ connectionString: process.env.DATABASE_URL }); await db.connect();
  const mail = (k) => `${k}3${stamp}@e2e.test`;
  const uid = async (email) => (await db.query('select id from public.tn_user where email = $1', [email])).rows[0].id;
  const noScroll = async (page) => !(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1));
  const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
  const anonPage = async (opts) => (await browser.newContext(opts || {})).newPage();

  // ---------- 0. the public demo: no account, SAMPLE DATA everywhere, real components, read-only
  const pub = await anonPage({ viewport: { width: 390, height: 844 } });
  for (const [path, needle] of [['/demo', '190 closed trades'], ['/demo/analytics', 'R-multiple distribution'], ['/demo/trades/demo-001', 'Execution']]) {
    const r = await pub.goto(BASE + path); const t = await bodyOf(pub);
    check(`P3 demo ${path}: public (200, no login), SAMPLE DATA banner, 390px no horizontal scroll`, r.status() === 200 && !pub.url().includes('/login') && t.includes('SAMPLE DATA: a fictional journal, not real trades') && t.includes(needle) && await noScroll(pub), `${r.status()} ${t.slice(0, 120)}`);
  }
  await pub.goto(BASE + '/demo'); let t = await bodyOf(pub);
  check('P3 demo: fixed sample totals from the real dashboard (net +$11,623.48, win rate 46.8%, profit factor 1.44, drawdown $3,600.16)', t.includes('+$11,623.48') && t.includes('46.8%') && t.includes('1.44') && t.includes('$3,600.16'), t.slice(0, 400));
  check('P3 demo: read-only (no input, textarea or select on the page)', (await pub.locator('#main input, #main textarea, #main select').count()) === 0);
  await pub.goto(BASE + '/demo/analytics');
  check('P3 demo: the dashboard link to the costliest mistake lands on an element that exists', (await pub.locator('#mistake-cost').count()) === 1);
  await pub.goto(BASE + '/demo'); await pub.getByRole('link', { name: /^Open analytics/ }).click(); await pub.waitForURL('**/demo/analytics');
  await pub.goto(BASE + '/demo'); await pub.locator('a[href^="/demo/trades/demo-"]').first().click(); await pub.waitForURL(/\/demo\/trades\/demo-\d{3}/);
  check('P3 demo: a latest-trade link opens a sample trade page (with the banner)', (await bodyOf(pub)).includes('SAMPLE DATA'));
  check('P3 demo: unknown sample trade is a 404', (await pub.goto(BASE + '/demo/trades/demo-999')).status() === 404 && (await pub.goto(BASE + '/demo/trades/x')).status() === 404);
  const anonDesk = await anonPage();
  for (const p of ['/', '/pricing']) { await anonDesk.goto(BASE + p); check(`P3 demo: ${p} links to /demo`, (await anonDesk.locator('a[href="/demo"]').count()) >= 1); }
  const sm = await (await anonDesk.request.get(BASE + '/sitemap.xml')).text();
  check('P3 demo: in the sitemap; sample trades and share links are not', sm.includes('/demo</loc>') && sm.includes('/demo/analytics</loc>') && !/demo\/trades|\/r\//.test(sm));

  // ---------- users
  const free = await newUser(browser, mail('f'));
  const std = await newUser(browser, mail('s'));
  const prem = await newUser(browser, mail('p'), { viewport: { width: 390, height: 844 } });
  const other = await newUser(browser, mail('o'), { viewport: { width: 390, height: 844 } });
  const quick = await newUser(browser, mail('q'), { viewport: { width: 390, height: 844 }, userAgent: IPHONE, isMobile: true, hasTouch: true });
  await setPlan(mail('s'), 'starter'); await setPlan(mail('p'), 'pro'); await setPlan(mail('o'), 'pro'); await setPlan(mail('q'), 'starter');
  await seed(mail('s'), P2_TRADES); await seed(mail('p'), P2_TRADES); await seed(mail('q'), P2_TRADES);
  const pid = await uid(mail('p')), oid = await uid(mail('o'));

  // ---------- 1. strategy comparison (Premium, server-gated)
  const CMP = '/app/strategies/compare?s=London+breakout&s=Range+fade';
  for (const [who, page] of [['Free', free], ['Standard', std]]) {
    await page.goto(BASE + CMP); const b = await bodyOf(page);
    check(`P3 compare (${who}): upgrade notice naming Premium, no table, no numbers loaded`, b.includes('Strategy comparison is part of Premium') && (await page.locator('[data-testid=compare-table]').count()) === 0 && !b.includes('$590.00') && !b.includes('Range fade'), b.slice(0, 200));
  }
  await prem.goto(BASE + CMP);
  const rowsOf = async (page) => Object.fromEntries(await page.locator('[data-testid=compare-table] tbody tr').evaluateAll((trs) => trs.map((tr) => [tr.querySelector('th').innerText.trim(), [...tr.querySelectorAll('td')].map((td) => td.innerText.trim())])));
  let cmp = await rowsOf(prem);
  check('P3 compare (Premium): closed trades 2 / 1 and win rate 50.0% / 100.0%', JSON.stringify(cmp['Closed trades']) === '["2","1"]' && JSON.stringify(cmp['Win rate']) === '["50.0%","100.0%"]', JSON.stringify(cmp));
  check('P3 compare (Premium): expectancy +$250.00 / +$590.00, profit factor 2.00 / no losses, avg R 2.00R / none', JSON.stringify(cmp['Expectancy / trade']) === '["+$250.00","+$590.00"]' && JSON.stringify(cmp['Profit factor']) === '["2.00","—"]' && JSON.stringify(cmp['Average R']) === '["2.00R","—"]', JSON.stringify(cmp));
  check('P3 compare (Premium): max drawdown $500.00 / $0.00 and net +$500.00 / +$590.00', JSON.stringify(cmp['Max drawdown']) === '["$500.00","$0.00"]' && JSON.stringify(cmp['Net P&L']) === '["+$500.00","+$590.00"]', JSON.stringify(cmp));
  t = await bodyOf(prem);
  check('P3 compare (Premium): a small-sample warning for each strategy', /London breakout: only 2 closed trades/.test(t) && /Range fade: only 1 closed trade\./.test(t), t.slice(0, 600));
  check('P3 compare (Premium): overlaid equity curves drawn (accessible name, legend with both strategies) and 390px has no horizontal scroll', (await prem.locator('[data-testid=compare-curves] path').count()) >= 1 && /Equity curves of 2 strategies/.test(await prem.locator('[data-testid=compare-curves]').getAttribute('aria-label')) && t.includes('solid line') && t.includes('dashed line') && await noScroll(prem));
  await prem.goto(BASE + CMP + '&side=short'); t = await bodyOf(prem); cmp = await rowsOf(prem);
  check('P3 compare: the same filters apply to every strategy (short only: London breakout 1 trade, -$500.00; Range fade none)', JSON.stringify(cmp['Closed trades']) === '["1","0"]' && JSON.stringify(cmp['Net P&L']) === '["-$500.00","—"]' && t.includes('Range fade has no closed trades with these filters'), JSON.stringify(cmp));
  await prem.goto(BASE + '/app/strategies/compare?s=Nope&s=Nada'); t = await bodyOf(prem);
  check('P3 compare: unknown strategy names are ignored (asks to choose, no table)', t.includes('Choose two to four strategies') && (await prem.locator('[data-testid=compare-table]').count()) === 0);
  await other.goto(BASE + CMP); t = await bodyOf(other);
  check('P3 isolation: B (Premium, no data) comparing A\'s strategy names sees no table and none of A\'s numbers', !t.includes('$590.00') && !t.includes('$500.00') && (await other.locator('[data-testid=compare-table]').count()) === 0 && t.includes('at least two strategies'), t.slice(0, 300));

  // ---------- 2. manual backtest log (Premium, hypothetical, never mixed with real results)
  for (const [who, page] of [['Free', free], ['Standard', std]]) {
    await page.goto(BASE + '/app/backtests'); t = await bodyOf(page);
    check(`P3 backtests (${who}): upgrade notice naming Premium, no way to add one`, t.includes('The manual backtest log is part of Premium') && (await page.getByRole('link', { name: 'Log hypothetical trade' }).count()) === 0, t.slice(0, 200));
    await page.goto(BASE + '/app/backtests/new');
    check(`P3 backtests (${who}): the entry form is not even rendered`, (await page.locator('input[name=symbol]').count()) === 0 && (await bodyOf(page)).includes('part of Premium'));
  }
  await prem.goto(BASE + '/app/backtests'); t = await bodyOf(prem);
  check('P3 backtests (Premium): empty state, permanent HYPOTHETICAL label', t.includes('No hypothetical trades yet') && t.includes('HYPOTHETICAL: not real trades'));
  await prem.goto(BASE + '/app/backtests/new'); t = await bodyOf(prem);
  check('P3 backtests: entry form carries the label, has no account or currency fields, and fits 390px', t.includes('HYPOTHETICAL: not real trades') && (await prem.locator('select[name=account_id], input[name=currency], input[name=account_id]').count()) === 0 && await noScroll(prem));
  await prem.getByLabel('Market').selectOption('other');
  await prem.getByLabel('Instrument').fill('HYPO1');
  await prem.getByLabel('Quantity').fill('2'); await prem.getByLabel('Entry price').fill('100'); await prem.getByLabel('Entry time').fill('2026-03-01T09:00');
  await prem.getByLabel('Stop loss price').fill('95'); await prem.getByLabel('Exit 1 price', { exact: true }).fill('110'); await prem.getByLabel('Exit time').fill('2026-03-01T10:00');
  await prem.getByLabel('Strategy / setup').fill('Hypo setup');
  await prem.getByRole('button', { name: 'Save hypothetical trade' }).click();
  await prem.waitForURL('**/app/backtests?saved=1');
  t = await bodyOf(prem);
  check('P3 backtests (Premium, 390px): saved; listed as HYPO1 +$20.00, labelled Hypothetical', t.includes('Hypothetical trade saved.') && t.includes('HYPO1') && t.includes('+$20.00') && /Hypothetical\s*\n?\s*\+\$20\.00|HYPO1[\s\S]*Hypothetical/.test(t), t.slice(0, 500));
  // two more, straight into the table (owner connection), so the figures below are exact
  await db.query(`insert into tradenotes.backtest_trades (user_id, symbol, asset_class, side, quantity, entry_price, stop_price, multiplier, initial_risk, opened_at, closed_at, exits, strategy)
    values ($1,'HYPO2','other','long',1,50,48,1,2,'2026-02-02T09:00Z','2026-02-02T10:00Z','[{"quantity":1,"price":49}]','Hypo setup'),
           ($1,'HYPO3','other','long',1,10,null,1,null,'2026-02-05T09:00Z','2026-02-05T10:00Z','[{"quantity":1,"price":10.5}]',null)`, [pid]);
  await db.query(`update tradenotes.backtest_trades set fees = 0.10 where user_id = $1 and symbol = 'HYPO3'`, [pid]);
  await prem.goto(BASE + '/app/backtests'); t = await bodyOf(prem);
  check('P3 backtests: same metrics engine, hand-calculated (net +$19.40, win 66.7%, profit factor 20.40, expectancy +$6.47, avg R 0.75R, drawdown $1.00)',
    t.includes('+$19.40') && t.includes('66.7%') && t.includes('20.40') && t.includes('+$6.47') && t.includes('0.75R') && t.includes('$1.00') && /3 hypothetical trades/.test(t) && t.includes('Based on 3 closed hypothetical trades'), t.slice(0, 800));
  // never mixed with the real journal
  await prem.goto(BASE + '/app'); t = await bodyOf(prem);
  check('P3 backtests: real dashboard is unchanged ($1,190.00 over 4 closed trades) and shows no hypothetical trade', t.includes('$1,190.00') && /4 closed trades/.test(t) && !t.includes('HYPO'));
  await prem.goto(BASE + '/app/analytics'); const ta = await bodyOf(prem);
  await prem.goto(BASE + '/app/journal'); const tj = await bodyOf(prem);
  await prem.goto(BASE + '/app/calendar'); const tc = await bodyOf(prem);
  check('P3 backtests: real analytics, journal and calendar contain no hypothetical trade or strategy', !/HYPO|Hypo setup/.test(ta + tj + tc));
  const realCsv = await (await prem.request.get(BASE + '/app/export')).text();
  check('P3 backtests: the real-trades CSV export has no hypothetical rows', !/HYPO/.test(realCsv) && realCsv.includes('EURUSD'));
  const btCsvRes = await prem.request.get(BASE + '/app/backtests/export'); const btCsv = await btCsvRes.text();
  const btLines = btCsv.replace(/^﻿/, '').split(/\r\n/).filter(Boolean);
  check('P3 backtests: the hypothetical export is labelled in its first line, in every row and in the file name; real trades are not in it',
    btLines[0].startsWith('HYPOTHETICAL: not real trades') && btLines.slice(2).length === 3 && btLines.slice(2).every((l) => l.startsWith('HYPOTHETICAL: not real trades,')) && /HYPOTHETICAL/.test(btCsvRes.headers()['content-disposition'] || '') && !/EURUSD|GBPUSD/.test(btCsv), btLines.slice(0, 3).join(' | '));
  // detail page, screenshots on a hypothetical trade (same bucket and quota, separate path prefix)
  const btId = (await db.query(`select id from tradenotes.backtest_trades where user_id = $1 and symbol = 'HYPO1'`, [pid])).rows[0].id;
  await prem.goto(BASE + `/app/backtests/${btId}`); t = await bodyOf(prem);
  check('P3 backtests: detail page is labelled Hypothetical and shows R +2.00R', t.includes('HYPOTHETICAL: not real trades') && t.includes('+2.00R') && t.includes('+$20.00'), t.slice(0, 300));
  await prem.locator('input[type=file]').setInputFiles({ name: 'chart.png', mimeType: 'image/png', buffer: PNG });
  await prem.getByRole('button', { name: 'Open screenshot 1' }).waitFor({ timeout: 10000 }).catch(() => {});
  const shotRow = (await db.query(`select id, storage_path, size_bytes from tradenotes.backtest_screenshots where backtest_id = $1`, [btId])).rows[0];
  check('P3 backtests: screenshot uploaded to the hypothetical trade, stored under <user>/backtest/<id>/, and real-trade screenshots are untouched', shotRow && shotRow.storage_path.startsWith(`${pid}/backtest/${btId}/`) && (await db.query(`select count(*)::int n from tradenotes.trade_screenshots where user_id = $1`, [pid])).rows[0].n === 0, JSON.stringify(shotRow));
  const shotUrl = `/app/screenshots/${shotRow.id}`;
  const ownView = await prem.request.get(BASE + shotUrl);
  check('P3 backtests: owner can view the screenshot (200 image/png, no-store)', ownView.status() === 200 && ownView.headers()['content-type'] === 'image/png' && /no-store/.test(ownView.headers()['cache-control']));
  check('P3 isolation: B cannot view, delete or upload to A\'s hypothetical trade screenshot (404 each)',
    (await other.request.get(BASE + shotUrl)).status() === 404 && (await other.request.delete(BASE + shotUrl, { headers: { Origin: BASE } })).status() === 404
    && (await other.request.post(BASE + '/app/screenshots', { headers: { Origin: BASE }, multipart: { backtest_id: btId, file: { name: 'a.png', mimeType: 'image/png', buffer: PNG } } })).status() === 404
    && (await std.request.post(BASE + '/app/screenshots', { headers: { Origin: BASE }, multipart: { backtest_id: btId, file: { name: 'a.png', mimeType: 'image/png', buffer: PNG } } })).status() === 404);
  check('P3 isolation: B cannot open, edit or list A\'s hypothetical trades, or export them', (await other.goto(BASE + `/app/backtests/${btId}`)).status() === 404 && (await other.goto(BASE + `/app/backtests/${btId}/edit`)).status() === 404
    && !/HYPO\d/.test(await (async () => { await other.goto(BASE + '/app/backtests'); return bodyOf(other); })()) && !/HYPO\d/.test(await (await other.request.get(BASE + '/app/backtests/export')).text()));
  // a stale form after a downgrade: the server refuses the write
  await prem.goto(BASE + '/app/backtests/new');
  await prem.getByLabel('Market').selectOption('other');
  await prem.getByLabel('Instrument').fill('HYPO9'); await prem.getByLabel('Quantity').fill('1'); await prem.getByLabel('Entry price').fill('10'); await prem.getByLabel('Entry time').fill('2026-03-02T09:00');
  await setPlan(mail('p'), 'free');
  await prem.getByRole('button', { name: 'Save hypothetical trade' }).click();
  await prem.getByText('part of Premium. Nothing was saved.').waitFor({ timeout: 10000 }).catch(() => {});
  check('P3 backtests: plan lapsed with the form open -> the server refuses, nothing saved', (await bodyOf(prem)).includes('part of Premium. Nothing was saved.') && (await db.query(`select count(*)::int n from tradenotes.backtest_trades where user_id = $1 and symbol = 'HYPO9'`, [pid])).rows[0].n === 0);
  await prem.goto(BASE + '/app/backtests'); t = await bodyOf(prem);
  check('P3 backtests: after a downgrade the entries stay readable and exportable, with an upgrade notice and no add link', t.includes('HYPO1') && t.includes('+$19.40') && t.includes('Adding and editing hypothetical trades is part of Premium') && (await prem.getByRole('link', { name: 'Log hypothetical trade' }).count()) === 0 && (await prem.request.get(BASE + '/app/backtests/export')).status() === 200);
  check('P3 backtests: after a downgrade the edit page shows no form', (await prem.goto(BASE + `/app/backtests/${btId}/edit`), (await prem.locator('input[name=symbol]').count()) === 0));
  await prem.goto(BASE + CMP);
  check('P3 compare: after a downgrade the page is gated again (no table)', (await prem.locator('[data-testid=compare-table]').count()) === 0 && (await bodyOf(prem)).includes('part of Premium'));
  const bt3 = (await db.query(`select id from tradenotes.backtest_trades where user_id = $1 and symbol = 'HYPO3'`, [pid])).rows[0].id;
  await prem.goto(BASE + `/app/backtests/${bt3}`);
  await prem.getByRole('button', { name: /^Delete/ }).click(); await prem.getByRole('button', { name: /Confirm delete/ }).click();
  await prem.waitForURL('**/app/backtests?deleted=1');
  check('P3 backtests: deleting your own hypothetical trade is allowed on any plan', (await db.query(`select count(*)::int n from tradenotes.backtest_trades where user_id = $1`, [pid])).rows[0].n === 2);
  await setPlan(mail('p'), 'pro');

  // ---------- 3. share links
  await db.query(`update tradenotes.trades set pre_trade_notes = 'SECRET-NOTE-XYZ' where user_id = $1`, [pid]);
  await db.query(`update tradenotes.accounts set name = 'SECRET-ACCOUNT-NAME' where user_id = $1`, [pid]);
  const realTrade = (await db.query(`select id from tradenotes.trades where user_id = $1 order by opened_at limit 1`, [pid])).rows[0].id;
  const up = await prem.request.post(BASE + '/app/screenshots', { headers: { Origin: BASE }, multipart: { trade_id: realTrade, file: { name: 'a.png', mimeType: 'image/png', buffer: PNG } } });
  check('P3 share: (setup) a real trade has a screenshot, a note and a named account that the public page must never show', up.status() === 201);
  await prem.goto(BASE + '/app/settings#sharing'); t = await bodyOf(prem);
  check('P3 share (Premium, 390px): Settings > Sharing explains what is shared and fits the screen', t.includes('totals only') && t.includes('no money amounts') && t.includes('never shows notes') && await noScroll(prem));
  check('P3 share: "Show money amounts" is OFF by default', !(await prem.getByLabel(/Show money amounts/).isChecked()));
  await prem.getByLabel('Label (only you see it)').fill('For my mentor');
  await prem.getByLabel(/Show money amounts/).check();
  await prem.getByRole('button', { name: 'Create share link' }).click();
  await prem.getByTestId('new-share-url').waitFor({ timeout: 10000 });
  const link1 = (await prem.getByTestId('new-share-url').innerText()).trim(); const tok1 = link1.split('/r/')[1];
  check('P3 share: the link is shown once (43-character token)', /^[A-Za-z0-9_-]{43}$/.test(tok1), link1);
  check('P3 share: after a link is created with amounts shown, the box is OFF again for the next one (never carried over)', !(await prem.getByLabel(/Show money amounts/).isChecked()));
  const row1 = (await db.query(`select * from tradenotes.share_links where user_id = $1 and label = 'For my mentor'`, [pid])).rows[0];
  const dump = JSON.stringify(row1);
  check('P3 share: only a SHA-256 hash is stored (token not in any column), scope all, expires in about 30 days', row1.token_hash === sha256(tok1) && !dump.includes(tok1) && row1.scope === 'all' && row1.show_amounts === true && Math.abs(new Date(row1.expires_at) - Date.now() - 30 * 86400000) < 3600000, dump);
  const pubA = await anonPage({ viewport: { width: 390, height: 844 } });
  const resA = await pubA.goto(BASE + '/r/' + tok1); t = await bodyOf(pubA); const html = await pubA.content();
  check('P3 share: the public report opens without signing in and shows the totals (4 trades, +$1,190.00), a curve, and fits 390px', resA.status() === 200 && t.includes('Trading results summary') && t.includes('+$1,190.00') && /Closed trades\s*4/.test(t) && (await pubA.locator('svg[role=img]').count()) >= 1 && await noScroll(pubA), t.slice(0, 400));
  const forbidden = ['SECRET-NOTE-XYZ', 'SECRET-ACCOUNT-NAME', mail('p'), 'EURUSD', 'GBPUSD', 'USDJPY', 'London breakout', 'Range fade', 'Moved stop', 'New York', '/app/screenshots', '2026-10-05', '2026-10-12', 'HYPO', 'Hypo setup'];
  check('P3 share: nothing private appears in the public page (notes, account name, email, instruments, strategies, tags, screenshots, trade dates, hypothetical trades)', forbidden.every((f) => !t.includes(f) && !html.includes(f)), forbidden.filter((f) => t.includes(f) || html.includes(f)).join(','));
  check('P3 share: public page is noindex (meta + header), no-store, no-referrer', /noindex/.test(await pubA.locator('meta[name=robots]').getAttribute('content')) && /noindex/.test(resA.headers()['x-robots-tag'] || '') && /no-store/.test(resA.headers()['cache-control'] || '') && resA.headers()['referrer-policy'] === 'no-referrer');
  check('P3 share: a mistyped token, a token with extra characters and the signed-out Settings are not reachable (404)', (await pubA.goto(BASE + '/r/' + tok1 + 'x')).status() === 404 && (await pubA.goto(BASE + '/r/' + newTok())).status() === 404);
  // default link: ratios and the shape of the curve only. No money may reach the page, the raw HTML or the data sent to the browser.
  await prem.getByLabel('Label (only you see it)').fill('Ratios only');
  await prem.getByRole('button', { name: 'Create share link' }).click();
  await prem.waitForFunction((old) => { const el = document.querySelector('[data-testid=new-share-url]'); return el && el.textContent.trim() !== old; }, link1, { timeout: 10000 }); // the previous link's URL is still on screen until the new one arrives
  const tok2 = (await prem.getByTestId('new-share-url').innerText()).trim().split('/r/')[1];
  const row2 = (await db.query(`select show_amounts from tradenotes.share_links where token_hash = $1`, [sha256(tok2)])).rows[0];
  const resB = await pubA.goto(BASE + '/r/' + tok2); const tB = await bodyOf(pubA); const htmlB = await pubA.content();
  check('P3 share (default, amounts hidden): stored as hidden; the page shows win rate 75.0%, profit factor 3.38, average R 2.00R and the curve shape, says amounts are hidden',
    row2.show_amounts === false && resB.status() === 200 && tB.includes('hide money amounts') && tB.includes('75.0%') && tB.includes('3.38') && tB.includes('2.00R') && /Closed trades\s*4/.test(tB) && /Shape of the equity curve over 4 closed trades/.test(htmlB), JSON.stringify({ r: row2.show_amounts, s: resB.status(), a: tB.includes('hide money amounts'), b: tB.includes('75.0%'), c: tB.includes('3.38'), d: tB.includes('2.00R'), e: /Closed trades\s*4/.test(tB), f: /Shape of the equity curve over 4 closed trades/.test(htmlB) }) + tB.slice(300, 900));
  check('P3 share (default, amounts hidden): no money anywhere: no dollar amount in the text, no Net P&L / Expectancy / Max drawdown, none of the real totals in the HTML or the data sent to the browser, and no axis labels',
    !/\$\s?\d/.test(tB) && !/Net P&L|Expectancy|Max drawdown/.test(tB) && !/(netPnl|expectancy|maxDrawdown|avgWin|avgLoss)\\?":\s*-?\d/.test(htmlB) && !/cumulative\\?":\s*-?\d{2,}/.test(htmlB) && !htmlB.includes('1,190'), JSON.stringify({ dollar: tB.match(/\$\s?\d.{0,20}/), words: tB.match(/Net P&L|Expectancy|Max drawdown/), keys: htmlB.match(/(netPnl|expectancy|maxDrawdown|avgWin|avgLoss)\\?":\s*-?\d.{0,10}/), cum: htmlB.match(/cumulative\\?":\s*-?\d{2,}.{0,10}/), c: htmlB.includes('1,190') }));
  // another user cannot see, list or revoke the owner's links; forging the id in their own revoke form changes nothing
  await db.query(`insert into tradenotes.share_links (user_id, label, token_hash, expires_at) values ($1,'B own link',$2, now() + interval '5 days')`, [oid, sha256('b-own-token-' + stamp)]);
  await other.goto(BASE + '/app/settings#sharing'); t = await bodyOf(other);
  check('P3 isolation: B\'s Settings list shows only B\'s link, not A\'s', t.includes('B own link') && !t.includes('For my mentor'));
  await other.evaluate((id) => { document.querySelector('form input[name=id]').value = id; }, row1.id);
  await other.getByRole('button', { name: /^Revoke link/ }).first().click();
  await other.waitForURL('**/app/settings?revoked=1**');
  const still = (await db.query(`select revoked_at from tradenotes.share_links where id = $1`, [row1.id])).rows[0];
  check('P3 isolation: B submitting A\'s link id to the revoke action changes nothing (A\'s link still works)', still.revoked_at === null && (await pubA.goto(BASE + '/r/' + tok1)).status() === 200 && (await db.query(`select revoked_at from tradenotes.share_links where user_id = $1`, [oid])).rows[0].revoked_at === null);
  // revoke by the owner: effective at once
  await prem.goto(BASE + '/app/settings#sharing');
  await prem.getByRole('button', { name: 'Revoke link For my mentor' }).click();
  await prem.waitForURL('**/app/settings?revoked=1**');
  t = await bodyOf(prem);
  check('P3 share: the owner revokes the link; the list says revoked and the public page is 404 straight away', t.includes('Link revoked') && /For my mentor\s*\n?\s*revoked/i.test(t) && (await pubA.goto(BASE + '/r/' + tok1)).status() === 404);
  // expired link and a link whose owner has no data
  const tokExp = newTok(); await db.query(`insert into tradenotes.share_links (user_id, label, token_hash, scope, expires_at, created_at) values ($1,'old',$2,'30d', now() - interval '1 day', now() - interval '10 days')`, [pid, sha256(tokExp)]);
  check('P3 share: an expired link is 404', (await pubA.goto(BASE + '/r/' + tokExp)).status() === 404);
  const tokEmpty = newTok(); await db.query(`insert into tradenotes.share_links (user_id, token_hash, expires_at) values ($1,$2, now() + interval '2 days')`, [oid, sha256(tokEmpty)]);
  await pubA.goto(BASE + '/r/' + tokEmpty);
  check('P3 share: a user with no trades gets an honest empty report (no error, no numbers)', (await bodyOf(pubA)).includes('No closed trades in this period yet.') && !(await bodyOf(pubA)).includes('$1,190.00'));
  // every plan can create a link; the cap of 5 active links is shown and enforced
  await free.goto(BASE + '/app/settings#sharing');
  await free.getByRole('button', { name: 'Create share link' }).click(); await free.getByTestId('new-share-url').waitFor({ timeout: 10000 });
  check('P3 share (Free): can create a link (share links are on every plan)', /\/r\/[A-Za-z0-9_-]{43}$/.test((await free.getByTestId('new-share-url').innerText()).trim()));
  const act = (await db.query(`select count(*)::int n from tradenotes.share_links where user_id = $1 and revoked_at is null and expires_at > now()`, [pid])).rows[0].n;
  for (let i = 0; i < 5 - act; i++) await db.query(`insert into tradenotes.share_links (user_id, token_hash, expires_at) values ($1,$2, now() + interval '3 days')`, [pid, sha256('fill' + i + stamp)]);
  await prem.goto(BASE + '/app/settings#sharing');
  check('P3 share: at 5 active links the create button is disabled and says so', (await prem.getByRole('button', { name: 'Create share link' }).isDisabled()) && (await bodyOf(prem)).includes('5 active links, the most allowed'));

  // ---------- 4. mobile quick-log
  await quick.goto(BASE + '/app/quick'); t = await bodyOf(quick);
  const f = (n) => quick.locator(`[data-testid=quick-form] [name=${n}]`);
  check('P3 quick-log: starts from the last trade (USDJPY, long, size 1) and has exactly six fields (instrument, side, size, entry, stop, exit)',
    (await f('symbol').inputValue()) === 'USDJPY' && (await quick.locator('[data-testid=quick-form] input[name=side]:checked').inputValue()) === 'long' && (await f('quantity').inputValue()) === '1'
    && (await quick.locator('[data-testid=quick-form] input:not([type=radio]):not([type=hidden]), [data-testid=quick-form] select, [data-testid=quick-form] textarea').count()) === 5 && (await quick.locator('[data-testid=quick-form] input[type=radio]').count()) === 2, t.slice(0, 200));
  const boxes = await quick.locator('[data-testid=quick-form] input:not([type=radio]):not([type=hidden]), [data-testid=quick-form] button, [data-testid=quick-form] label:has(input[type=radio])').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)));
  check('P3 quick-log (390px): big touch targets (every field, side button and the save button at least 48px tall) and no horizontal scroll', boxes.length === 8 && boxes.every((h) => h >= 48) && await noScroll(quick), JSON.stringify(boxes));
  await f('symbol').fill('EURUSD'); await quick.locator('[data-testid=quick-form] label:has(input[value=short])').click();
  await f('quantity').fill('2'); await f('entry_price').fill('1.1000'); await f('stop_price').fill('1.1050'); await f('exit_price').fill('1.0950');
  await quick.getByRole('button', { name: 'Save trade' }).click();
  await quick.getByTestId('quick-saved').waitFor({ timeout: 10000 });
  check('P3 quick-log: one tap saves; confirmation shown; instrument, side and size stay for the next trade, prices clear', (await bodyOf(quick)).includes('Saved EURUSD short') && (await f('symbol').inputValue()) === 'EURUSD' && (await quick.locator('[data-testid=quick-form] input[name=side]:checked').inputValue()) === 'short' && (await f('quantity').inputValue()) === '2' && (await f('entry_price').inputValue()) === '' && (await f('exit_price').inputValue()) === '');
  const qrow = (await db.query(`select * from tradenotes.trades where user_id = $1 and symbol = 'EURUSD' and side = 'short' and quantity = 2`, [await uid(mail('q'))])).rows[0];
  check('P3 quick-log: an ordinary trade (forex inferred from your earlier EURUSD, lot size 100,000, planned risk 1,000.00, times set, closed with one exit)', qrow && qrow.asset_class === 'forex' && Number(qrow.multiplier) === 100000 && Number(qrow.initial_risk) === 1000 && qrow.opened_at && qrow.closed_at && (await db.query(`select count(*)::int n from tradenotes.trade_exits where trade_id = $1`, [qrow.id])).rows[0].n === 1, JSON.stringify(qrow));
  await quick.goto(BASE + '/app'); t = await bodyOf(quick);
  check('P3 quick-log: same metrics as the full form (dashboard $1,190.00 + $1,000.00 = $2,190.00 over 5 closed trades)', t.includes('$2,190.00') && /5 closed trades/.test(t), t.slice(0, 300));
  await quick.goto(BASE + `/app/journal/${qrow.id}`); t = await bodyOf(quick);
  check('P3 quick-log: the trade page shows +1.00R and +$1,000.00', t.includes('+1.00R') && t.includes('+$1,000.00'), t.slice(0, 300));
  await quick.goto(BASE + '/app/quick');
  check('P3 quick-log: the next visit starts from the trade you just logged (EURUSD, short, size 2)', (await f('symbol').inputValue()) === 'EURUSD' && (await quick.locator('[data-testid=quick-form] input[name=side]:checked').inputValue()) === 'short' && (await f('quantity').inputValue()) === '2');
  await f('symbol').fill('GBPUSD'); await quick.locator('[data-testid=quick-form] label:has(input[value=long])').click(); await f('quantity').fill('1'); await f('entry_price').fill('1.3000');
  await quick.getByRole('button', { name: 'Save trade' }).click(); await quick.getByTestId('quick-saved').waitFor({ timeout: 10000 });
  const open = (await db.query(`select closed_at, (select count(*)::int from tradenotes.trade_exits e where e.trade_id = t.id) as exits from tradenotes.trades t where user_id = $1 and symbol = 'GBPUSD' and quantity = 1 and opened_at > now() - interval '1 hour'`, [await uid(mail('q'))])).rows;
  check('P3 quick-log: leaving the exit blank saves an open trade (no exit, not counted as closed)', open.length === 1 && open[0].closed_at === null && open[0].exits === 0);
  await quick.goto(BASE + '/app/quick');
  await f('symbol').fill('EURUSD'); await quick.locator('[data-testid=quick-form] label:has(input[value=long])').click(); await f('quantity').fill('1'); await f('entry_price').fill('1.1000'); await f('stop_price').fill('1.2000');
  await quick.getByRole('button', { name: 'Save trade' }).click();
  await quick.getByText('For a long, the stop must be below entry').waitFor({ timeout: 10000 }).catch(() => {});
  check('P3 quick-log: invalid input is refused with the same message as the full form, and nothing is saved', (await bodyOf(quick)).includes('For a long, the stop must be below entry') && (await db.query(`select count(*)::int n from tradenotes.trades where user_id = $1 and symbol = 'EURUSD'`, [await uid(mail('q'))])).rows[0].n === 3, '');
  await other.goto(BASE + '/app'); t = await bodyOf(other);
  check('P3 isolation: quick-logged trades belong to the user who logged them (B sees none)', !t.includes('$2,190.00') && t.includes('Start in 3 steps'));
  // plan limit applies to quick-log exactly like the full form: a stale form at the limit is refused by the server
  const lim = await newUser(browser, mail('l'), { viewport: { width: 390, height: 844 } });
  const limRows = (n) => Array.from({ length: n }, (_, i) => ({ symbol: 'LIM' + i, side: 'long', qty: 1, entry: 10, exit: 11, open: '2026-09-01T08:00:00Z', close: '2026-09-01T09:00:00Z' }));
  await seed(mail('l'), limRows(48));
  await lim.goto(BASE + '/app/quick');
  const lf = (n) => lim.locator(`[data-testid=quick-form] [name=${n}]`);
  const logOne = async () => { await lf('symbol').fill('EURUSD'); await lf('quantity').fill('1'); await lf('entry_price').fill('1.1'); await lf('exit_price').fill('1.2'); await lim.getByRole('button', { name: 'Save trade' }).click(); };
  await logOne(); await lim.getByTestId('quick-saved').waitFor({ timeout: 10000 });
  await db.query(`insert into tradenotes.trades (user_id, account_id, symbol, side, quantity, entry_price, opened_at) select u.id, (select id from tradenotes.accounts where user_id = u.id limit 1), 'SNEAK', 'long', 1, 10, now() from public.tn_user u where u.email = $1`, [mail('l')]);
  await logOne();
  await lim.getByText("You've reached your plan's trade limit").waitFor({ timeout: 10000 }).catch(() => {});
  check('P3 quick-log (Free): with the form open, the journal reaches 50 trades elsewhere -> the server refuses the next save (limit notice, upgrade path) and nothing is saved', (await bodyOf(lim)).includes("You've reached your plan's trade limit") && (await db.query(`select count(*)::int n from tradenotes.trades t join public.tn_user u on u.id = t.user_id where u.email = $1`, [mail('l')])).rows[0].n === 50);
  await lim.goto(BASE + '/app/quick');
  check('P3 quick-log (Free at the limit): the page shows the upgrade notice instead of the form', (await bodyOf(lim)).includes('used all 50 trades') && (await lim.locator('[data-testid=quick-form]').count()) === 0);
  const lim2 = await newUser(browser, mail('m'), { viewport: { width: 390, height: 844 } });
  await seed(mail('m'), limRows(49));
  await lim2.goto(BASE + '/app/quick');
  await lim2.locator('[data-testid=quick-form] [name=symbol]').fill('EURUSD'); await lim2.locator('[data-testid=quick-form] [name=quantity]').fill('1'); await lim2.locator('[data-testid=quick-form] [name=entry_price]').fill('1.1');
  await lim2.getByRole('button', { name: 'Save trade' }).click(); await lim2.getByTestId('quick-saved').waitFor({ timeout: 10000 }).catch(() => {});
  check('P3 quick-log (Free): saving the 50th (last allowed) trade keeps the "Saved" confirmation and adds the upgrade notice', (await bodyOf(lim2)).includes('Saved EURUSD') && (await bodyOf(lim2)).includes('used all 50 trades'));
  // installability: manifest, icons, hint, and no service worker
  const man = await (await quick.request.get(BASE + '/manifest.webmanifest')).json();
  const icons = await Promise.all(man.icons.map(async (i) => { const r = await quick.request.get(BASE + i.src); return r.status() === 200 && r.headers()['content-type'] === 'image/png'; }));
  check('P3 quick-log: web manifest opens the quick-log page full-screen, with 192 and 512 icons (and a maskable one) that load', man.start_url === '/app/quick' && man.display === 'standalone' && man.icons.some((i) => i.sizes === '192x192') && man.icons.some((i) => i.sizes === '512x512') && man.icons.some((i) => i.purpose === 'maskable') && icons.every(Boolean), JSON.stringify(man));
  const iconDims = await Promise.all(man.icons.map(async (i) => { const b = await (await quick.request.get(BASE + i.src)).body(); return `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`; }));
  check('P3 quick-log: every manifest icon really has the pixel size it declares (checked in the PNG header), as installability requires', man.icons.every((i, k) => i.sizes === iconDims[k]) && man.name && man.short_name && /^\//.test(man.start_url) && man.scope === '/' && !man.prefer_related_applications, JSON.stringify(iconDims));
  await quick.goto(BASE + '/app/quick'); await quick.getByTestId('install-hint').waitFor({ timeout: 5000 }).catch(() => {});
  check('P3 quick-log: an iPhone sees the add-to-home-screen hint (Share, then Add to Home Screen)', (await quick.getByTestId('install-hint').count()) === 1 && /Add to Home Screen/.test(await quick.getByTestId('install-hint').innerText()));
  await quick.getByRole('button', { name: 'Dismiss this hint' }).click(); await quick.reload();
  await quick.waitForLoadState('networkidle');
  check('P3 quick-log: dismissing the hint is remembered; a desktop browser never sees it', (await quick.getByTestId('install-hint').count()) === 0 && (await (async () => { await prem.goto(BASE + '/app/quick'); await prem.waitForTimeout(500); return prem.getByTestId('install-hint').count(); })()) === 0);
  check('P3 quick-log: no service worker is registered', (await quick.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)) === 0);

  // ---------- 5. account deletion removes hypothetical trades, their screenshots and share links too
  await db.query(`update tradenotes.share_links set revoked_at = now() where id = (select id from tradenotes.share_links where user_id = $1 and revoked_at is null and expires_at > now() limit 1)`, [pid]);
  const tokLive = newTok(); await db.query(`insert into tradenotes.share_links (user_id, token_hash, expires_at) values ($1,$2, now() + interval '4 days')`, [pid, sha256(tokLive)]);
  check('P3 delete account: (setup) the owner\'s link opens before deletion', (await pubA.goto(BASE + '/r/' + tokLive)).status() === 200);
  const pidBefore = { bt: (await db.query('select count(*)::int n from tradenotes.backtest_trades where user_id = $1', [pid])).rows[0].n, sh: (await db.query('select count(*)::int n from tradenotes.share_links where user_id = $1', [pid])).rows[0].n };
  await prem.goto(BASE + '/app/settings');
  await prem.getByText('Delete my account', { exact: true }).click();
  await prem.getByLabel('Type DELETE to confirm').fill('DELETE'); await prem.getByLabel('Current password').fill('correct-horse-battery');
  await prem.getByRole('button', { name: 'Delete my account permanently' }).click();
  await prem.waitForURL(BASE + '/?deleted=1', { timeout: 15000 }).catch(() => {});
  const left = (await db.query(`select (select count(*) from tradenotes.backtest_trades where user_id = $1)::int bt, (select count(*) from tradenotes.backtest_screenshots where user_id = $1)::int shots, (select count(*) from tradenotes.share_links where user_id = $1)::int links`, [pid])).rows[0];
  check('P3 delete account: hypothetical trades, their screenshots and share links are all gone', pidBefore.bt >= 2 && pidBefore.sh >= 5 && left.bt === 0 && left.shots === 0 && left.links === 0, JSON.stringify([pidBefore, left]));
  check('P3 delete account: the deleted user\'s active share link no longer opens (404)', (await pubA.goto(BASE + '/r/' + tokLive)).status() === 404);
  for (const p of [free, std, other, quick, lim, lim2]) await p.context().close();
  await db.end();
}
