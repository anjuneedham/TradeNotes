import Link from "next/link";
import { James } from "@/components/James";
import { SubscribeForm } from "@/components/SubscribeForm";
import { formatDay, kindLabel, publishedNotes } from "@/lib/newsletter";
import { JAMES } from "@/lib/james";

export const dynamic = "force-dynamic"; // the latest note depends on today's date

const pillars = [
  ["Journal every trade", "Log entries, partial exits, fees, setup, emotions and mistakes in about a minute. Built for forex lots and other markets. (CSV import is coming soon.)"],
  ["See what actually works", "Win rate, expectancy, profit factor, R-multiples and drawdown — each with a plain-English explanation."],
  ["Find your repeat mistakes", "Tag your emotions and mistakes on every trade, and see your results by setup, session, instrument and day of the week."],
  ["Practise before you risk — coming soon", "Backtesting with bar-by-bar historical replay is in development. It is not available yet, and we will say so plainly until it is."],
];

export default function Home() {
  const latest = publishedNotes()[0];
  return (
    <div className="mx-auto max-w-6xl px-4">
      <section className="py-20 text-center">
        <p className="mb-4 text-sm uppercase tracking-widest text-accent">Trading journal · Performance analytics</p>
        <h1 className="mx-auto max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
          Know your trades. Understand your patterns. Improve your process.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">
          Most traders repeat the same mistakes because they never measure them. TradeNotes helps you record every decision, see what it cost or earned you, and test changes before you risk money.
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
      <section className="mt-16 grid items-center gap-6 rounded-lg border border-border bg-panel p-8 sm:grid-cols-[auto_1fr]">
        <James pose="write" size={130} className="mx-auto text-fg" />
        <div>
          <p className="text-xs uppercase tracking-widest text-accent">Meet James</p>
          <h2 className="mt-1 text-2xl font-semibold">{JAMES.tagline}</h2>
          <p className="mt-2 text-muted">{JAMES.bio}</p>
          {latest && (
            <p className="mt-3 text-sm"><span className="text-muted">Latest · {formatDay(latest.date)} · {kindLabel(latest.kind)}: </span><Link href={`/notes/${latest.slug}`} className="text-accent">{latest.title}</Link></p>
          )}
          <div className="mt-4"><SubscribeForm source="home" /></div>
        </div>
      </section>
      <p className="mt-10 text-center text-xs text-muted">TradeNotes does not provide financial advice and does not promise trading results.</p>
    </div>
  );
}
