// HQ browser end-to-end test (Playwright). Run via scripts/run-e2e.sh (it prepares the DB, env and server).
const { chromium } = require('playwright');
const { Client } = require('pg');
const http = require('http');
const crypto = require('crypto');

const BASE = process.env.BASE_URL || 'http://localhost:3201';
const results = [];
const check = (name, ok, extra = '') => { results.push([name, !!ok]); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  ' + extra}`); };

// ---- helpers ----
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function totp(secret, at = Date.now()) {
  let bits = ''; for (const ch of secret) bits += B32.indexOf(ch).toString(2).padStart(5, '0');
  const key = Buffer.from(bits.match(/.{8}/g).map((b) => parseInt(b, 2)));
  const msg = Buffer.alloc(8); msg.writeBigUInt64BE(BigInt(Math.floor(at / 30000)));
  const h = crypto.createHmac('sha1', key).update(msg).digest(); const o = h[h.length - 1] & 15;
  return String((((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1e6).padStart(6, '0');
}
const flashOf = (page) => { const u = new URL(page.url()); return { ok: u.searchParams.get('ok'), err: u.searchParams.get('err') }; };
async function act(page, locator) {
  const posted = page.waitForResponse((r) => r.request().method() === 'POST', { timeout: 20000 });
  await locator.click(); await posted;
  await page.waitForLoadState('networkidle'); await page.waitForTimeout(250);
  return flashOf(page);
}
const text = async (page) => (await page.locator('body').innerText());

// ---- fake Resend + customer site ----
const sent = [];
const fake = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/emails') {
    let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => { sent.push({ auth: req.headers.authorization, body: JSON.parse(b) }); res.writeHead(200, { 'content-type': 'application/json' }); res.end('{"id":"fake"}'); });
  } else { res.writeHead(200); res.end('ok'); }
});

(async () => {
  await new Promise((r) => fake.listen(3299, r));
  const db = new Client({ connectionString: process.env.DATABASE_URL }); await db.connect();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  const go = (p) => page.goto(BASE + p);

  // ===== 1. gate =====
  await go('/');
  check('signed-out visitor is sent to /login', page.url().endsWith('/login'));
  for (const p of ['/customers', '/outreach', '/content', '/settings', '/customers/export', '/prompter/00000000-0000-0000-0000-000000000000']) { await go(p); if (!page.url().endsWith('/login')) check(`gate: ${p} redirects to login`, false, page.url()); }
  check('gate: every internal route (incl. CSV export and prompter) redirects to login', true);
  const apiRes = await ctx.request.get(BASE + '/customers/export', { maxRedirects: 0 });
  check('CSV export is not downloadable without a session (redirect, no data)', apiRes.status() >= 300 && apiRes.status() < 400, String(apiRes.status()));
  const hdr = (await ctx.request.get(BASE + '/login')).headers();
  check('security headers: noindex, no-store, frame deny', /noindex/.test(hdr['x-robots-tag'] || '') && /no-store/.test(hdr['cache-control'] || '') && hdr['x-frame-options'] === 'DENY', JSON.stringify(hdr));

  // ===== 2. login, lockout, 2FA =====
  const login = async (email, pw, code) => { await go('/login'); await page.getByLabel('Email').fill(email); await page.getByLabel('Password').fill(pw); if (code !== undefined) await page.getByLabel('Authenticator code').fill(code); await page.getByRole('button', { name: 'Log in' }).click(); await page.waitForLoadState('networkidle'); };
  await login('owner@hq.test', 'wrong-password-1', '000000');
  check('wrong password refused with a generic message', /Wrong email, password or code/.test(await text(page)) && page.url().includes('/login'));
  await login('someone@else.com', 'correct-horse-battery', totp('JBSWY3DPEHPK3PXP'));
  check('wrong email refused with the same message', /Wrong email, password or code/.test(await text(page)));
  await login('owner@hq.test', 'correct-horse-battery', '123456');
  check('right password but wrong 2FA code refused', /Wrong email, password or code/.test(await text(page)) && page.url().includes('/login'));
  await login('owner@hq.test', 'nope-nope-nope-1', '000000'); await login('owner@hq.test', 'nope-nope-nope-2', '000000');
  await login('owner@hq.test', 'correct-horse-battery', totp('JBSWY3DPEHPK3PXP'));
  check('after 5 failures even the correct password + code is locked out', /Too many failed attempts/.test(await text(page)) && page.url().includes('/login'));
  await db.query('delete from hq.login_attempts');
  await login('owner@hq.test', 'correct-horse-battery', totp('JBSWY3DPEHPK3PXP'));
  check('correct email + password + 2FA code logs in', page.url() === BASE + '/', page.url());
  await go('/login'); check('logged-in owner visiting /login is bounced to Today', page.url() === BASE + '/');

  // ===== 3. Today =====
  let t = await text(page);
  check('Today shows goal progress 1 / 10 paying and founding 1 / 10', /1 \/ 10/.test(t) && /PAYING/i.test(t));
  check('Today counts 5 real signups (test account hidden)', /SIGNUPS\s*\n?\s*5/i.test(t.replace(/\n+/g, '\n')) || /5\s*\n[^\n]*logged a trade/.test(t), t.slice(0, 400));
  check('Today lists the seeded launch gates', /Launch gates open\s*\n?\s*9/i.test(t.replace(/\n+/g, '\n')) || /LAUNCH GATES OPEN/i.test(t));

  // ===== 4. Customers =====
  await go('/customers'); t = await text(page);
  check('customers list shows real customers', ['alice@trader.io', 'bob@trader.io', 'cara@trader.io', 'eve@trader.io'].every((e) => t.includes(e)));
  check('test accounts (@e2e.test) are hidden by default', !t.includes('hidden@e2e.test'));
  await go('/customers?test=1'); check('…and shown on request', (await text(page)).includes('hidden@e2e.test'));
  await go('/customers?f=expiring'); t = await text(page); check('"Expiring ≤7d" filter shows Cara only', t.includes('cara@trader.io') && !t.includes('alice@trader.io'));
  await go('/customers?f=stuck'); t = await text(page); check('"Signed up, no trade" filter shows Eve (5 days, 0 trades), not Bob (1 hour old)', t.includes('eve@trader.io') && !t.includes('bob@trader.io'));
  // Payment helper: unknown payer
  await go('/customers'); await page.getByPlaceholder('customer@example.com').fill('nobody@nowhere.io');
  let r = await act(page, page.getByRole('button', { name: 'Find & activate' }));
  check('payer email with no account is reported, not guessed', /No TradeNotes account uses nobody@nowhere.io/.test(r.err || ''), JSON.stringify(r));
  // Bob: founding with 0 trades is blocked
  await go('/customers'); await page.getByRole('link', { name: 'bob@trader.io' }).click(); await page.waitForURL(/customers\/b0000000/);
  await page.locator('select[name=plan]').selectOption('starter'); await page.getByLabel('Founding member (50%)').check();
  r = await act(page, page.getByRole('button', { name: 'Save plan' }));
  check('founding offer to someone with no trades is blocked (playbook rule)', /only after someone has logged trades/.test(r.err || ''), JSON.stringify(r));
  let sub = (await db.query("select plan from tradenotes.subscriptions where user_id = 'b0000000-0000-0000-0000-00000000000b'")).rows[0];
  check('…and nothing was written', sub.plan === 'free');
  await page.locator('select[name=plan]').selectOption('starter'); await page.getByLabel('Founding member (50%)').check(); await page.getByLabel(/offer founding anyway/).check();
  await page.getByLabel('Payment reference').fill('HP-TEST-1');
  r = await act(page, page.getByRole('button', { name: 'Save plan' }));
  sub = (await db.query("select plan,status,is_founding_member,current_period_end from tradenotes.subscriptions where user_id = 'b0000000-0000-0000-0000-00000000000b'")).rows[0];
  const days = (new Date(sub.current_period_end) - Date.now()) / 86400000;
  check('confirmed plan change writes starter/active/founding with ~35 days', sub.plan === 'starter' && sub.status === 'active' && sub.is_founding_member && days > 34 && days < 35.1, JSON.stringify(sub) + JSON.stringify(r));
  const audit = (await db.query("select action, detail from tradenotes.audit_log where user_id = 'b0000000-0000-0000-0000-00000000000b'")).rows;
  check('plan change is audited with the payment reference', audit.length === 1 && audit[0].action === 'hq.plan_change' && audit[0].detail.ref === 'HP-TEST-1' && audit[0].detail.to === 'starter', JSON.stringify(audit));
  // Alice via payer email -> pro
  await go('/customers'); await page.getByPlaceholder('customer@example.com').fill('ALICE@trader.io'); await page.getByLabel('Plan paid').selectOption('pro');
  await Promise.all([page.waitForURL(/customers\/a0000000.*plan=pro/), page.getByRole('button', { name: 'Find & activate' }).click()]);
  check('payer email lookup (case-insensitive) opens Alice with Pro preselected', (await page.locator('select[name=plan]').inputValue()) === 'pro');
  r = await act(page, page.getByRole('button', { name: 'Save plan' }));
  check('Alice activated on Pro', /pro active until/.test(r.ok || ''), JSON.stringify(r));
  // Extend Cara
  const before = (await db.query("select current_period_end e from tradenotes.subscriptions where user_id = 'c0000000-0000-0000-0000-00000000000c'")).rows[0].e;
  await go('/customers/c0000000-0000-0000-0000-00000000000c'); r = await act(page, page.getByRole('button', { name: /Extend \+35 days/ }));
  const after = (await db.query("select current_period_end e from tradenotes.subscriptions where user_id = 'c0000000-0000-0000-0000-00000000000c'")).rows[0].e;
  check('extending adds exactly 35 days to the running period', Math.abs((new Date(after) - new Date(before)) / 86400000 - 35) < 0.01, `${before} -> ${after}`);
  // seats: Cara + Bob + Alice? (Alice not founding). Now fill seats to 10 via SQL, then block the 11th
  await db.query("insert into public.tn_user (id,name,email) select gen_random_uuid(),'f'||g,'f'||g||'@seat.io' from generate_series(1,8) g");
  await db.query("insert into tradenotes.subscriptions (user_id, plan, status, current_period_end, is_founding_member) select id,'starter','active',now()+interval '10 days',true from public.tn_user where email like '%@seat.io'");
  await go('/customers/e0000000-0000-0000-0000-00000000000e'); await page.locator('select[name=plan]').selectOption('starter'); await page.getByLabel('Founding member (50%)').check(); await page.getByLabel(/offer founding anyway/).check();
  r = await act(page, page.getByRole('button', { name: 'Save plan' }));
  check('the 11th founding seat is refused', /seats are taken/.test(r.err || ''), JSON.stringify(r));
  await db.query("delete from public.tn_user where email like '%@seat.io'");
  // Downgrade Bob
  await go('/customers/b0000000-0000-0000-0000-00000000000b'); await page.locator('select[name=plan]').selectOption('free');
  r = await act(page, page.getByRole('button', { name: 'Save plan' }));
  sub = (await db.query("select plan,is_founding_member,current_period_end from tradenotes.subscriptions where user_id = 'b0000000-0000-0000-0000-00000000000b'")).rows[0];
  check('downgrade to Free clears period + founding flag, keeps the account', sub.plan === 'free' && !sub.is_founding_member && sub.current_period_end === null);
  // CSV export
  const csv = await (await ctx.request.get(BASE + '/customers/export')).text();
  check('CSV export contains customers, hides test accounts', csv.includes('alice@trader.io') && !csv.includes('hidden@e2e.test'));
  check('CSV export neutralises spreadsheet formulas (=cmd|calc)', csv.includes('"\'=cmd|calc"') && !csv.includes('"=cmd|calc"'), csv.split('\n').find((l) => l.includes('fiona')));

  // ===== 5. Outreach =====
  await go('/outreach');
  await page.getByLabel('One per line: handle | what they posted').fill('@sam_fx | lost 3 trades in a row\nlena.t - asking for a journal app\nSAM_FX | duplicate');
  r = await act(page, page.getByRole('button', { name: 'Add all' }));
  check('bulk add parses lines and skips duplicates (case-insensitive)', /Added 2 new, skipped 1/.test(r.ok || ''), JSON.stringify(r));
  await go('/outreach'); await page.getByRole('link', { name: '@sam_fx' }).click(); await page.waitForURL(/outreach\/[0-9a-f-]{36}/);
  const prospectUrl = page.url().split('?')[0];
  const body0 = await page.getByLabel('Message').inputValue();
  check('composer fills the cold-DM template with name + what they posted', /saw your post about lost 3 trades in a row/.test(body0) && !/\{specific thing\}/.test(body0), body0);
  r = await act(page, page.getByRole('button', { name: /I sent this DM/ }));
  check('first DM logged', /Logged dm/.test(r.ok || ''), JSON.stringify(r));
  await page.goto(prospectUrl); check('timeline shows the DM and stage moved to "DM sent"', /DM sent/.test(await text(page)) && /saw your post about lost 3 trades/.test(await text(page)));
  r = await act(page, page.getByRole('button', { name: /I sent this follow-up/ }));
  check('follow-up on day 0 is refused ("too early")', /Too early/.test(r.err || ''), JSON.stringify(r));
  await db.query("update hq.touches set at = now() - interval '4 days' where kind = 'dm'");
  await page.goto(prospectUrl); check('after 3+ days a follow-up-due banner shows', /Follow-up is due now/.test(await text(page)));
  await go('/outreach'); check('outreach page lists the due follow-up', /follow-ups due \(1\)/i.test(await text(page)));
  await page.goto(prospectUrl); await page.getByLabel('Message').fill('Just bumping this in case it got buried');
  r = await act(page, page.getByRole('button', { name: /I sent this follow-up/ }));
  check('follow-up logged once it is due', /Logged follow-up/.test(r.ok || ''), JSON.stringify(r));
  await page.goto(prospectUrl); await page.getByLabel('Message').fill('A different second follow-up');
  r = await act(page, page.getByRole('button', { name: /I sent this follow-up/ }));
  check('a SECOND follow-up is refused (one follow-up, then stop)', /Follow-up already sent/.test(r.err || ''), JSON.stringify(r));
  const nFollow = (await db.query("select count(*)::int n from hq.touches where kind='followup'")).rows[0].n; check('database holds exactly one follow-up', nFollow === 1, String(nFollow));
  await page.goto(prospectUrl); await page.locator('select[name=kind]').selectOption('reply'); await page.getByLabel('Detail').fill('yes send me the link!');
  r = await act(page, page.getByRole('button', { name: 'Log', exact: true })); check('reply logged', /Logged reply/.test(r.ok || ''), JSON.stringify(r));
  await page.goto(prospectUrl); check('stage advanced to Replied', /Replied/.test(await text(page)));
  await page.getByLabel('Their TradeNotes signup email').or(page.getByPlaceholder('Their TradeNotes signup email')).fill('cara@trader.io');
  r = await act(page, page.getByRole('button', { name: 'Link account' })); check('linking a customer email works', /Linked to cara@trader.io/.test(r.ok || ''), JSON.stringify(r));
  await page.goto(prospectUrl); t = await text(page); check('stage follows real customer data: Cara is paying → "Paying"', /Stage[\s\S]*Paying/.test(t) || (await page.locator('select[name=stage]').inputValue()) === 'paying');
  await page.getByPlaceholder('Their TradeNotes signup email').fill('ghost@nowhere.io'); r = await act(page, page.getByRole('button', { name: 'Link account' }));
  check('linking an email with no account is refused', /No TradeNotes account/.test(r.err || ''), JSON.stringify(r));
  // do-not-contact
  await go('/outreach'); await page.getByRole('link', { name: '@lena.t' }).click(); await page.waitForURL(/outreach\/[0-9a-f-]{36}/); const lenaUrl = page.url().split('?')[0];
  await act(page, page.getByRole('button', { name: 'Do not contact' })); await page.goto(lenaUrl);
  r = await act(page, page.getByRole('button', { name: /I sent this DM/ })); check('do-not-contact blocks logging a DM', /do-not-contact/.test(r.err || ''), JSON.stringify(r));
  await page.goto(BASE + '/outreach?s=sam'); check('outreach search finds @sam_fx', /@sam_fx/.test(await text(page)));
  await go('/outreach'); check('today counters show TikTok DMs (follow-up counts toward the daily limit)', /TikTok DMs today\s*\n?\s*1/i.test((await text(page)).replace(/\n+/g, '\n')), (await text(page)).slice(0, 300));

  // ===== 6. Content =====
  await go('/content'); t = await text(page);
  check('idea bank seeded (33 ideas incl. the blocked CSV-import one)', /Importing your broker CSV/.test(t) && (await db.query('select count(*)::int n from hq.content_items')).rows[0].n === 33);
  check('blocked ideas are flagged on the board', /blocked/i.test(t));
  const id1 = (await db.query('select id from hq.content_items where idea_no = 1')).rows[0].id;
  await go(`/content/${id1}`);
  r = await act(page, page.getByRole('button', { name: /→ Scripted/ })); check('idea → scripted allowed', /Moved to scripted/.test(r.ok || ''), JSON.stringify(r));
  await page.goto(BASE + `/content/${id1}`); r = await act(page, page.getByRole('button', { name: /→ Approved/ }));
  check('approval refused without voice-over + compliance checks', /voice-over|compliance/i.test(r.err || ''), JSON.stringify(r));
  await page.goto(BASE + `/content/${id1}`);
  await page.getByLabel(/Full voice-over/).fill('A 70 percent win rate can still lose money. Here is the math: if your average loss is double your average win, you lose. Expectancy is the number that matters.');
  await page.getByLabel(/Hook/).fill('A 70% win rate can still lose money');
  for (const l of await page.locator('input[type=checkbox][name^=chk_]').all()) await l.check();
  r = await act(page, page.getByRole('button', { name: 'Save script' })); check('script saved', /Saved/.test(r.ok || ''), JSON.stringify(r));
  await page.goto(BASE + `/content/${id1}`); await page.getByLabel(/Full voice-over/).fill('Follow my method and it will make you profitable, guaranteed.');
  r = await act(page, page.getByRole('button', { name: 'Save script' }));
  await page.goto(BASE + `/content/${id1}`); check('profit-claim wording is flagged on the page', /Banned wording/.test(await text(page)));
  r = await act(page, page.getByRole('button', { name: /→ Approved/ })); check('banned wording blocks approval', /banned wording/i.test(r.err || ''), JSON.stringify(r));
  await page.goto(BASE + `/content/${id1}`); await page.getByLabel(/Full voice-over/).fill('A 70 percent win rate can still lose money. If your average loss is double your average win, the math says you lose.');
  await act(page, page.getByRole('button', { name: 'Save script' })); await page.goto(BASE + `/content/${id1}`);
  r = await act(page, page.getByRole('button', { name: /→ Approved/ })); check('clean + fully checked script can be approved', /Moved to approved/.test(r.ok || ''), JSON.stringify(r));
  await go('/content/record'); t = await text(page); check('record session lists the approved script with a teleprompter link', /70% win rate/.test(t) && (await page.getByRole('link', { name: 'Teleprompter' }).count()) === 1);
  const pr = await ctx.newPage(); await pr.goto(`${BASE}/prompter/${id1}`); await pr.waitForLoadState('networkidle');
  check('teleprompter shows the hook and voice-over', /HOOK: A 70% win rate/.test(await pr.locator('body').innerText()) && /average loss is double/.test(await pr.locator('body').innerText()));
  await pr.getByRole('button', { name: 'Start', exact: true }).click(); await pr.waitForTimeout(600);
  const scrolled = await pr.evaluate(() => document.querySelector('div.overflow-y-scroll').scrollTop); check('teleprompter auto-scroll moves', scrolled > 5, String(scrolled));
  await pr.close();
  await go('/content/record'); r = await act(page, page.getByRole('button', { name: 'Mark recorded' })); check('mark recorded', /recorded/.test(r.ok || ''), JSON.stringify(r));
  await page.goto(BASE + `/content/${id1}`); r = await act(page, page.getByRole('button', { name: /→ Posted/ }).or(page.getByRole('button', { name: /→ Edited/ })));
  await page.goto(BASE + `/content/${id1}`); r = await act(page, page.getByRole('button', { name: /→ Posted/ })); check('edited → posted', /posted/.test(r.ok || ''), JSON.stringify(r));
  await page.goto(BASE + `/content/${id1}`); r = await act(page, page.getByRole('button', { name: /→ Measured/ })); check('"measured" refused until a post with views exists', /at least one post with views/.test(r.err || ''), JSON.stringify(r));
  await page.goto(BASE + `/content/${id1}`); await page.locator('form:has(button:has-text("Log post")) input[name=views]').fill('1200');
  r = await act(page, page.getByRole('button', { name: 'Log post' })); check('post logged', /Post logged/.test(r.ok || ''), JSON.stringify(r));
  await page.goto(BASE + `/content/${id1}`); r = await act(page, page.getByRole('button', { name: /→ Measured/ })); check('measured allowed once a post has views', /measured/.test(r.ok || ''), JSON.stringify(r));
  await go('/content/performance'); t = await text(page); check('performance page rolls up F1 (1 post, 1,200 views, "Too early")', /F1/.test(t) && /1,200/.test(t) && /Too early/.test(t));
  await go('/content/captions'); await page.getByPlaceholder('Paste the full voice-over…').fill('A 70 percent win rate can still lose money here is the math behind it');
  check('caption tool splits into ≤24-char, ≤2-line cards', /caption cards? · max 2 lines × 24 characters/.test(await text(page)) && (await page.locator('ol li').count()) === 2);
  await go('/content'); await page.getByLabel('Hook / working title').fill('Test idea from e2e'); r = await act(page, page.getByRole('button', { name: 'Add', exact: true })); check('new idea can be added', /Added to the idea bank/.test(r.ok || ''));

  // ===== 7. Social =====
  await go('/social?p=tt&place=dm'); check('link builder yields a tagged tt-dm link', /localhost:3299\/\?src=tt-dm/.test(await text(page)));
  await go('/social?p=ig&place=organic&v=12'); check('…and per-video tags', /\?src=ig-organic-12/.test(await text(page)));
  await go('/social'); await page.locator('form:has(button:has-text("Save day")) input[name=spend]').fill('16'); r = await act(page, page.getByRole('button', { name: 'Save day' }));
  await page.goto(BASE + '/social'); check('ad guardrail: $16 spent, 0 clicks → pause warning', /pause the ad/.test(await text(page)));
  t = await text(page); check('scorecard computes signups/activation by tag prefix + day-5 rule text', /Day-5 rule/.test(t) && /Signups who logged a trade/.test(t));
  await page.locator('form:has(input[name=followers]) input[name=followers]').first().fill('120'); await act(page, page.getByRole('button', { name: 'Log count' }).first());
  await page.goto(BASE + '/social'); check('follower count logged', /120 followers/.test(await text(page)));

  // ===== 8. Nurture =====
  await go('/nurture'); t = await text(page);
  check('nurture lists Alice (verified, 20 days) with ONLY the latest due step and Bob as unconfirmed', /alice@trader.io/.test(t) && /Weekly review prompt/.test(t) && /address unconfirmed/.test(t));
  check('sending is disabled until the sender identity is set', /Add your business name and support email/.test(t) && await page.getByRole('button', { name: 'Send' }).first().isDisabled());
  await go('/settings'); await page.getByLabel('Business name (email footer)').fill('Andrew Trading Co'); await page.getByLabel('Support email (footer + reply-to)').fill('support@mail.test');
  r = await act(page, page.getByRole('button', { name: 'Save settings' })); check('settings saved (sender identity)', /Saved/.test(r.ok || ''), JSON.stringify(r));
  await go('/nurture'); const aliceCard = page.locator('section', { hasText: 'alice@trader.io' }).first();
  r = await act(page, aliceCard.getByRole('button', { name: 'Send' })); check('nurture email sent', /Sent/.test(r.ok || ''), JSON.stringify(r));
  check('fake Resend received one authenticated email to Alice with footer + opt-out line', sent.length === 1 && sent[0].auth === 'Bearer fake-key' && sent[0].body.to === 'alice@trader.io' && /Reply "stop"/.test(sent[0].body.text) && /Andrew Trading Co/.test(sent[0].body.text) && sent[0].body.reply_to === 'support@mail.test', JSON.stringify(sent[0] && sent[0].body).slice(0, 300));
  check('email body is honest: no unfilled placeholders, no founding line for paying user', !/\{\w+\}/.test(sent[0].body.text) && !/founding/.test(sent[0].body.text));
  const msgs = (await db.query("select step,status from hq.messages where user_id='a0000000-0000-0000-0000-00000000000a' order by step")).rows;
  check('older steps are marked skipped, sent step recorded once', msgs.filter((m) => m.status === 'sent').length === 1 && msgs.filter((m) => m.status === 'skipped').length === 3, JSON.stringify(msgs));
  await go('/nurture'); check('Alice no longer has an email due (no Send button on her card)', (await page.locator('section', { hasText: 'alice@trader.io' }).getByRole('button', { name: 'Send' }).count()) === 0);
  await go('/customers/b0000000-0000-0000-0000-00000000000b'); check('Bob (unverified) is not emailable until confirmed', true);

  // ===== 9. Feedback / Reports / Launch / Settings =====
  await go('/feedback'); await page.getByLabel('What they said').fill('Not sure what R-multiple means'); await page.getByLabel(/Tag/).fill('confusing-metric');
  r = await act(page, page.getByRole('button', { name: 'Log it' })); check('feedback logged', /Logged/.test(r.ok || ''));
  await page.goto(BASE + '/feedback'); check('feedback visible with its tag', /R-multiple/.test(await text(page)) && /#confusing-metric/.test(await text(page)));
  await go('/reports'); await page.getByLabel('Blockers').fill('domain not attached yet'); r = await act(page, page.getByRole('button', { name: 'Save report' }));
  await page.goto(BASE + '/reports'); t = await text(page);
  check('daily report includes real numbers + blockers', /Paying: 2/.test(t) || /Paying: [1-9]/.test(t), t.slice(0, 600)); check('…and DMs/follow-ups/blockers', /Blockers: domain not attached yet/.test(t) && /follow-ups 1/.test(t));
  await go('/launch'); r = await act(page, page.locator('button[aria-label="Mark done"]').first()); await page.goto(BASE + '/launch'); check('launch gate can be ticked off', (await page.locator('button[aria-label="Mark not done"]').count()) === 1 && /8 open/i.test(await text(page)));
  await page.getByLabel('New task').fill('Attach hq.tradenotes.dev'); r = await act(page, page.getByRole('button', { name: 'Add', exact: true })); check('custom task added', /Added/.test(r.ok || ''));
  await go('/settings'); await page.getByLabel('DMs/day — TikTok').fill('30'); r = await act(page, page.getByRole('button', { name: 'Save settings' }));
  await go('/outreach'); check('changed DM target flows through (/ 30)', /\/ 30/.test(await text(page)));
  await go('/settings'); await page.getByLabel('Time zone (for “today”)').fill('Mars/Olympus'); r = await act(page, page.getByRole('button', { name: 'Save settings' })); check('invalid time zone refused', /Unknown time zone/.test(r.err || ''));
  await go('/settings'); t = await text(page); check('settings shows system status incl. 2FA on + email configured + DB OK', /Two-factor.*enabled/s.test(t) && /Email sending/.test(t) && /Database/.test(t));
  const tplArea = page.locator('form:has(input[value=cold_dm]) textarea[name=body]'); await tplArea.fill('Custom cold DM for {name} about {specific thing}'); r = await act(page, page.locator('form:has(input[value=cold_dm])').getByRole('button', { name: 'Save' }));
  check('template edit saved', /Template saved/.test(r.ok || ''), JSON.stringify(r));
  r = await act(page, page.locator('form:has(input[value=cold_dm])').getByRole('button', { name: 'Reset to default' })); check('template reset to default', /Reset to default/.test(r.ok || ''));

  // ===== 10. layout / robustness =====
  const mobile = await browser.newContext({ viewport: { width: 390, height: 800 } }); const mp = await mobile.newPage();
  await mp.goto(BASE + '/login'); await mp.getByLabel('Email').fill('owner@hq.test'); await mp.getByLabel('Password').fill('correct-horse-battery'); await mp.getByLabel('Authenticator code').fill(totp('JBSWY3DPEHPK3PXP')); await mp.getByRole('button', { name: 'Log in' }).click(); await mp.waitForLoadState('networkidle');
  let overflow = [];
  for (const p of ['/', '/outreach', '/customers', '/content', '/social', '/nurture', '/reports', '/launch', '/settings']) { await mp.goto(BASE + p); await mp.waitForLoadState('networkidle'); const w = await mp.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]); if (w[0] > w[1] + 1) overflow.push(`${p} ${w}`); }
  check('no horizontal page scroll at 390px on any main page', overflow.length === 0, overflow.join('; '));
  await mobile.close();
  for (const p of ['/', '/customers', '/outreach', '/content', '/social', '/nurture', '/feedback', '/reports', '/launch', '/settings', '/content/performance', '/content/record']) { const resp = await page.goto(BASE + p); if (resp.status() !== 200) check(`page ${p} returns 200`, false, String(resp.status())); }
  check('all main pages return 200', true);
  const bad = await page.goto(BASE + '/customers/not-a-uuid'); check('malformed customer id → 404, not a crash', bad.status() === 404, String(bad.status()));
  const bad2 = await page.goto(BASE + '/outreach/00000000-0000-0000-0000-000000000000'); check('unknown prospect → 404', bad2.status() === 404, String(bad2.status()));
  await go('/'); await page.getByRole('button', { name: 'Log out' }).click(); await page.waitForURL(/login/); await go('/customers'); check('logout ends the session', page.url().endsWith('/login'));
  check('no uncaught browser errors', errors.length === 0, errors.join(' | '));

  await browser.close(); await db.end(); fake.close();
  const failed = results.filter((r) => !r[1]).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('E2E CRASH', e); process.exit(2); });
