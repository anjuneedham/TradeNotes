import Link from "next/link";
import { pageMeta, jsonLd, SITE_URL } from "@/lib/seo";
import RMultipleCalculator from "@/components/RMultipleCalculator";
import LeadForm from "@/components/LeadForm";
import { Eyebrow, linkCls } from "@/components/ui";

const PATH = "/learn/r-multiple-prop-firm-challenge";
const TITLE = "R-Multiple Explained: The Number That Decides Your Prop Firm Challenge (Free Calculator)";
const DESC = "What R-multiple means in trading, how to calculate it, and how to use it to plan a prop firm challenge: target, max loss and daily loss limit in R. Free R-multiple calculator included.";
const PUBLISHED = "2026-11-15";

export const metadata = pageMeta({ title: `${TITLE} — TradeNotes`, description: DESC, path: PATH });

const FAQ: [string, string][] = [
  ["What is R-multiple in trading?", "R-multiple is a trade's result divided by the amount you planned to risk on it (1R). If you risk $200 and make $500, the trade was +2.5R. If you lose $200, it was −1R."],
  ["How do you calculate R-multiple?", "Initial risk (1R) = |entry − stop loss| × position size. R-multiple = net profit or loss ÷ initial risk. Without a stop loss there is no defined risk, so there is no R-multiple."],
  ["What is a good R-multiple?", "No single trade's R matters much. What matters is your average R over many trades (expectancy in R). Above 0 means you made money per unit of risk. Many traders aim for losses close to −1R and an average winner of +1.5R or more, but a high win rate with smaller winners can also work."],
  ["How many R do I need to pass a prop firm challenge?", "Divide the profit target by your risk per trade. A 10% target with 0.5% risk per trade is 20R. A 10% max loss at the same risk is 10 full losses in a row."],
  ["Is risking 1% per trade too much on a prop firm challenge?", "It depends on the loss limits. With a 5% daily limit, 1% risk means 5 losses end your day. With 0.5% it takes 10. Smaller risk makes the target take more trades but makes the account much harder to fail on a bad streak."],
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
      <Eyebrow>Learn · Risk</Eyebrow>
      <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">R-multiple explained: the number that decides your prop firm challenge</h1>
      <p className="mt-3 text-sm text-muted">By the TradeNotes team · Published {PUBLISHED} · 7 minute read</p>

      <p className={P}><strong>R-multiple is a trade&apos;s result measured in units of what you risked.</strong> Risk $200, make $500: that trade was <span className="fig">+2.5R</span>. Lose the $200: <span className="fig">−1R</span>. That&apos;s the whole idea. It sounds simple, but it changes how you see your trading, and it&apos;s the fastest way to work out whether a prop firm challenge is realistic for you before you pay for one.</p>

      <h2 className={H2}>How to calculate R-multiple</h2>
      <p className={P}>Two steps:</p>
      <p className="fig mt-3 overflow-x-auto rounded-md border border-border bg-panel px-4 py-3 text-sm">1R (initial risk) = |entry − stop loss| × position size<br />R-multiple = net profit or loss ÷ 1R</p>
      <p className={P}><strong>Forex example:</strong> long EURUSD at 1.0850, stop at 1.0820 (30 pips), 1 standard lot (about $10 a pip). 1R = 30 × $10 = $300. You exit at 1.0910 for +60 pips, which is $600, or $593 after $7 of fees. R-multiple = 593 ÷ 300 = <span className="fig">+1.98R</span>.</p>
      <p className={P}><strong>Futures example:</strong> short 1 NQ at 21,050, stop at 21,070 (20 points × $20 = $400 risk). You move your stop, get stopped at 21,070 anyway, and pay $4 in fees. Result: −$404 = <span className="fig">−1.01R</span>.</p>
      <p className={P}>No stop loss means no defined risk, and so no R-multiple. That&apos;s one more reason to always set one.</p>

      <h2 className={H2}>Free R-multiple calculator</h2>
      <p className={P}>Try your own numbers. The second calculator turns your prop firm challenge rules into R, which is the part most traders never do.</p>
      <div className="mt-6"><RMultipleCalculator /></div>

      <h2 className={H2}>Why R beats dollars (and percentages)</h2>
      <ul className="mt-4 list-disc space-y-2 pl-5 leading-relaxed">
        <li><strong>It compares trades fairly.</strong> A $600 win on a $300 risk (+2R) and a $600 win on a $1,200 risk (+0.5R) look the same in dollars. In R, one is four times better.</li>
        <li><strong>It survives account changes.</strong> Move from a $10k account to a $100k challenge and your dollar history stops making sense. Your R history doesn&apos;t change.</li>
        <li><strong>It exposes risk mistakes.</strong> A loss of −2.4R means you moved your stop, sized too big, or slipped badly. Dollars hide that. R makes it obvious.</li>
        <li><strong>It leads to expectancy.</strong> Your average R over many trades is your <em>expectancy in R</em>, the clearest single sign of whether your process has an edge. <Link href="/learn#expectancy" className={linkCls}>More on expectancy</Link>.</li>
      </ul>

      <h2 className={H2}>Your prop firm challenge, measured in R</h2>
      <p className={P}>Here&apos;s the maths that should shape how you trade a challenge. Take a typical two-step evaluation with a <strong>10% profit target, 10% max loss and 5% daily loss limit</strong>. Rules differ between firms, so use your own firm&apos;s numbers in the calculator above.</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[30rem] text-left text-sm">
          <thead className="border-b border-border text-muted"><tr><th className="py-2 pr-4 font-medium">Risk per trade</th><th className="py-2 pr-4 font-medium">Target</th><th className="py-2 pr-4 font-medium">Max loss</th><th className="py-2 font-medium">Daily limit</th></tr></thead>
          <tbody className="fig divide-y divide-border">
            <tr><td className="py-2 pr-4">2%</td><td className="py-2 pr-4">5R</td><td className="py-2 pr-4">5 losses</td><td className="py-2">2.5 losses</td></tr>
            <tr><td className="py-2 pr-4">1%</td><td className="py-2 pr-4">10R</td><td className="py-2 pr-4">10 losses</td><td className="py-2">5 losses</td></tr>
            <tr><td className="py-2 pr-4">0.5%</td><td className="py-2 pr-4">20R</td><td className="py-2 pr-4">20 losses</td><td className="py-2">10 losses</td></tr>
          </tbody>
        </table>
      </div>
      <p className={P}>Now add your <strong>expectancy in R</strong>. If your last 50 trades average +0.25R, then:</p>
      <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
        <li>At 1% risk, a 10R target takes about <span className="fig">10 ÷ 0.25 = 40 trades</span> on average.</li>
        <li>At 0.5% risk, a 20R target takes about <span className="fig">80 trades</span>, but it takes 20 straight losses to fail on max loss instead of 10.</li>
        <li>At 2% risk you&apos;d need only about 20 trades, but just 5 losses in a row, which happens to most strategies regularly, ends the challenge.</li>
      </ul>
      <p className={P}>The lesson: <strong>raising risk to pass faster mostly makes it more likely to fail.</strong> And if your expectancy in R is zero or negative, no risk setting will pass reliably. Fix that first, on a demo or a small account, before you pay for another evaluation.</p>
      <p className={P}>These are averages, not promises. Real results come in streaks, so a strategy with positive expectancy can still fail a challenge on a bad run. Treat this as planning, not a forecast.</p>

      <h2 className={H2}>How to start tracking R today</h2>
      <ol className="mt-4 list-decimal space-y-2 pl-5 leading-relaxed">
        <li>Before every trade, write down the entry, stop and size. That fixes your 1R.</li>
        <li>After the trade, record the net result and divide by 1R.</li>
        <li>Tag any rule you broke: moved stop, oversized, revenge trade.</li>
        <li>Every 30 trades, add up your total R and your R by setup. Find the setup to keep and the mistake that cost the most.</li>
      </ol>
      <p className={P}>A spreadsheet works. Our free template below has the R column built in. Or <Link href="/signup?src=article-rmultiple" className={linkCls}>let TradeNotes do it</Link>: enter your stop and it calculates R, expectancy, R by setup and your costliest mistake for you, free for 30 trades. <Link href="/demo" className={linkCls}>See it with sample data</Link>.</p>

      <div className="mt-10"><LeadForm title="Free: trading journal template with R-multiple column" /></div>

      <h2 className={H2}>FAQ</h2>
      <div className="mt-4 divide-y divide-border border-y border-border">
        {FAQ.map(([q, a]) => (<section key={q} className="py-5"><h3 className="font-semibold">{q}</h3><p className="mt-2 text-sm leading-relaxed text-muted">{a}</p></section>))}
      </div>
      <p className="mt-10 text-xs text-muted">Educational content only, not financial advice. Prop firm rules vary and change. Check your firm&apos;s current rules. Trading involves substantial risk of loss, and most traders lose money.</p>
    </article>
  );
}
