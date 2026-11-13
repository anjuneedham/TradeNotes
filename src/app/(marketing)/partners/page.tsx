import { LegalShell } from "@/components/LegalShell";
import { LEGAL, isFilled } from "@/lib/legal";
import { AFFILIATE } from "@/lib/affiliate";
import { pageMeta } from "@/lib/seo";
import { PLANS } from "@/lib/plans";

export const metadata = pageMeta({ title: "Partner program — TradeNotes", description: "Earn recurring commission by recommending TradeNotes to your trading community. 30% of what each referred customer pays for 12 months.", path: "/partners" });

const usd = (c: number) => `$${(c / 100).toFixed(2).replace(/\.00$/, "")}`;

export default function Partners() {
  const mail = isFilled(LEGAL.supportEmail) ? LEGAL.supportEmail : "[support email — not set yet]";
  const s = PLANS.starter.monthly * 100, p = PLANS.pro.monthly * 100;
  return (
    <LegalShell title="Partner program">
      <p>If you run a trading group, community or channel, you can earn <strong>{AFFILIATE.defaultPct}% of what each customer you refer pays us, for their first {AFFILIATE.months} months</strong>. Nothing to buy, no minimum audience size.</p>

      <h2>What you earn</h2>
      <ul>
        <li>{PLANS.starter.name} at {usd(s)}/month pays you {usd(Math.round(s * AFFILIATE.defaultPct / 100))}/month; {PLANS.pro.name} at {usd(p)}/month pays you {usd(Math.round(p * AFFILIATE.defaultPct / 100))}/month. Annual plans pay {AFFILIATE.defaultPct}% of the annual payment, once.</li>
        <li>Commission is calculated on money we actually receive (after any discount), not on list price.</li>
        <li>Each commission becomes payable {AFFILIATE.holdDays} days after the customer pays, so refunds can clear. Refunded payments earn nothing.</li>
        <li>Paid monthly once your balance reaches {usd(AFFILIATE.minPayoutCents)}; smaller balances roll over. We pay by the method you give us (for example PayPal or bank transfer) and you cover any fees on your side.</li>
      </ul>

      <h2>How it works</h2>
      <ul>
        <li>Email {mail} with your name, your group or channel, and its size. We create your personal link, <code>?ref=yourcode</code>, and a private page where you can see sign-ups, paying customers and what you have earned.</li>
        <li>People who click your link and create an account within {AFFILIATE.cookieDays} days are credited to you. If someone clicks two partners&apos; links, the most recent one counts. You cannot refer yourself.</li>
        <li>The free plan is free to share; you only earn when a referred customer pays.</li>
      </ul>

      <h2>Rules</h2>
      <ul>
        <li>Say you are a paid partner whenever you recommend TradeNotes (for example, &ldquo;affiliate link&rdquo;).</li>
        <li>Describe TradeNotes truthfully. Do not promise profits, income or trading results, and do not say features exist that are marked &ldquo;in development&rdquo;.</li>
        <li>No spam, no fake reviews, no paid ads on the TradeNotes name, and no incentives that pretend to be from us.</li>
        <li>We can pause or end a partnership, and cancel commissions earned through breaking these rules. Already-paid commission on a payment that is later refunded may be deducted from your next payout.</li>
        <li>You are responsible for your own taxes. This program is not a job, employment or partnership.</li>
      </ul>
      <p className="text-xs text-muted">Terms are written in plain English. We may change them with notice by email.</p>
    </LegalShell>
  );
}
