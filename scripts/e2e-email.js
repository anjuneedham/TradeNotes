// Email flows end to end with a FAKE Resend server (no real email is sent).
// Run the app with: RESEND_API_KEY=test RESEND_API_URL=http://127.0.0.1:9999/emails EMAIL_FROM="TradeNotes <noreply@example.test>" EMAIL_REPLY_TO=support@example.test
// then: BASE_URL=http://localhost:3112 node scripts/e2e-email.js
const http = require('http');
const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:3112';
const mails = [];
const mock = http.createServer((req, res) => {
  let b = ''; req.on('data', (d) => (b += d)); req.on('end', () => {
    try { mails.push({ auth: req.headers.authorization, ...JSON.parse(b) }); } catch { /* ignore */ }
    res.writeHead(200, { 'content-type': 'application/json' }); res.end('{"id":"mock"}');
  });
});
const results = [];
const check = (n, ok, x = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${ok ? '' : '  ' + x}`); };
const wait = async (cond, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await cond()) return true; await new Promise((r) => setTimeout(r, 150)); } return false; };
const linkIn = (m) => (m.text.match(/https?:\/\/\S+/) || [])[0];

mock.listen(9999, '127.0.0.1', async () => {
  const b = await chromium.launch(); const p = await (await b.newContext()).newPage();
  const email = `mail${Date.now()}@example.test`, pw1 = 'first-password-1', pw2 = 'second-password-2';
  try {
    // 1. signup -> asked to check email, confirmation mail sent
    await p.goto(BASE + '/signup'); await p.getByLabel('Email').fill(email); await p.getByLabel('Password').fill(pw1);
    await p.getByRole('button', { name: 'Create account' }).click();
    check('signup asks the user to check their email', await p.getByText('Check your email').waitFor({ timeout: 10000 }).then(() => true, () => false));
    check('confirmation email sent to the user', await wait(() => mails.some((m) => m.to === email && /Confirm/i.test(m.subject))), JSON.stringify(mails.map((m) => m.subject)));
    const m1 = mails.find((m) => m.to === email);
    check('email uses configured sender + reply-to and the API key', m1 && m1.from === 'TradeNotes <noreply@example.test>' && m1.reply_to === 'support@example.test' && m1.auth === 'Bearer test', JSON.stringify(m1 && { from: m1.from, rt: m1.reply_to, a: m1.auth }));
    // 2. cannot log in before confirming; a fresh confirmation mail is sent
    const before = mails.length;
    await p.goto(BASE + '/login'); await p.getByLabel('Email').fill(email); await p.getByLabel('Password').fill(pw1); await p.getByRole('button', { name: 'Log in' }).click();
    check('unconfirmed login is refused with a clear message', await p.getByText('confirm your email').first().waitFor({ timeout: 10000 }).then(() => true, () => false));
    check('a fresh confirmation email is sent on that attempt', await wait(() => mails.length > before));
    // 3. clicking the confirmation link signs the user in and lands on onboarding
    const link = linkIn(mails[mails.length - 1]);
    await p.goto(link);
    check('confirmation link signs in and lands on onboarding', await p.waitForURL('**/app/onboarding', { timeout: 15000 }).then(() => true, () => false), p.url());
    await p.getByRole('button', { name: 'Log out' }).click(); await p.waitForURL(BASE + '/', { timeout: 10000 });
    // 4. forgot password
    const b4 = mails.length;
    await p.goto(BASE + '/forgot-password'); await p.getByLabel('Email').fill(email); await p.getByRole('button', { name: 'Send reset link' }).click();
    check('forgot-password shows the neutral confirmation', await p.getByText('a reset link is on its way').waitFor({ timeout: 10000 }).then(() => true, () => false));
    check('reset email sent', await wait(() => mails.length > b4 && /Reset/i.test(mails[mails.length - 1].subject)));
    await p.goto(linkIn(mails[mails.length - 1]));
    check('reset link opens the new-password form (token carried)', await p.getByRole('button', { name: 'Update password' }).waitFor({ timeout: 10000 }).then(() => true, () => false), p.url());
    await p.getByLabel('New password').fill(pw2); await p.getByRole('button', { name: 'Update password' }).click();
    check('after reset the user is sent to login with a success notice', await p.getByText('Password updated').waitFor({ timeout: 10000 }).then(() => true, () => false), p.url());
    // 5. old password dead, new password works
    await p.getByLabel('Email').fill(email); await p.getByLabel('Password').fill(pw1); await p.getByRole('button', { name: 'Log in' }).click();
    check('old password no longer works', await p.getByText('Incorrect email or password').waitFor({ timeout: 10000 }).then(() => true, () => false));
    await p.getByLabel('Email').fill(email); await p.getByLabel('Password').fill(pw2); await p.getByRole('button', { name: 'Log in' }).click();
    check('new password works', await p.waitForURL('**/app**', { timeout: 15000 }).then(() => true, () => false), p.url());
    // 6. unknown address: same message, NO email sent (no account enumeration)
    const b6 = mails.length;
    await p.goto(BASE + '/forgot-password'); await p.getByLabel('Email').fill(`nobody${Date.now()}@example.test`); await p.getByRole('button', { name: 'Send reset link' }).click();
    check('unknown email gets the same neutral message', await p.getByText('a reset link is on its way').waitFor({ timeout: 10000 }).then(() => true, () => false));
    await new Promise((r) => setTimeout(r, 1500));
    check('…and no email is sent for an unknown address', mails.length === b6, String(mails.length - b6));
    // 7. an expired/invalid token is handled
    await p.goto(BASE + '/reset-password?token=not-a-real-token'); await p.getByLabel('New password').fill('whatever-123'); await p.getByRole('button', { name: 'Update password' }).click();
    check('invalid reset token shows a friendly error', await p.getByText('invalid or has expired').first().waitFor({ timeout: 10000 }).then(() => true, () => false));
  } catch (e) { console.log('CRASH', e.message); results.push(false); }
  await b.close(); mock.close();
  const f = results.filter((x) => !x).length; console.log(`\n${results.length - f}/${results.length} passed`); process.exit(f ? 1 : 0);
});
