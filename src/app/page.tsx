import Link from "next/link";

const pillars = [
  ["Journal every trade", "Log entries, partial exits, fees, setup, emotions and mistakes in about a minute. Built for forex lots and other markets. (CSV import is coming soon.)"],
  ["See what actually works", "Win rate, expectancy, profit factor, R-multiples and drawdown — each with a plain-English explanation."],
  ["Find your repeat mistakes", "Tag your emotions and mistakes on every trade, and see your results by setup, session, instrument and day of the week."],
  ["Practise before you risk — coming soon", "Backtesting with bar-by-bar historical replay is in development. It is not available yet, and we will say so plainly until it is."],
];

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4">
      <section className="py-20 text-center">
        <p className="mb-4 text-sm uppercase tracking-widest text-accent">Trading journal · Performance analytics</p>
        <h1 className="mx-auto max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
          Know your trades. Understand your patterns. Improve your process.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">
          Most traders repeat the same mistakes because they never measure them. TradeNotes helps you record every decision and see what it cost or earned you.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/signup" className="rounded-md bg-accent px-5 py-3 font-medium text-white">Start free</Link>
          <Link href="/pricing" className="rounded-md border border-border px-5 py-3 font-medium">See pricing</Link>
        </div>
        <p className="mt-3 text-xs text-muted">Free plan, no card required.</p>
      </section>
      <section className="grid gap-4 sm:grid-cols-2">
        {pillars.map(([t, d]) => (
          <div key={t} className="rounded-lg border border-border bg-panel p-6">
            <h2 className="font-semibold">{t}</h2>
            <p className="mt-2 text-sm text-muted">{d}</p>
          </div>
        ))}
      </section>
      <section className="mt-16 rounded-lg border border-border bg-panel p-8">
        <h2 className="text-2xl font-semibold">Built for traders who are still learning</h2>
        <p className="mt-3 text-muted">
          Every number in TradeNotes comes with an explanation of what it means and when it is too early to trust it. Experienced traders can switch the explanations off and go straight to the data.
        </p>
        <Link href="/learn" className="mt-4 inline-block text-accent">Read the metric guide →</Link>
      </section>
      <p className="mt-10 text-center text-xs text-muted">TradeNotes does not provide financial advice and does not promise trading results.</p>
    </div>
  );
}
