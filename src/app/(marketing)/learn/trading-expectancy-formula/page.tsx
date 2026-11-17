import Link from "next/link";
import { pageMeta, jsonLd, SITE_URL } from "@/lib/seo";
import ExpectancyCalculator from "@/components/ExpectancyCalculator";
import LeadForm from "@/components/LeadForm";
import { Eyebrow, linkCls } from "@/components/ui";

const PATH = "/learn/trading-expectancy-formula";
const TITLE = "Trading Expectancy Formula: Is Your Strategy Actually Profitable? (Free Calculator)";
const DESC = "The trading expectancy formula explained with worked examples: win rate, average win and loss in R, costs, break-even win rate and how many trades you need. Free expectancy calculator.";
const PUBLISHED = "2026-11-16";

export const metadata = pageMeta({ title: `${TITLE} — TradeNotes`, description: DESC, path: PATH });

const FAQ: [string, string][] = [
  ["What is the trading expectancy formula?", "Expectancy = (win rate × average win) − (loss rate × average loss). Measured in R, it is the average result of one trade in units of risk. Example: 40% wins at +2R and 60% losses at −1R gives 0.4 × 2 − 0.6 × 1 = +0.20R per trade."],
  ["What is a good expectancy for a trading strategy?", "Anything clearly above zero after costs is positive. There is no magic number: +0.1R to +0.3R after costs is common for real strategies. What matters more is that it holds across a large sample of trades and that you follow the same rules each time."],
  ["How many trades do I need to trust my expectancy?", "More than most people think. With fewer than about 30 trades the number is mostly noise. 100 or more trades of the same setup, taken under the same rules, gives a far steadier picture. Even then it describes the past, not a promise about the future."],
  ["Should expectancy include fees and slippage?", "Yes. Costs are paid on every trade, win or lose, so they come straight off expectancy. A strategy at +0.05R before costs is negative after a 0.08R spread and commission. Track net results, not gross."],
  ["Can a strategy with a low win rate have positive expectancy?", "Yes. A 30% win rate with an average win of 3R and an average loss of 1R gives 0.3 × 3 − 0.7 × 1 = +0.20R. A high win rate does not guarantee profit either: 70% wins at +0.3R against 1R losses is −0.09R."],
];

const LD = [
  { "@context": "https://schema.org", "@type": "Article", headline: TITLE, description: DESC, datePublished: PUBLISHED, dateModified: PUBLISHED, author: { "@type": "Organization", name: "TradeNotes", url: SITE_URL }, publisher: { "@type": "Organization", name: "TradeNotes", url: SITE_URL }, mainEntityOfPage: `${SITE_URL}${PATH}`, image: `${SITE_URL}/og` },
  { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
];

const H2 = "mt-12 text-2xl font-semibold tracking-tight";
const P = "mt-4 leading-relaxed";

export default function Article() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(LD) }} />
      <Eyebrow>Learn · Metrics</Eyebrow>
      <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Trading expectancy formula: is your strategy actually profitable?</h1>
      <p className="mt-3 text-sm text-muted">By the TradeNotes team · Published {PUBLISHED} · 7 minute read</p>

      <p className={P}><strong>Expectancy is the average amount you make or lose per trade.</strong> It answers the question a win rate can&apos;t: if I take this same trade again and again, do I come out ahead? Measured in <Link href="/learn/r-multiple-prop-firm-challenge" className={linkCls}>R-multiples</Link>, it tells you your edge in one number, and it&apos;s the first thing to check before you risk more money or pay for a prop firm challenge.</p>

      <h2 className={H2}>The expectancy formula</h2>
      <p className="fig mt-4 overflow-x-auto rounded-md border border-border bg-panel px-4 py-3 text-sm">Expectancy (R) = (win rate × average win in R) − (loss rate × average loss in R)<br />Expectancy after costs = expectancy − average costs per trade (in R)</p>
      <p className={P}>Loss rate is simply 1 − win rate. Use the <em>average</em> win and loss from your own trades, and use net results, so fees, spread and slippage are already inside them (or subtract them as shown).</p>
      <p className={P}><strong>Worked example.</strong> You win 40% of trades. Winners average <span className="fig">+2R</span>, losers average <span className="fig">−1R</span>:</p>
      <p className="fig mt-3 overflow-x-auto rounded-md border border-border bg-panel px-4 py-3 text-sm">0.40 × 2 − 0.60 × 1 = 0.80 − 0.60 = +0.20R per trade</p>
      <p className={P}>Over 100 trades that averages about +20R. If you risk $100 a trade (1R), that is about $2,000 before the ups and downs of real streaks. Now say costs average <span className="fig">0.05R</span> a trade: expectancy after costs is <span className="fig">+0.15R</span>, a quarter smaller. Costs matter most for strategies with a thin edge.</p>

      <h2 className={H2}>Free expectancy calculator</h2>
      <p className={P}>Enter your win rate, average win and loss in R, and your costs. It shows expectancy before and after costs, the win rate you need to break even, and roughly how many trades it takes to reach a target in R.</p>
      <div className="mt-6"><ExpectancyCalculator /></div>

      <h2 className={H2}>Three strategies, same win rate story, very different results</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[30rem] text-left text-sm">
          <thead className="border-b border-border text-muted"><tr><th className="py-2 pr-4 font-medium">Win rate</th><th className="py-2 pr-4 font-medium">Avg win</th><th className="py-2 pr-4 font-medium">Avg loss</th><th className="py-2 font-medium">Expectancy</th></tr></thead>
          <tbody className="fig divide-y divide-border">
            <tr><td className="py-2 pr-4">70%</td><td className="py-2 pr-4">+0.3R</td><td className="py-2 pr-4">−1R</td><td className="py-2">−0.09R</td></tr>
            <tr><td className="py-2 pr-4">50%</td><td className="py-2 pr-4">+1.2R</td><td className="py-2 pr-4">−1R</td><td className="py-2">+0.10R</td></tr>
            <tr><td className="py-2 pr-4">30%</td><td className="py-2 pr-4">+3R</td><td className="py-2 pr-4">−1R</td><td className="py-2">+0.20R</td></tr>
          </tbody>
        </table>
      </div>
      <p className={P}>The 70% strategy feels great and loses money. The 30% strategy feels bad and makes money. This is why win rate alone misleads, and why you should read it next to average win and loss.</p>

      <h2 className={H2}>Break-even win rate</h2>
      <p className="fig mt-4 overflow-x-auto rounded-md border border-border bg-panel px-4 py-3 text-sm">Break-even win rate = (average loss + costs) ÷ (average win + average loss)</p>
      <p className={P}>With +2R winners, −1R losers and no costs, you break even at 1 ÷ 3 = <span className="fig">33.3%</span>. Add 0.05R of costs and it rises to 1.05 ÷ 3 = <span className="fig">35%</span>. If your real win rate is 34%, costs are the difference between profit and loss.</p>

      <h2 className={H2}>How many trades before you can trust it</h2>
      <p className={P}>Expectancy from 15 trades is mostly luck. A strategy with a true edge of +0.2R still has losing stretches of 8 or 10 trades in a row. As a rough guide, treat anything under 30 trades as a hint, aim for 100 or more of the same setup before you size up, and recheck it regularly because markets change. The calculator&apos;s trades-to-target figure is an average: at +0.15R per trade, reaching +10R takes about 67 trades, but it could take far more or fewer.</p>

      <h2 className={H2}>Using expectancy with a prop firm challenge</h2>
      <p className={P}>Divide the challenge target in R by your expectancy to estimate trades needed, then check the loss limits in R. Our <Link href="/learn/r-multiple-prop-firm-challenge" className={linkCls}>R-multiple guide and challenge calculator</Link> does the second half. If your expectancy after costs is zero or negative, no risk setting will fix it. Improve the strategy on demo or a small account first.</p>

      <h2 className={H2}>How to track expectancy automatically</h2>
      <ol className="mt-4 list-decimal space-y-2 pl-5 leading-relaxed">
        <li>Record every trade with its stop, so each one has an R-multiple.</li>
        <li>Include fees and slippage in the net result.</li>
        <li>Split by setup. Overall expectancy can hide one good setup carrying a bad one.</li>
        <li>Recalculate every 30 trades and note what changed.</li>
      </ol>
      <p className={P}>A spreadsheet works. Or <Link href="/signup?src=article-expectancy" className={linkCls}>let TradeNotes do it</Link>: log trades with a stop and it calculates expectancy in R, win rate, average win and loss and R by setup for you, free for 30 trades. <Link href="/demo" className={linkCls}>See it with sample data</Link>, or read the short <Link href="/learn#expectancy" className={linkCls}>expectancy definition</Link>.</p>

      <div className="mt-10"><LeadForm title="Free: trading journal template with R-multiple column" /></div>

      <h2 className={H2}>FAQ</h2>
      <div className="mt-4 divide-y divide-border border-y border-border">
        {FAQ.map(([q, a]) => (<section key={q} className="py-5"><h3 className="font-semibold">{q}</h3><p className="mt-2 text-sm leading-relaxed text-muted">{a}</p></section>))}
      </div>
      <p className="mt-10 text-xs text-muted">Educational content only, not financial advice. Examples use made-up numbers and are not predictions. Past results do not guarantee future results. Trading involves substantial risk of loss, and most traders lose money.</p>
    </article>
  );
}
