import { LegalShell } from "@/components/LegalShell";
import { LEGAL } from "@/lib/legal";

export const metadata = { title: "Risk Disclaimer — TradeNotes" };

export default function Disclaimer() {
  return (
    <LegalShell title="Risk Disclaimer">
      <p>Trading foreign exchange, futures, stocks, options and crypto involves <strong>substantial risk of loss</strong> and is not suitable for everyone. Leverage can magnify losses as well as gains, and you can lose more than you deposit.</p>
      <ul>
        <li>{LEGAL.productName} is an educational journaling and analytics tool. It is not financial, investment, legal or tax advice, and nothing in it is a recommendation to buy or sell any instrument.</li>
        <li>Every statistic describes <em>your own past recorded trades</em>. Past performance does not guarantee future results, and a small number of trades says very little.</li>
        <li>Figures are only as accurate as the data you enter. Check them yourself before relying on them.</li>
        <li>If backtesting or simulated results are ever offered, they will be hypothetical, will not reflect real-world factors such as slippage, costs or emotions, and will not guarantee future results.</li>
        <li>You are solely responsible for your trading decisions. Consider speaking to a licensed financial adviser.</li>
      </ul>
    </LegalShell>
  );
}
