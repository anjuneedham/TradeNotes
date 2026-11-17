import { pageMeta } from "@/lib/seo";
import { LegalShell } from "@/components/LegalShell";
import { TRIAL_DAYS } from "@/lib/plans";
import { LEGAL, show } from "@/lib/legal";

export const metadata = pageMeta({ title: "Terms of Service — TradeNotes", description: "The terms for using TradeNotes: accounts, subscriptions, refunds, acceptable use and liability.", path: "/legal/terms" });

export default function Terms() {
  const who = show(LEGAL.businessName, "business name");
  const mail = show(LEGAL.supportEmail, "support email");
  return (
    <LegalShell title="Terms of Service">
      <p>These terms are an agreement between you and <strong>{who}</strong> (“we”, “us”), which operates {LEGAL.productName}. By creating an account or using {LEGAL.productName} you agree to them. Contact: {mail}.</p>

      <h2>1. What {LEGAL.productName} is — and is not</h2>
      <p>{LEGAL.productName} is software for recording and analysing your own trades. It is <strong>not</strong> a broker, an adviser or an investment service. We do not give financial, investment, legal or tax advice, we do not provide trading signals, and nothing in the product is a recommendation to buy or sell anything. Statistics describe your own past recorded trades only and do not predict future results. See the <a href="/legal/disclaimer" className="underline">Risk Disclaimer</a>.</p>

      <h2>2. Early access and features in development</h2>
      <p>{LEGAL.productName} is in early access. Features our site describes as “in development” or “coming soon” are not available, have no promised date, and may change or never be released. We may add, change or remove features.</p>

      <h2>3. Your account</h2>
      <ul>
        <li>You must be at least 18 years old.</li>
        <li>Give accurate information and keep your password secure. You are responsible for activity on your account.</li>
        <li>One person per account. Do not share logins.</li>
      </ul>

      <h2>4. Your data</h2>
      <p>You own the data you enter. You give us permission to store and process it only to provide the service to you. We do not sell your data. You are responsible for the accuracy of what you enter; results are only as good as your records. You can download your trades and delete your account yourself at any time in Settings, or ask us to (see our <a href="/legal/privacy" className="underline">Privacy Policy</a>).</p>

      <h2>5. Plans, billing and renewal</h2>
      <ul>
        <li>There is a Free plan and paid monthly plans, priced in US dollars as shown on the pricing page. Taxes may apply.</li>
        <li>Paid plans are billed through {LEGAL.paymentProvider} and <strong>renew automatically each month until cancelled</strong>. We do not store your card details.</li>
        <li>Paid features are switched on automatically once {LEGAL.paymentProvider} confirms your payment, usually within minutes. If automatic confirmation is ever unavailable, we switch them on by hand, aiming for one business day. If a renewal payment fails, paid features continue for a short grace period (currently 3 days after the paid period ends) while the payment is retried; after that your account moves to the Free plan. Your data is not deleted.</li>
        <li>If a payment fails or a subscription ends, your account returns to the Free plan. Your data is kept, but Free plan limits apply.</li>
        <li>We may change prices with advance notice; the new price applies from your next renewal.</li>
      </ul>

      <h2>6. Cancellation and refunds</h2>
      <p>Paid plans start with a {TRIAL_DAYS}-day free trial. You authorise {LEGAL.paymentProvider} to charge your card when the trial ends; cancel before then and you are not charged. The founding-member price has no trial. You can cancel at any time from Plan &amp; billing in the app, using the link in your {LEGAL.paymentProvider} receipt, or by emailing {mail}. Cancellation stops future charges; access to paid features continues until the end of the period you have paid for.</p>
      {LEGAL.refundDays > 0
        ? <p>If you are unhappy, email us within <strong>{LEGAL.refundDays} days of your first payment</strong> (taken when your trial ends) for a full refund of that payment. After that, payments are not refunded except where the law requires.</p>
        : <p>Payments are not refundable except where the law requires.</p>}

      <h2>7. Acceptable use</h2>
      <p>Do not use {LEGAL.productName} unlawfully, attempt to access other people’s data, disrupt or overload the service, scrape it, resell it, or reverse-engineer it. We may suspend accounts that do.</p>

      <h2>8. Availability</h2>
      <p>We work to keep {LEGAL.productName} available but do not guarantee uninterrupted or error-free service. Keep your own copy of anything important.</p>

      <h2>9. Disclaimers and liability</h2>
      <p>The service is provided “as is”. We are not responsible for trading decisions, trading losses, or reliance on any statistic shown. To the extent the law allows, our total liability to you for any claim is limited to the amount you paid us in the 12 months before the claim, and we are not liable for indirect or consequential loss. Nothing in these terms limits liability that cannot be limited by law.</p>

      <h2>10. Ending the agreement</h2>
      <p>You may stop using {LEGAL.productName} and delete your account (in Settings, or by asking us) at any time. We may suspend or end your access if you break these terms. Sections that by their nature should continue (for example 9 and 11) survive.</p>

      <h2>11. Governing law</h2>
      <p>These terms are governed by {LEGAL.governingLaw}.</p>

      <h2>12. Changes</h2>
      <p>We may update these terms. We will post the new version here with a new effective date and, for material changes, tell you by email. Continuing to use {LEGAL.productName} after a change means you accept it.</p>
    </LegalShell>
  );
}
