export const metadata = { title: "Risk Disclaimer — TradeNotes" };
export default function Page() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-16 text-sm leading-relaxed">
      <h1 className="text-3xl font-semibold">Risk Disclaimer</h1>
      <p className="rounded border border-loss/50 bg-loss/10 p-3">DRAFT — pending review by qualified legal counsel before launch.</p>
      <p>Trading stocks, futures, options, forex and crypto involves substantial risk of loss and is not suitable for everyone. TradeNotes is an educational journaling and analytics tool. Statistics shown describe your past recorded trades only. Backtest results are hypothetical, do not account for all real-world factors such as slippage and emotions, and do not guarantee future results. Nothing in TradeNotes is a recommendation to buy or sell any instrument.</p>
    </div>
  );
}
