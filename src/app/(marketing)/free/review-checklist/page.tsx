import { JamesNote } from "@/components/JamesNote";
import Link from "next/link";
import { pageMeta } from "@/lib/seo";
import { Eyebrow, linkCls } from "@/components/ui";

export const metadata = pageMeta({
  title: "30-trade review checklist for traders (free, printable) — TradeNotes",
  description: "A free, printable checklist to review your last 30 trades: R-multiple, expectancy, rule breaks, costliest mistake, best setup and one change for the next 30. Works for prop firm challenges.",
  path: "/free/review-checklist",
});

const SECTIONS: [string, string[]][] = [
  ["1. The numbers (10 minutes)", [
    "Count your closed trades. Under 30? Note it: results this small are mostly luck.",
    "Total R: add up the R-multiple of every trade. Positive or negative?",
    "Expectancy in R: total R ÷ number of trades. Above 0 means the last 30 trades made money per unit of risk.",
    "Win rate and average win / average loss in R. Read them together, never alone.",
    "Largest drawdown in R, and how close it came to your daily or max loss limit (prop accounts).",
  ]],
  ["2. Your rules (10 minutes)", [
    "How many trades broke at least one rule? What was the total R of those trades?",
    "Which mistake tag appears most? Which one cost the most R?",
    "Did any single trade risk more than your planned 1R? Why?",
    "Did you trade outside your planned sessions or instruments?",
  ]],
  ["3. Your edge (10 minutes)", [
    "Which setup has the best expectancy in R? Which has the worst?",
    "Which session or day of the week is best and worst? (Small samples: treat it as a question, not an answer.)",
    "Are your losers cut at about −1R, or do some run to −2R or worse?",
    "Are you exiting winners early? Compare average win in R with your planned target.",
  ]],
  ["4. One change (5 minutes)", [
    "Write ONE change for the next 30 trades, for example: “Stop trading the setup with negative expectancy” or “No trades after 2 losses in a day”.",
    "Write how you will measure it at the next review.",
    "Put the date of your next review in your calendar.",
  ]],
];

export default function Checklist() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <Eyebrow>Free resource</Eyebrow>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">The 30-trade review checklist</h1>
      <p className="mt-3 text-muted">Every 30 trades, take 35 minutes and answer these questions. It works for a live account, a demo or a prop firm challenge. Print it (Ctrl/Cmd + P) or keep it open next to your journal.</p>
      <div className="mt-8 space-y-8">
        {SECTIONS.map(([h, items]) => (
          <section key={h}>
            <h2 className="text-xl font-semibold tracking-tight">{h}</h2>
            <ul className="mt-3 space-y-2">{items.map((i) => <li key={i} className="flex gap-3 text-sm leading-relaxed"><span aria-hidden className="mt-0.5 inline-block h-4 w-4 shrink-0 rounded border border-border-strong" />{i}</li>)}</ul>
          </section>
        ))}
      </div>
      <p className="mt-10 text-sm text-muted">Not sure what R-multiple or expectancy mean? Read <Link href="/learn/r-multiple-prop-firm-challenge" className={linkCls}>R-multiple explained (with a free calculator)</Link>. TradeNotes works out every number on this checklist from your journal automatically: <Link href="/demo" className={linkCls}>see the demo</Link>.</p>
      <p className="mt-4 text-xs text-muted">Educational content, not financial advice. Trading involves substantial risk of loss.</p>
      <JamesNote />
    </div>
  );
}
