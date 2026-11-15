import Link from "next/link";
import { ScoreRing, Radar, PnlBars } from "@/components/Charts";
import EquityCurve from "@/components/EquityCurve";

const DEMO_CURVE = [120, 80, 260, 410, 350, 520, 690, 610, 780, 940, 880, 1120, 1260, 1190, 1420, 1610];
const DEMO_AXES = [
  { key: "a", label: "Profit factor", value: 74, raw: "" }, { key: "b", label: "Avg win / loss", value: 66, raw: "" }, { key: "c", label: "Win rate", value: 80, raw: "" },
  { key: "d", label: "Consistency", value: 58, raw: "" }, { key: "e", label: "Drawdown control", value: 71, raw: "" }, { key: "f", label: "Discipline", value: 52, raw: "" },
];
const DEMO_TAGS = [
  { label: "London open", trades: 22, pnl: 1340, winRate: 0.62 }, { label: "Breakout", trades: 18, pnl: 610, winRate: 0.55 },
  { label: "Moved stop", trades: 7, pnl: -720, winRate: 0.14 }, { label: "FOMO", trades: 6, pnl: -485, winRate: 0.17 },
];

const features = [
  ["✦", "AI trading coach", "Ask “why was last week red?” and get an answer built from your own trades, with three things to try next week.", "Pro"],
  ["◎", "TradeNotes Score", "One 0–100 number across six factors — profit factor, consistency, drawdown, discipline and more — and the weakest one to fix first.", "Pro"],
  ["▦", "P&L calendar", "Every trading day in green and red, with weekly totals. Spot tilt, overtrading and your best days at a glance.", "Starter"],
  ["◔", "Deep reports", "Results by hour, hold time, setup, instrument, emotion and mistake — plus your R-multiple distribution.", "Starter"],
  ["⚑", "Mistake cost", "See the exact dollar cost of “moved stop”, “revenge trade” and every habit you tag.", "Starter"],
  ["☰", "Fast journaling", "Partial exits, fees, forex lots, setups, emotions, plan adherence — logged in about a minute.", "Free"],
];

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl overflow-hidden px-4">
      <section className="relative py-16 text-center sm:py-24">
        <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-72 w-[40rem] max-w-full -translate-x-1/2 rounded-full bg-accent/25 blur-[100px]" />
        <p className="anim-fade-up mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3 py-1 text-xs text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-win pulse-ring" /> New: AI Coach that reads your journal
        </p>
        <h1 className="anim-fade-up mx-auto max-w-4xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl" style={{ animationDelay: ".05s" }}>
          Find the leak in your trading <span className="text-gradient">before it finds your account.</span>
        </h1>
        <p className="anim-fade-up mx-auto mt-6 max-w-2xl text-lg text-muted" style={{ animationDelay: ".1s" }}>
          TradeNotes turns your trade log into a score, a calendar, and a coach that tells you which habits make you money — and which ones quietly drain it.
        </p>
        <div className="anim-fade-up mt-8 flex flex-wrap justify-center gap-3" style={{ animationDelay: ".15s" }}>
          <Link href="/signup" className="rounded-lg bg-gradient-to-r from-accent to-indigo-500 px-6 py-3 font-medium text-white shadow-lg shadow-accent/30 transition hover:brightness-110">Start free</Link>
          <Link href="/pricing" className="rounded-lg border border-border px-6 py-3 font-medium transition hover:border-accent/50">See pricing</Link>
        </div>
        <p className="mt-3 text-xs text-muted">Free plan, no card required.</p>
      </section>

      {/* Product preview (illustrative sample data) */}
      <section className="anim-fade-up relative" style={{ animationDelay: ".2s" }}>
        <div className="rounded-2xl border border-border bg-panel/80 p-3 shadow-2xl shadow-accent/10 sm:p-5">
          <div className="mb-3 flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-loss/70" /><span className="h-2.5 w-2.5 rounded-full bg-warn/70" /><span className="h-2.5 w-2.5 rounded-full bg-win/70" /><span className="ml-3 text-[11px] text-muted">Sample dashboard — illustrative data</span></div>
          <div className="grid gap-3 lg:grid-cols-[16rem_1fr]">
            <div className="flex flex-col items-center rounded-xl border border-border bg-panel-2 p-3"><p className="text-xs text-muted">TradeNotes Score</p><ScoreRing score={67} size={120} /><Radar axes={DEMO_AXES} size={210} /></div>
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[["Net P&L", "+$1,610", "text-win"], ["Win rate", "58.3%", ""], ["Profit factor", "1.84", ""], ["Avg R", "0.62R", ""]].map(([l, v, c]) => (
                  <div key={l} className="rounded-xl border border-border bg-panel-2 p-3"><p className="text-[10px] uppercase tracking-wider text-muted">{l}</p><p className={`text-xl font-semibold ${c}`}>{v}</p></div>
                ))}
              </div>
              <div className="rounded-xl border border-border bg-panel-2 p-3"><EquityCurve points={DEMO_CURVE} currency="USD" /></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-panel-2 p-3"><p className="mb-2 text-xs text-muted">What your tags are worth</p><PnlBars data={DEMO_TAGS} cur="USD" /></div>
                <div className="anim-float rounded-xl border border-accent/40 bg-accent/10 p-3 text-sm">
                  <p className="text-[11px] font-semibold text-indigo-300">✦ Coach</p>
                  <p className="mt-1">“Moved stop” cost you <strong className="text-loss">$720</strong> over 7 trades — more than your two best days combined. Keep stops fixed for your next 10 trades and compare.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-20">
        <h2 className="text-center text-3xl font-semibold">Everything a serious journal should do</h2>
        <p className="mt-2 text-center text-muted">Built for forex, futures, stocks and crypto traders who want honest numbers.</p>
        <div className="stagger mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(([icon, t, d, tier]) => (
            <div key={t} className="card-hover glass rounded-xl border border-border p-6">
              <div className="flex items-center justify-between"><span className="text-gradient text-2xl">{icon}</span><span className="rounded-full bg-panel-2 px-2 py-0.5 text-[10px] text-muted">{tier}</span></div>
              <h3 className="mt-3 font-semibold">{t}</h3><p className="mt-2 text-sm text-muted">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-20 grid gap-6 rounded-2xl border border-border bg-panel p-8 md:grid-cols-3">
        {[["1", "Log", "Enter a trade in a minute — or let your tags do the talking."], ["2", "Discover", "Your score, calendar and reports update instantly and surface patterns."], ["3", "Improve", "The coach turns patterns into three concrete rules for next week."]].map(([n, t, d]) => (
          <div key={n}><span className="text-gradient text-4xl font-bold">{n}</span><h3 className="mt-2 text-lg font-semibold">{t}</h3><p className="mt-1 text-sm text-muted">{d}</p></div>
        ))}
      </section>

      <section className="mt-16 text-center">
        <h2 className="text-2xl font-semibold">What is your worst habit costing you?</h2>
        <p className="mt-2 text-muted">Log ten trades free and find out.</p>
        <Link href="/signup" className="mt-5 inline-block rounded-lg bg-gradient-to-r from-accent to-indigo-500 px-6 py-3 font-medium text-white shadow-lg shadow-accent/30">Start free</Link>
        <Link href="/learn" className="mt-4 block text-sm text-indigo-300">Or read the metric guide →</Link>
      </section>
      <p className="mt-10 text-center text-xs text-muted">TradeNotes does not provide financial advice and does not promise trading results. Dashboard shown uses sample data.</p>
    </div>
  );
}
