import { LegalShell } from "@/components/LegalShell";
import { LEGAL, show, isFilled } from "@/lib/legal";

export const metadata = { title: "Privacy Policy — TradeNotes" };

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
        <li><strong>What you enter:</strong> trades, notes, tags, strategies, account names and balances, and your onboarding answers (experience, market, style, goals).</li>
        <li><strong>Sign-in records:</strong> when you log in we store your IP address and browser details with the session, for security.</li>
        <li><strong>Where you came from:</strong> if you arrive through a link tagged with a source (for example from a social post), we remember that tag so we can learn which channels work.</li>
        <li><strong>Payments:</strong> handled by {LEGAL.paymentProvider}. We never see or store your card number. We see that a payment was made, the payer’s email and the plan.</li>
        <li><strong>Emails:</strong> messages we send you (confirmation, password reset) and your replies to support.</li>
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
        <li><strong>Supabase</strong> — database hosting (United States).</li>
        <li><strong>Vercel</strong> — website hosting and server logs (United States).</li>
        <li><strong>Resend</strong> — sending our account emails.</li>
        <li><strong>{LEGAL.paymentProvider}</strong> — payments.</li>
      </ul>
      <p>Your data is therefore processed outside {LEGAL.country}, mainly in the United States. We may also disclose information where the law requires.</p>

      <h2>5. Cookies</h2>
      <ul>
        <li><code>better-auth.session_token</code> — keeps you logged in (essential; expires after about 30 days).</li>
        <li><code>tn_src</code> — remembers the source tag of the link you came from (30 days).</li>
      </ul>
      <p>We do not use advertising or third-party analytics cookies.</p>

      <h2>6. How long we keep it</h2>
      <p>While your account is open. If you ask us to delete your account we will do so within {LEGAL.deletionDays} days, which removes your trades and profile. Copies in provider backups expire on the provider’s normal schedule. We may keep basic payment records as the law requires.</p>

      <h2>7. Your rights</h2>
      <p>You can ask us to give you a copy of your data, correct it, delete it, or stop using it for a purpose. Email {mail} from the address on your account; we may ask you to verify your identity. If you are unhappy with our response you can complain to the data-protection authority where you live — in Jamaica, the Office of the Information Commissioner.</p>

      <h2>8. Security</h2>
      <p>We use encrypted connections, hashed passwords, rate limiting on sign-in, and database-level rules so each user can only reach their own records. No system is perfectly secure. If a breach affects you we will tell you and the authorities where the law requires.</p>

      <h2>9. Children</h2>
      <p>{LEGAL.productName} is for people aged 18 and over. We do not knowingly collect information from children.</p>

      <h2>10. Changes</h2>
      <p>We will post updates here with a new effective date and tell you about material changes by email.</p>
    </LegalShell>
  );
}
