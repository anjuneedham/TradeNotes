// Weekly review reminders end to end with a FAKE Resend server (no real email is sent).
// Run the app with: RESEND_API_KEY=test RESEND_API_URL=http://127.0.0.1:9999/emails EMAIL_FROM="TradeNotes <noreply@example.test>" CRON_SECRET=cron-secret-local
//   BETTER_AUTH_SECRET=... BETTER_AUTH_URL=http://localhost:3114 NEXT_PUBLIC_SITE_URL=http://localhost:3114 DATABASE_URL=... npx next start -p 3114
// then: BASE_URL=http://localhost:3114 DATABASE_URL=... node scripts/e2e-reminders.js
const http = require('http');
const { chromium } = require('playwright');
const { Client } = require('pg');
const seed = require('./lib/seed-trades');
const BASE = process.env.BASE_URL || 'http://localhost:3114';
const SECRET = process.env.CRON_SECRET || 'cron-secret-local';
const mails = [];
const mock = http.createServer((req, res) => {
  let b = ''; req.on('data', (d) => (b += d)); req.on('end', () => { try { mails.push(JSON.parse(b)); } catch { /* ignore */ } res.writeHead(200, { 'content-type': 'application/json' }); res.end('{"id":"mock"}'); });
});
const results = [];
const check = (n, ok, x = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${ok ? '' : '  ' + x}`); };
const wait = async (cond, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await cond()) return true; await new Promise((r) => setTimeout(r, 150)); } return false; };
const lastMonday = () => { const d = new Date(); const dow = (d.getUTCDay() + 6) % 7; return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dow - 7)).toISOString().slice(0, 10); };
const call = (headers = {}) => fetch(BASE + '/api/cron/review-reminders', { method: 'POST', headers });

mock.listen(9999, '127.0.0.1', async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL }); await c.connect();
  const b = await chromium.launch(); const ctx = await b.newContext(); const p = await ctx.newPage();
  const stamp = Date.now(); const email = `rem${stamp}@example.test`;
  const week = lastMonday();
  try {
    // --- opt-in through the real Settings page (confirmation link from the fake mailbox)
    await p.goto(BASE + '/signup'); await p.getByLabel('Email').fill(email); await p.getByLabel('Password').fill('correct-horse-battery'); await p.getByRole('button', { name: 'Create account' }).click();
    await wait(() => mails.some((m) => m.to === email && /Confirm/i.test(m.subject)));
    await p.goto(((mails.find((m) => m.to === email).text.match(/https?:\/\/\S+/) || [])[0]));
    await p.waitForURL('**/app/onboarding', { timeout: 15000 }); await p.getByRole('button', { name: 'Continue' }).click(); await p.waitForURL(BASE + '/app', { timeout: 15000 });
    await p.goto(BASE + '/app/settings');
    check('Free: the reminder switch is not offered', (await p.getByLabel(/weekly review reminder/i).count()) === 0);
    const uid = (await c.query('select id from public.tn_user where email = $1', [email])).rows[0].id;
    await c.query(`update tradenotes.subscriptions set plan = 'starter', status = 'active', current_period_end = now() + interval '30 days' where user_id = $1`, [uid]);
    await p.goto(BASE + '/app/settings');
    const box = p.getByLabel(/Email me a weekly review reminder/i);
    check('Standard: the switch is offered and OFF by default (opt-in)', (await box.count()) === 1 && !(await box.isChecked()));
    await box.check(); await p.getByRole('button', { name: 'Save preferences' }).click(); await p.waitForURL('**/app/settings?saved=1');
    check('opting in is saved', (await c.query('select review_reminders r from tradenotes.profiles where id = $1', [uid])).rows[0].r === true);
    // --- other users: Free opted in, already reviewed, sent 2 days ago, not opted in
    const mk = async (tag, plan, opts = {}) => {
      const u = await seed.createUser(c, `rem-${tag}-${stamp}@example.test`, { plan });
      await c.query('update tradenotes.profiles set review_reminders = $2, review_reminder_sent_at = $3 where id = $1', [u.userId, opts.on ?? true, opts.sent ?? null]);
      if (opts.reviewed) await c.query(`insert into tradenotes.reviews (user_id, period, period_start, went_well) values ($1,'week',$2,'done')`, [u.userId, week]);
      return u.userId;
    };
    const free = await mk('free', 'free'), reviewed = await mk('rev', 'starter', { reviewed: true }), recent = await mk('recent', 'starter', { sent: new Date(Date.now() - 2 * 86400000).toISOString() }), off = await mk('off', 'starter', { on: false });
    // --- endpoint authorisation
    check('no Authorization header: 401', (await call()).status === 401);
    check('wrong secret: 401', (await call({ authorization: 'Bearer wrong' })).status === 401);
    check('GET is not allowed', (await fetch(BASE + '/api/cron/review-reminders')).status === 405);
    check('nothing was sent by the refused calls', mails.filter((m) => /weekly review/i.test(m.subject)).length === 0);
    // --- the real run
    const r = await call({ authorization: `Bearer ${SECRET}` }); const j = await r.json();
    check('authorised run succeeds and reports counts only', r.status === 200 && typeof j.sent === 'number' && !JSON.stringify(j).includes('@'), JSON.stringify(j));
    const got = mails.filter((m) => /weekly review/i.test(m.subject));
    check('exactly one reminder sent, to the opted-in Standard user (not Free, not already reviewed, not sent 2 days ago, not opted out)', got.length === 1 && got[0].to === email, JSON.stringify(got.map((m) => m.to)));
    const m = got[0];
    check('email links to last week\'s review and has no trading figures', m.text.includes(`/app/reviews/week/${week}`) && !/[$€£]\s?\d|win rate|P&L/i.test(m.text), m.text.slice(0, 400));
    check('email has an unsubscribe link and a List-Unsubscribe header', /\/reminders\/unsubscribe\?t=/.test(m.text) && /\/reminders\/unsubscribe\?t=/.test((m.headers || {})['List-Unsubscribe'] || ''));
    const row = (await c.query('select review_reminder_sent_at s from tradenotes.profiles where id = $1', [uid])).rows[0];
    check('sent time recorded and an audit row written', row.s !== null && (await c.query(`select count(*)::int n from tradenotes.audit_log where action = 'review_reminder' and user_id = $1`, [uid])).rows[0].n === 1);
    check('Free user untouched', (await c.query('select review_reminder_sent_at s from tradenotes.profiles where id = $1', [free])).rows[0].s === null);
    const j2 = await (await call({ authorization: `Bearer ${SECRET}` })).json();
    check('running again right away sends nothing (one per 6 days)', j2.sent === 0 && mails.filter((x) => /weekly review/i.test(x.subject)).length === 1, JSON.stringify(j2));
    // --- unsubscribe
    const link = m.text.match(/https?:\/\/\S*\/reminders\/unsubscribe\?t=\S+/)[0];
    await p.goto(link.replace(/[.,]$/, ''));
    check('unsubscribe page asks for one click', await p.getByRole('button', { name: 'Unsubscribe' }).isVisible());
    await p.getByRole('button', { name: 'Unsubscribe' }).click(); await p.getByText('Done. You will not get weekly review reminders').waitFor({ timeout: 10000 });
    check('unsubscribe turns the reminder off (no login needed)', (await c.query('select review_reminders r from tradenotes.profiles where id = $1', [uid])).rows[0].r === false);
    await p.goto(BASE + '/reminders/unsubscribe?t=' + encodeURIComponent(`${recent}.${'a'.repeat(64)}`));
    check('a forged token shows "not valid" and changes nothing', (await p.getByText('not valid').count()) === 1 && (await c.query('select review_reminders r from tradenotes.profiles where id = $1', [recent])).rows[0].r === true);
    check('the unsubscribe page is not indexed', /noindex/.test(await p.locator('meta[name=robots]').getAttribute('content')));
    // --- opted out user gets nothing next time even when the gap has passed
    await c.query(`update tradenotes.profiles set review_reminder_sent_at = now() - interval '8 days' where id = $1`, [uid]);
    const j3 = await (await call({ authorization: `Bearer ${SECRET}` })).json();
    check('after unsubscribing nothing is sent', mails.filter((x) => x.to === email && /weekly review/i.test(x.subject)).length === 1, JSON.stringify(j3));
  } finally {
    await c.query(`delete from public.tn_user where email like 'rem-%-${stamp}@example.test' or email = $1`, [email]).catch(() => {});
    await b.close(); await c.end(); mock.close();
    const failed = results.filter((x) => !x).length; console.log(`\n${results.length - failed}/${results.length} passed`); process.exit(failed ? 1 : 0);
  }
});
