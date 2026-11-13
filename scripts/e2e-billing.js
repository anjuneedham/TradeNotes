// Subscription lifecycle end to end against the REAL app + database, with a FAKE HandyPay API and FAKE Resend (nothing is charged or sent).
// Run the app with:
//   HANDYPAY_API_KEY=hp_test_fake HANDYPAY_API_URL=http://127.0.0.1:9998/api/v1 HANDYPAY_WEBHOOK_SECRET=whsec_local
//   RESEND_API_KEY=test RESEND_API_URL=http://127.0.0.1:9998/emails
// then: BASE_URL=http://localhost:3113 DATABASE_URL=... node scripts/e2e-billing.js
// Webhook events are signed exactly as HandyPay documents (X-HandyPay-Signature: sha256=<hex HMAC of raw body>).
const http = require('http');
const crypto = require('crypto');
const { chromium } = require('playwright');
const { Client } = require('pg');
const BASE = process.env.BASE_URL || 'http://localhost:3113';
const SECRET = process.env.HANDYPAY_WEBHOOK_SECRET || 'whsec_local';
const mails = [], calls = [];
const results = [];
const check = (n, ok, x = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${ok ? '' : '  ' + x}`); };
const wait = async (cond, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await cond()) return true; await new Promise((r) => setTimeout(r, 150)); } return false; };

const mock = http.createServer((req, res) => {
  let b = ''; req.on('data', (d) => (b += d)); req.on('end', () => {
    let body = {}; try { body = JSON.parse(b || '{}'); } catch { /* */ }
    const json = (o, s = 200) => { res.writeHead(s, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
    if (req.url === '/emails') { mails.push(body); return json({ id: 'mock' }); }
    calls.push({ method: req.method, url: req.url, auth: req.headers.authorization, body });
    if (req.url === '/api/v1/subscription-sessions') return json({ success: true, session: { id: 'cs_fake', url: `${BASE}/app/billing?fakecheckout=1` } });
    if (/\/subscriptions\/[^/]+\/(cancel|resume)$/.test(req.url)) return json({ success: true });
    if (/\/portal-session$/.test(req.url)) return json({ success: true, url: 'https://portal.example.test/manage' });
    json({ success: false, error: { code: 'not_found' } }, 404);
  });
});

let seq = 0;
const T = Math.floor(Date.now() / 1000);
async function hook(type, object, opts = {}) {
  const evt = { id: opts.id || `evt_e2e_${Date.now()}_${++seq}`, type, created: opts.created || T + seq, data: { object } };
  const raw = JSON.stringify(evt);
  const sig = opts.sig !== undefined ? opts.sig : 'sha256=' + crypto.createHmac('sha256', SECRET).update(raw).digest('hex');
  const r = await fetch(BASE + '/api/webhooks/handypay', { method: 'POST', headers: { 'content-type': 'application/json', ...(sig ? { 'x-handypay-signature': sig } : {}) }, body: raw });
  return { status: r.status, body: await r.json().catch(() => ({})), evt, raw };
}

mock.listen(9998, '127.0.0.1', async () => {
  const db = new Client({ connectionString: process.env.DATABASE_URL }); await db.connect();
  const sub = async (email) => (await db.query(`select s.* from tradenotes.subscriptions s join public.tn_user u on u.id = s.user_id where u.email = $1`, [email])).rows[0];
  const pays = async (email) => (await db.query(`select p.* from tradenotes.payments p join public.tn_user u on u.id = p.user_id where u.email = $1 order by occurred_at`, [email])).rows;
  const browser = await chromium.launch();
  const stamp = Date.now();
  async function newUser(tag) {
    const p = await (await browser.newContext()).newPage();
    const email = `bill-${tag}-${stamp}@example.test`;
    await p.goto(BASE + '/signup'); await p.getByLabel('Email').fill(email); await p.getByLabel('Password').fill('correct-horse-battery');
    await p.getByRole('button', { name: 'Create account' }).click();
    await wait(() => mails.some((m) => m.to === email && /Confirm/i.test(m.subject)), 10000);
    const link = (mails.filter((m) => m.to === email).pop().text.match(/https?:\/\/\S+/) || [])[0];
    await p.goto(link); await p.waitForURL('**/app/onboarding', { timeout: 15000 });
    await p.getByRole('button', { name: 'Continue' }).click(); await p.waitForURL(BASE + '/app', { timeout: 15000 });
    const id = (await db.query('select id from public.tn_user where email = $1', [email])).rows[0].id;
    return { p, email, id };
  }
  try {
    const A = await newUser('a'); const B = await newUser('b');
    check('1. free registration: welcome email sent', await wait(() => mails.some((m) => m.to === A.email && /Welcome/.test(m.subject))));
    check('2. free plan by default', (await sub(A.email)).plan === 'free');

    // --- server-side entitlement: Free limit is enforced even with a hand-built request
    await db.query(`insert into tradenotes.trades (user_id, account_id, symbol, side, quantity, entry_price, opened_at)
      select $1, a.id, 'SEED', 'long', 1, 1, now() from tradenotes.accounts a, generate_series(1, 50) where a.user_id = $1`, [A.id]);
    await A.p.goto(BASE + '/app/journal/new');
    check('Free user at 50 trades sees the limit notice', (await A.p.locator('main').innerText()).includes("You've used all 50 trades"));

    // --- 3/4/5. plan selection -> checkout (session carries user id + plan in metadata)
    await A.p.goto(BASE + '/app/billing');
    await A.p.getByRole('button', { name: 'Subscribe to Standard' }).click();
    await A.p.waitForURL('**fakecheckout=1');
    const cs = calls.find((c) => c.url === '/api/v1/subscription-sessions');
    check('checkout session created with API key, $12/month USD', cs && cs.auth === 'Bearer hp_test_fake' && cs.body.amount_cents === 1200 && cs.body.currency === 'usd' && cs.body.interval === 'month', JSON.stringify(cs && cs.body));
    check('checkout carries user id + plan in metadata and success/cancel URLs', cs && cs.body.metadata.user_id === A.id && cs.body.metadata.plan === 'starter' && /checkout=success/.test(cs.body.success_url) && /checkout=cancelled/.test(cs.body.cancel_url));
    check('still Free before payment confirmation (no activation from the redirect)', (await sub(A.email)).plan === 'free');

    // --- webhook security
    check('unsigned webhook rejected (401)', (await hook('checkout.session.completed', { subscription: `sub_A1_${stamp}`, metadata: { user_id: A.id, plan: 'pro' } }, { sig: '' })).status === 401);
    const forged = await hook('checkout.session.completed', { subscription: `sub_A1_${stamp}`, metadata: { user_id: A.id, plan: 'pro' } }, { sig: 'sha256=' + crypto.createHmac('sha256', 'wrong').update('x').digest('hex') });
    check('wrongly signed webhook rejected (401)', forged.status === 401);
    check('rejected webhooks changed nothing', (await sub(A.email)).plan === 'free');

    // --- 6/7. successful payment -> entitlement activation
    const c1 = await hook('checkout.session.completed', { id: 'cs_fake', subscription: `sub_A1_${stamp}`, customer: 'cus_A', metadata: { user_id: A.id, plan: 'starter' } });
    const inv1 = { id: `in_A1_${stamp}`, subscription: `sub_A1_${stamp}`, customer: 'cus_A', amount_paid: 1200, currency: 'usd', hosted_invoice_url: 'https://receipts.example.test/in_A1', lines: { data: [{ period: { end: T + 30 * 86400 } }] }, metadata: { user_id: A.id, plan: 'starter' } };
    const p1 = await hook('invoice.paid', inv1);
    let s = await sub(A.email);
    check('checkout + invoice.paid -> Standard active', c1.status === 200 && p1.status === 200 && s.plan === 'starter' && s.status === 'active' && s.provider_subscription_id === `sub_A1_${stamp}`, JSON.stringify(s));
    check('confirmation email sent', await wait(() => mails.some((m) => m.to === A.email && /Standard plan is active/.test(m.subject))));
    await A.p.goto(BASE + '/app/journal/new');
    check('Standard entitlement unlocks logging past 50 trades (server-side)', !(await A.p.locator('main').innerText()).includes("You've used all"));
    await A.p.goto(BASE + '/app/billing?checkout=success');
    const bt = await A.p.locator('main').innerText();
    check('billing shows Standard, Active, payment history with receipt', /Standard/.test(bt) && /Active/i.test(bt) && /Payment history/.test(bt) && /\$12\.00/.test(bt), bt.slice(0, 500));

    // --- duplicate delivery
    const dup = await hook('invoice.paid', inv1, { id: p1.evt.id, created: p1.evt.created });
    check('duplicate webhook is a no-op (200, "duplicate")', dup.status === 200 && dup.body.outcome === 'duplicate', JSON.stringify(dup.body));
    check('duplicate did not double-record the payment', (await pays(A.email)).length === 1);

    // --- 8. renewal
    await hook('invoice.paid', { ...inv1, id: `in_A2_${stamp}`, lines: { data: [{ period: { end: T + 60 * 86400 } }] } });
    s = await sub(A.email);
    check('8. renewal extends period and records 2nd payment', new Date(s.current_period_end).getTime() / 1000 >= T + 59 * 86400 && (await pays(A.email)).length === 2);

    // --- 9. failed payment (grace) then recovery
    await hook('invoice.payment_failed', { id: `in_A3_${stamp}`, subscription: `sub_A1_${stamp}`, amount_due: 1200, currency: 'usd' });
    s = await sub(A.email);
    check('9. failed payment -> past_due, still Standard (grace)', s.status === 'past_due');
    check('payment failure email sent', await wait(() => mails.some((m) => m.to === A.email && /didn't go through/.test(m.subject))));
    await A.p.goto(BASE + '/app/billing');
    check('billing warns about the failed payment', (await A.p.locator('main').innerText()).includes('Your last payment failed'));
    await hook('invoice.paid', { ...inv1, id: `in_A4_${stamp}`, lines: { data: [{ period: { end: T + 60 * 86400 } }] } });
    check('retry succeeds -> active again', (await sub(A.email)).status === 'active');

    // --- 10/12. cancellation from the app, paid-through access
    await A.p.goto(BASE + '/app/billing');
    await A.p.getByRole('button', { name: 'Cancel subscription' }).click();
    await A.p.waitForURL('**cancelled=1');
    check('10. cancel calls HandyPay for THIS user\'s subscription', calls.some((c) => c.url === `/api/v1/subscriptions/sub_A1_${stamp}/cancel`));
    s = await sub(A.email);
    check('cancel_at_period_end set; plan kept (paid-through)', s.cancel_at_period_end === true && s.plan === 'starter' && s.status === 'active');
    await A.p.getByText('Resume subscription').waitFor({ timeout: 8000 }).catch(() => {});
    const ct = await A.p.locator('main').innerText();
    check('billing shows "Ends …" and offers Resume', /Ends /i.test(ct) && /Resume subscription/.test(ct), ct.slice(0, 400));
    await hook('customer.subscription.updated', { id: `sub_A1_${stamp}`, customer: 'cus_A', status: 'active', cancel_at_period_end: true, current_period_end: T + 60 * 86400, metadata: { user_id: A.id, plan: 'starter' } });
    check('cancellation email sent', await wait(() => mails.some((m) => m.to === A.email && /subscription is cancelled/.test(m.subject))));
    await A.p.getByRole('button', { name: 'Resume subscription' }).click();
    await A.p.waitForURL('**resumed=1');
    check('resume calls HandyPay and clears cancellation', calls.some((c) => c.url === `/api/v1/subscriptions/sub_A1_${stamp}/resume`) && (await sub(A.email)).cancel_at_period_end === false);
    await A.p.getByRole('button', { name: /Update card/ }).click();
    await wait(() => calls.some((c) => /portal-session/.test(c.url)));
    check('portal link requests a signed HandyPay page for THIS subscription', calls.some((c) => c.url === `/api/v1/subscriptions/sub_A1_${stamp}/portal-session`));
    A.p = await (await browser.newContext({ storageState: await A.p.context().storageState() })).newPage();

    // --- 11/13. downgrade / expiry
    await hook('customer.subscription.deleted', { id: `sub_A1_${stamp}`, customer: 'cus_A', status: 'canceled', ended_at: T + 1000, metadata: { user_id: A.id, plan: 'starter' } });
    s = await sub(A.email);
    check('11/13. subscription ended -> canceled (Free)', s.status === 'canceled');
    await A.p.goto(BASE + '/app/journal/new');
    check('Free limit applies again after expiry; data kept', (await A.p.locator('main').innerText()).includes("You've used all 50 trades") && (await db.query('select count(*)::int n from tradenotes.trades where user_id=$1', [A.id])).rows[0].n === 50);
    check('ended email sent', await wait(() => mails.some((m) => m.to === A.email && /plan has ended/.test(m.subject))));
    const stale = await hook('customer.subscription.updated', { id: `sub_A1_${stamp}`, status: 'active', current_period_end: T + 90 * 86400, metadata: { user_id: A.id, plan: 'starter' } }, { created: T - 100 });
    check('stale/out-of-order event cannot re-activate', stale.status === 200 && (await sub(A.email)).status === 'canceled', JSON.stringify(stale.body));

    // --- 14. re-subscription to Premium
    await hook('checkout.session.completed', { subscription: `sub_A2_${stamp}`, customer: 'cus_A', metadata: { user_id: A.id, plan: 'pro' } });
    await hook('invoice.paid', { id: `in_A5_${stamp}`, subscription: `sub_A2_${stamp}`, amount_paid: 2400, currency: 'usd', lines: { data: [{ period: { end: T + 120 * 86400 } }] }, metadata: { user_id: A.id, plan: 'pro' } });
    s = await sub(A.email);
    check('14. re-subscribe -> Premium active on new subscription', s.plan === 'pro' && s.status === 'active' && s.provider_subscription_id === `sub_A2_${stamp}`);
    const late = await hook('customer.subscription.deleted', { id: `sub_A1_${stamp}`, status: 'canceled' });
    check('late event for the OLD subscription does not cancel the new one', (await sub(A.email)).status === 'active', JSON.stringify(late.body));

    // --- CSV import (Premium A; Free B gated)
    const csvText = 'Symbol,Direction,Qty,Entry Price,Exit Price,Open Time,Close Time,Commission\n' +
      'AAPL,Buy,10,100,110,2026-10-01T14:30:00Z,2026-10-01T15:00:00Z,1\n' +
      'TSLA,sell,5,200,190,2026-10-02T14:30:00Z,2026-10-02T15:00:00Z,\n' +
      'AAPL,Buy,10,100,110,2026-10-01T14:30:00Z,2026-10-01T15:00:00Z,1\n' +
      'BAD,hold,0,0,1,notadate,,\n';
    const upload = async () => {
      await A.p.goto(BASE + '/app/import');
      await A.p.getByLabel('Trade history file').setInputFiles({ name: 'broker.csv', mimeType: 'text/csv', buffer: Buffer.from(csvText) });
      await A.p.getByText('Trades ready').waitFor({ timeout: 8000 });
      await A.p.getByLabel('Market').selectOption('stock');
    };
    await upload();
    const pv = await A.p.locator('main').innerText();
    check('import preview: 2 ready, 1 problem row, 1 duplicate in file', /Trades ready\s*2/.test(pv) && /Rows with problems\s*1/.test(pv) && /1 duplicate row\(s\) in the file were skipped/.test(pv), pv.slice(0, 400));
    await A.p.getByRole('button', { name: 'Import 2 trades' }).click();
    await A.p.waitForURL('**/app/import?done=*', { timeout: 15000 });
    await A.p.getByText(/^Imported \d+ trade/).waitFor({ timeout: 10000 }).catch(() => {});
    const it1 = await A.p.locator('main').innerText();
    check('import saves 2 trades with exits (P&L computed)', it1.includes('Imported 2 trades') &&
      (await db.query("select count(*)::int n from tradenotes.trades t join tradenotes.trade_exits e on e.trade_id=t.id where t.user_id=$1 and t.import_id is not null", [A.id])).rows[0].n === 2, it1.slice(0, 300));
    await A.p.goto(BASE + '/app/journal?q=AAPL');
    check('imported trades appear in journal with result (AAPL +$99.00)', (await A.p.locator('main').innerText()).includes('$99.00'));
    await upload();
    await A.p.getByRole('button', { name: 'Import 2 trades' }).click();
    await A.p.waitForURL('**/app/import?done=*', { timeout: 15000 });
    await A.p.getByText(/^Imported \d+ trade/).waitFor({ timeout: 10000 }).catch(() => {});
    check('re-importing the same file adds nothing (duplicates skipped)', /Imported 0 trades, skipped 3 duplicates/.test(await A.p.locator('main').innerText()), (await A.p.locator('main').innerText()).slice(0, 300));
    await A.p.locator('li', { hasText: '2 trades still in journal' }).getByRole('button', { name: /Delete/ }).click();
    await A.p.locator('li', { hasText: '2 trades still in journal' }).getByRole('button', { name: /Confirm delete/ }).click();
    await A.p.waitForURL('**rolledback=1');
    check('rolling back an import removes its trades', (await db.query("select count(*)::int n from tradenotes.trades where user_id=$1 and import_id is not null", [A.id])).rows[0].n === 0);
    await B.p.goto(BASE + '/app/import');
    const bi = await B.p.locator('main').innerText();
    check('Free user sees the plan gate, no upload form', /Broker import is part of Standard and Premium/.test(bi) && (await B.p.getByLabel('Trade history file').count()) === 0);
    // --- isolation: B
    await B.p.goto(BASE + '/app/billing');
    const bb = await B.p.locator('main').innerText();
    check('B sees Free, no payment history, no A data', /Free/.test(bb) && !/Payment history/.test(bb) && !bb.includes('$24.00'));
    const before = calls.length;
    await B.p.goto(BASE + '/app/billing');
    check('B has no Cancel button (no subscription)', (await B.p.getByRole('button', { name: 'Cancel subscription' }).count()) === 0);
    check('B made no HandyPay calls', calls.length === before);
    check('unknown-user events are ignored, not errors', (await hook('invoice.paid', { id: `in_Z_${stamp}`, subscription: 'sub_none', amount_paid: 1200, metadata: { user_id: '00000000-0000-4000-8000-000000000000' } })).body.outcome === 'ignored:no-matching-user');
    const ev = (await db.query("select count(*)::int n from tradenotes.billing_events where processed_at is not null")).rows[0].n;
    check('every accepted event is stored and marked processed', ev >= 12, String(ev));
  } catch (e) {
    console.log('E2E CRASH', e.message); results.push(false);
  } finally {
    await browser.close(); await db.end(); mock.close();
    const pass = results.filter(Boolean).length;
    console.log(`\n${pass}/${results.length} passed`);
    process.exit(pass === results.length ? 0 : 1);
  }
});
