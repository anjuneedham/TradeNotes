import { pageMeta, jsonLd } from "@/lib/seo";
import { FunnelPage, H2 } from "@/components/Funnel";
import { OFFER } from "@/lib/marketing";
import { PLANS } from "@/lib/plans";

export const metadata = pageMeta({ title: "How TradeNotes works & FAQ", description: "How the TradeNotes trading journal works in three steps, plus answers on pricing, import, data and what is not built yet.", path: "/how-it-works" });

const FAQ: [string, string][] = [
  ["Is there a free plan?", `${OFFER.free} Manual entry, the dashboard, analytics and share links are included.`],
  ["What do paid plans cost?", `${OFFER.paid} ${OFFER.founding}`],
  ["Does it connect to my broker or prop firm?", "No. There is no automatic sync. On paid plans you upload an export file from your platform; on Free you log trades by hand or with the mobile quick-log."],
  ["Which platforms can I import from?", "MetaTrader 4/5, cTrader, TradingView (paper trading), Tradovate, NinjaTrader, Thinkorswim, Interactive Brokers, Webull, Binance and Bybit, or any CSV you map yourself. The formats were built from sample files; please report anything that does not import cleanly."],
  ["Will it help me pass a prop firm challenge?", "It cannot promise that. It shows what you actually did, in R, and which habits cost you, so you can decide what to change."],
  ["Can I get my data out?", "Yes. Export all your trades as CSV at any time."],
  ["Is this financial advice?", "No. TradeNotes is a journaling and analytics tool. It does not provide financial advice."],
];

export default function HowItWorks() {
  return (
    <FunnelPage eyebrow="How it works" title="How TradeNotes works" intro="Three steps, about a minute per trade." src="how-it-works"
      next={[{ href: "/features", label: "All features" }, { href: "/prop-firm-traders", label: "For prop-firm traders" }, { href: "/changelog", label: "Changelog" }]}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) }) }} />
      <ol className="list-decimal space-y-2 pl-5">
        <li><strong>Log or import.</strong> Enter a trade by hand, use the quick-log on your phone, or upload a broker export ({PLANS.starter.name} and {PLANS.pro.name}).</li>
        <li><strong>Tag it.</strong> Setup, notes, emotion and mistakes.</li>
        <li><strong>Read the pattern.</strong> Results by setup, session, instrument, weekday, mistake and emotion, in money and R.</li>
      </ol>
      <h2 className={H2}>FAQ</h2>
      <dl className="mt-4 divide-y divide-border border-y border-border">
        {FAQ.map(([q, a]) => <div key={q} className="py-4"><dt className="font-medium">{q}</dt><dd className="mt-1 text-sm text-muted">{a}</dd></div>)}
      </dl>
    </FunnelPage>
  );
}
