import Link from "next/link";
import { PLANS } from "@/lib/plans";
import { pageMeta, jsonLd, SITE_URL } from "@/lib/seo";
import { LEGAL } from "@/lib/legal";
import { PLAN_ORDER, planHeadline, paidAddsText, screenshotsLive } from "@/lib/plan-features";
import { summarize, type TradeInput } from "@/lib/metrics";
import { signedMoney, pct, num, pnlClass } from "@/lib/format";
import { Stat } from "@/components/stats";
import EquityCurve from "@/components/EquityCurve";
import { Badge, Eyebrow, btnCls, btnGhostCls, linkCls } from "@/components/ui";

/* The preview below renders the real dashboard components and the real metrics engine over a small,
   clearly-labelled illustrative trade list. It is never presented as anyone's results. */
const SAMPLE_PNL = [180, -120, 240, -120, -90, 310, 150, -120, 95, -60, 270, -120, 205, 140, -110, 60, -120, 330, 85, -75];
const SAMPLE: TradeInput[] = SAMPLE_PNL.map((p, i) => ({
  id: String(i), side: "long", quantity: 1, entryPrice: 1000, exits: [{ quantity: 1, price: 1000 + p }], fees: 0, initialRisk: 120,
  closedAt: new Date(Date.UTC(2026, 0, 5 + i * 3)).toISOString(),
}));

const works: [string, string][] = [
  ["Log the trade", "Direction, size, entry, stop and exit — including partial exits, fees and forex lots. About a minute."],
  ["Write down why", "Your setup, what you were thinking before and after, how you felt, and any mistakes you made."],
  ["Read the pattern", "Your results by strategy, session, instrument, weekday, mistake and emotion — with honest warnings when the sample is too small."],
];
const built: [string, string][] = [
  ["Eight core metrics", "Net P&L, win rate, profit factor, expectancy, average win and loss, average R and maximum drawdown — all after fees."],
  ["Equity curve", "Cumulative result trade by trade, with your longest winning and losing streaks."],
  ["Risk in R", "Record a stop and every result is also shown in units of what you planned to risk."],
  ["Mistake and emotion tags", "See what trades tagged “Moved stop” or “FOMO” actually added up to."],
  ["Filters everywhere", "Narrow the dashboard, analytics and journal by date, account, strategy, instrument, direction, tag and session."],
  ["Deeper analytics", "Drawdown and recovery, the spread of your results in R, which weekday and hour you trade best, results by time held, and what each mistake cost."],
  ["A review list", "Open trades, your largest loss and your costliest mistake, surfaced on the dashboard."],
  ["Explanations you can switch off", "Every figure links to a plain-English guide. Experienced traders can hide them."],
];
const devList = () => [...(screenshotsLive() ? [] : ["Trade screenshots"]), "Strategy comparison", "Backtesting with historical replay"];

export const metadata = pageMeta({ title: "TradeNotes — Trading Journal & Performance Analytics", description: "A trading journal that shows where your results come from: log trades, tag mistakes, and track win rate, expectancy and drawdown. Free plan, no card.", path: "/" });

const LD = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "@id": `${SITE_URL}/#org`, name: "TradeNotes", url: SITE_URL, parentOrganization: { "@type": "Organization", name: LEGAL.businessName } },
    {
      "@type": "SoftwareApplication", name: "TradeNotes", url: SITE_URL, applicationCategory: "FinanceApplication", operatingSystem: "Web",
      description: "Trading journal and performance analytics for retail traders.", publisher: { "@id": `${SITE_URL}/#org` },
      offers: (Object.keys(PLANS) as (keyof typeof PLANS)[]).map((id) => ({ "@type": "Offer", name: PLANS[id].name, price: String(PLANS[id].monthly), priceCurrency: "USD", url: `${SITE_URL}/pricing` })),
    },
  ],
};

export default function Home() {
  const s = summarize(SAMPLE);
  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(LD) }} />
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-12 lg:pb-24 lg:pt-20">
        <div>
          <Eyebrow>Trading journal · Performance analytics</Eyebrow>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">Know your trades. Understand your patterns. Improve your process.</h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
            Most traders repeat the same mistakes because they never measure them. TradeNotes is a trading journal where you record every decision and see, in plain numbers, what it cost or earned you.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/signup" className={`${btnCls} !px-6`}>Start free</Link>
            <Link href="/pricing" className={`${btnGhostCls} !px-6`}>See pricing</Link>
          </div>
          <p className="mt-3 text-sm text-muted">Free plan with {PLANS.free.tradeLimit} trades. No card required.</p>
        </div>

        <div aria-label="Product preview with example data" className="rounded-xl border border-border bg-panel p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-2 px-1">
            <p className="text-sm font-medium">Dashboard</p>
            <Badge tone="accent">Example data — not real results</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat show={false} label="Net P&L" value={signedMoney(s.netPnl)} cls={pnlClass(s.netPnl)} />
            <Stat show={false} label="Win rate" value={pct(s.winRate)} />
            <Stat show={false} label="Profit factor" value={num(s.profitFactor)} />
            <Stat show={false} label="Average R" value={s.avgR === null ? "—" : `${num(s.avgR)}R`} />
          </div>
          <div className="mt-2 rounded-lg border border-border bg-panel p-3.5 sm:p-4">
            <p className="mb-3 text-xs text-muted">Equity curve · cumulative net P&amp;L</p>
            <EquityCurve points={s.equityCurve} currency="USD" height={150} />
          </div>
          <p className="mt-2 rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-xs leading-relaxed">Based on {s.tradeCount} closed trades. Under 30 trades, results are mostly luck — don&apos;t draw conclusions yet.</p>
        </div>
      </section>

      <section aria-labelledby="how" className="border-y border-border bg-panel">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 id="how" className="text-2xl font-semibold tracking-tight">How it works</h2>
          <ol className="mt-8 grid gap-8 md:grid-cols-3">
            {works.map(([t, d], i) => (
              <li key={t}>
                <span className="fig text-sm text-muted">0{i + 1}</span>
                <h3 className="mt-2 font-medium">{t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="built" className="mx-auto max-w-6xl px-4 py-16">
        <div className="max-w-2xl">
          <h2 id="built" className="text-2xl font-semibold tracking-tight">What you get today</h2>
          <p className="mt-2 text-muted">Everything in this list is built, and all of it is in the Free plan.</p>
        </div>
        <dl className="mt-8 grid gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
          {built.map(([t, d]) => (<div key={t} className="border-t border-border pt-4"><dt className="font-medium">{t}</dt><dd className="mt-1.5 text-sm leading-relaxed text-muted">{d}</dd></div>))}
        </dl>
        <div className="mt-10 rounded-lg border border-border bg-raised px-5 py-4">
          <p className="text-sm font-medium text-warn">In development — not available yet</p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">{devList().join(" · ")}. We don&apos;t promise dates, and we will say plainly on this site when each one ships.</p>
        </div>
      </section>

      <section aria-labelledby="who" className="border-y border-border bg-panel">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-2">
          <div>
            <h2 id="who" className="text-2xl font-semibold tracking-tight">Built for traders who are still learning</h2>
            <p className="mt-3 leading-relaxed text-muted">Every number comes with an explanation of what it means and when it is too early to trust it. Forex traders get lots and quote-currency conversion out of the box; futures, stocks, options and crypto are supported too.</p>
            <Link href="/learn" className={`${linkCls} mt-4 inline-block text-sm`}>Read the metric guide →</Link>
          </div>
          <div>
            <h3 className="font-medium">What TradeNotes will not do</h3>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
              <li>It doesn&apos;t give signals, advice or predictions.</li>
              <li>It doesn&apos;t connect to your broker or place trades.</li>
              <li>It doesn&apos;t promise that journaling will make you profitable — it shows you what you actually did.</li>
            </ul>
          </div>
        </div>
      </section>

      <section aria-labelledby="plans" className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="plans" className="text-2xl font-semibold tracking-tight">Plans</h2>
          <Link href="/pricing" className={`${linkCls} text-sm`}>Compare plans in full →</Link>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {PLAN_ORDER.map((id) => (
            <div key={id} className="rounded-lg border border-border bg-panel p-5">
              <p className="font-medium">{PLANS[id].name}</p>
              <p className="mt-1.5"><span className="fig text-2xl font-medium">${PLANS[id].monthly}</span><span className="text-sm text-muted"> / month</span></p>
              <p className="mt-2 text-sm text-muted">{planHeadline(id)}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted">Today the paid plans add {paidAddsText()}. Start on Free and move up only if you need the room.</p>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border-strong bg-panel px-5 py-6 sm:px-8">
          <p className="text-lg font-medium tracking-tight">Log your most recent trade. See what it tells you.</p>
          <Link href="/signup" className={`${btnCls} !px-6`}>Start free</Link>
        </div>
        <p className="mt-6 text-xs text-muted">TradeNotes does not provide financial advice and does not promise trading results.</p>
      </section>
    </div>
  );
}
