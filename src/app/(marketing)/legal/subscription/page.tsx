import { LegalShell } from "@/components/LegalShell";
import { LEGAL, show } from "@/lib/legal";
import { PLANS } from "@/lib/plans";
import { GRACE_DAYS } from "@/lib/entitlements";

export const metadata = { title: "Subscription & Cancellation Policy — TradeNotes" };

export default function SubscriptionPolicy() {
  const mail = show(LEGAL.supportEmail, "support email");
  return (
    <LegalShell title="Subscription & Cancellation Policy">
      <h2>1. Plans and prices</h2>
      <ul>
        <li><strong>{PLANS.free.name}</strong> — US$0. Up to {PLANS.free.tradeLimit} trades. No card needed.</li>
        <li><strong>{PLANS.starter.name}</strong> — US${PLANS.starter.monthly} per month. Up to {PLANS.starter.tradeLimit?.toLocaleString("en-US")} trades.</li>
        <li><strong>{PLANS.pro.name}</strong> — US${PLANS.pro.monthly} per month. Unlimited trades.</li>
      </ul>
      <p>What each plan includes today is listed on the pricing page. Features marked “in development” are not part of any plan until they are released. Prices are in US dollars; your bank may add conversion or foreign-transaction fees, and taxes may apply.</p>
      <h2>2. Billing and renewal</h2>
      <p>Payments are processed by {LEGAL.paymentProvider}. We never see or store your card number. A paid plan starts when {LEGAL.paymentProvider} confirms your first payment and <strong>renews automatically every month</strong> on the same date until you cancel.</p>
      <h2>3. Failed payments</h2>
      <p>If a renewal fails, {LEGAL.paymentProvider} retries the card and we email you. Your paid features continue until the end of the period you paid for plus {GRACE_DAYS} days. If payment still has not succeeded, your account moves to the Free plan.</p>
      <h2>4. Cancelling</h2>
      <p>Cancel at any time from <strong>Plan &amp; billing</strong> in the app, from the link in your {LEGAL.paymentProvider} receipt, or by emailing {mail}. There is no cancellation fee and no questions to answer first. Cancelling stops future charges; you keep paid features until the end of the period you have already paid for. You can resume before that date.</p>
      <h2>5. Changing plan</h2>
      <p>To move between {PLANS.starter.name} and {PLANS.pro.name}, email {mail}; we move your existing subscription so you are never billed twice. To move to Free, cancel.</p>
      <h2>6. What happens to your data on Free</h2>
      <p>Nothing is deleted when a paid plan ends. You can view, analyse and export every trade. You can add new trades while you hold fewer than {PLANS.free.tradeLimit}.</p>
      <h2>7. Refunds</h2>
      {LEGAL.refundDays > 0
        ? <p>If you are unhappy, email {mail} within <strong>{LEGAL.refundDays} days of your first payment</strong> for a full refund of that payment. Later payments are not refunded, except where the law requires.</p>
        : <p>Payments are not refundable, except where the law requires.</p>}
      <h2>8. Deleting your account</h2>
      <p>If you delete your account in Settings while subscribed, we cancel the subscription first so you are not charged again.</p>
      <h2>9. No promise of trading results</h2>
      <p>A subscription buys software for recording and reviewing your trades. It does not buy advice, signals or any trading result. See the Risk Disclaimer.</p>
    </LegalShell>
  );
}
