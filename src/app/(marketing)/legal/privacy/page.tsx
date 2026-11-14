import { pageMeta } from "@/lib/seo";
import { LegalShell } from "@/components/LegalShell";
import { LEGAL, show, isFilled } from "@/lib/legal";

export const metadata = pageMeta({ title: "Privacy Policy — TradeNotes", description: "What data TradeNotes collects, why, who processes it, how long we keep it and how to access or delete it.", path: "/legal/privacy" });

export default function Privacy() {
  const who = show(LEGAL.businessName, "business name");
  const mail = show(LEGAL.supportEmail, "support email");
  return (
    <LegalShell title="Privacy Policy">
      <p>This policy explains what personal information {LEGAL.productName} collects, why, who sees it, and your choices.</p>

      <h2>1. Who is responsible</h2>
      <p>The data controller is <strong>{who}</strong>, {LEGAL.country}{isFilled(LEGAL.address) ? `, ${LEGAL.address}` : ""}. Contact for any privacy question or request: {mail}.{isFilled(LEGAL.dpaRegistrationNumber) ? ` Registered with the Office of the Information Commissioner of Jamaica: ${LEGAL.dpaRegistrationNumber}.` : ""}</p>

      <h2>2. What we collect</h2>
      <ul>
        <li><strong>Account:</strong> your email address and a securely hashed password (we cannot read your password).</li>
        <li><strong>What you enter:</strong> trades, notes, tags, strategies, the rules (checklist items) you write for a strategy and whether you followed them on a trade, the daily, weekly or monthly reviews you write (paid plans, with a copy of your summary figures at the time you saved), the hypothetical trades you type into the backtest log (Premium; these are simulated entries, kept apart from your real trades), account names and balances, your time-zone setting, and your onboarding answers (experience, market, style, goals).</li>
        <li><strong>Files you import:</strong> broker exports you upload are read once to create your trades; we keep the trades, the file name and the import counts, not the file itself.</li>
        <li><strong>Screenshots:</strong> images you attach to trades, and to hypothetical backtest trades on Premium (paid plans). Charts can show account numbers, balances or names if they are visible on screen, so crop what you don&apos;t want stored. We remove embedded photo metadata (such as camera and location data) when you upload.</li>
        <li><strong>Share links:</strong> if you create one in Settings, we store a one-way hash of the link (never the link itself, which is shown to you once), your optional label, which results it covers, whether you chose to show money amounts, when it was created and when it expires or was revoked. Anyone who has the link can open a read-only page of <em>totals only</em>. By default that is ratios and counts (number of trades, win rate, profit factor, average R, streaks) and the shape of your equity curve, with no money amounts. Only if you tick “Show money amounts” when you create the link does it also show profit and loss, expectancy, drawdown and the scale of the curve. That page never shows your notes, instruments, strategy or account names, email address, screenshots, tags or the dates of individual trades, is not indexed by search engines, and stops working at once when you revoke it or it expires. We do not record who opens it.</li>
        <li><strong>Sign-in records:</strong> when you log in we store your IP address and browser details with the session, for security.</li>
        <li><strong>Where you came from:</strong> if you arrive through a link tagged with a source (for example from a social post), we remember that tag so we can learn which channels work.</li>
        <li><strong>Payments:</strong> handled by {LEGAL.paymentProvider}. We never see or store your card number. We receive and keep a record of each payment (amount, currency, date, status and receipt link), the plan, and {LEGAL.paymentProvider}’s customer and subscription identifiers, so we can switch paid features on and off and show your payment history.</li>
        <li><strong>Emails:</strong> messages we send you (confirmation, password reset), your replies to support, and, only if you turn it on in Settings (paid plans), one short weekly reminder to write your review. That reminder contains a link and no trading figures, and has an unsubscribe link. We keep a record that it was sent and when.</li>
      </ul>

      <h2>3. Why we use it</h2>
      <ul>
        <li>To provide the service: your journal, statistics and account.</li>
        <li>To keep it secure and prevent abuse.</li>
        <li>To manage subscriptions and respond to support requests.</li>
        <li>To understand which channels bring users and improve the product.</li>
        <li>To meet legal obligations.</li>
      </ul>
      <p>We do not sell your personal information, and we do not use it for advertising profiles.</p>

      <h2>4. Who we share it with</h2>
      <p>Only service providers that help us run {LEGAL.productName}, under their own security and privacy terms:</p>
      <ul>
        <li><strong>Supabase</strong> — database hosting and private file storage for screenshots (United States). Screenshots are kept in a private bucket and shown to you only through short-lived links that expire within minutes.</li>
        <li><strong>Vercel</strong> — website hosting and server logs (United States).</li>
        <li><strong>Resend</strong> — sending our account emails.</li>
        <li><strong>{LEGAL.paymentProvider}</strong> — payments.</li>
      </ul>
      <p>Your data is therefore processed outside {LEGAL.country}, mainly in the United States. We may also disclose information where the law requires.</p>

      <h2>5. Cookies</h2>
      <ul>
        <li><code>better-auth.session_token</code> — keeps you logged in (essential; expires after about 30 days).</li>
        <li><code>tn_src</code> — remembers the source tag of the link you came from (30 days).</li>
        <li><code>tn_ref</code> — remembers which partner&apos;s link you came from, so they can be credited if you subscribe (30 days; only set when a partner link is used).</li>
        <li><code>tn_theme</code> — remembers a light or dark appearance if you choose one in Settings (1 year; not set unless you choose).</li>
        <li><code>tn_acct</code> — remembers which of your trading accounts you are viewing (1 year; only set when you switch accounts).</li>
      </ul>
      <p>We do not use advertising cookies. To count visits and see which pages are used, we use Vercel Web Analytics, which sets no cookies and does not track you across other sites; it records page views with coarse, anonymised device and country information.</p>

      <h2>6. How long we keep it</h2>
      <p>While your account is open. You can delete your account yourself at any time in Settings → Your data; this immediately removes your profile, trades, hypothetical backtest trades, notes, reviews, playbook rules and checklist answers, screenshots, share links (which stop working), subscription record and payment history. Deleting a trade, a hypothetical trade or a trading account also deletes its screenshots. If you ask us by email instead, we will do it within {LEGAL.deletionDays} days. Copies in provider backups expire on the provider’s normal schedule. {LEGAL.paymentProvider} keeps its own payment records as the law requires.</p>

      <h2>7. Your rights</h2>
      <p>You can download your trades yourself (Settings → Your data → Download my trades; reviews, playbook rules and screenshots are not in that file; hypothetical backtest trades have their own labelled export on the Backtests page; you can read your reviews and rules on their pages and open and save each screenshot from its trade), correct any trade by editing it, and delete your account yourself. You can also ask us to give you a copy of your data, correct it, delete it, or stop using it for a purpose. Email {mail} from the address on your account; we may ask you to verify your identity. If you are unhappy with our response you can complain to the data-protection authority where you live — in Jamaica, the Office of the Information Commissioner.</p>

      <h2>8. Security</h2>
      <p>We use encrypted connections, hashed passwords, rate limiting on sign-in, and database-level rules so each user can only reach their own records. No system is perfectly secure. If a breach affects you we will tell you and the authorities where the law requires.</p>

      <h2>9. Children</h2>
      <p>{LEGAL.productName} is for people aged 18 and over. We do not knowingly collect information from children.</p>

      <h2>10. Changes</h2>
      <p>We will post updates here with a new effective date and tell you about material changes by email.</p>
    </LegalShell>
  );
}
