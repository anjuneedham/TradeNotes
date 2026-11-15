import Link from "next/link";
import { PLANS, aiQuestions, type PlanId } from "@/lib/plans";
import { SCORE_MIN_TRADES, SCORE_TIPS, type Insight, type Score } from "@/lib/insights";
import { Badge, Card, Eyebrow, btnCls, btnGhostCls, linkCls } from "./ui";

/** Animated 0-100 ring. Server-rendered SVG; the draw animation is CSS (off under reduced motion). */
export function ScoreRing({ score, size = 112 }: { score: number; size?: number }) {
  const r = 50, c = 2 * Math.PI * r;
  const tone = score >= 70 ? "var(--win)" : score >= 45 ? "var(--warn)" : "var(--loss)";
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={`TradeNotes Score ${score} out of 100`} className="shrink-0">
      <circle cx="60" cy="60" r={r} fill="none" stroke="var(--raised)" strokeWidth="9" />
      <circle cx="60" cy="60" r={r} fill="none" stroke={tone} strokeWidth="9" strokeLinecap="round" transform="rotate(-90 60 60)"
        strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} className="tn-draw" style={{ ["--len" as string]: c }} />
      <text x="60" y="58" textAnchor="middle" dominantBaseline="central" fontSize="32" fontWeight="600" fill="var(--fg)" className="fig">{score}</text>
      <text x="60" y="84" textAnchor="middle" fontSize="10" fill="var(--muted)">of 100</text>
    </svg>
  );
}

const SAMPLE_SCORE: Score = {
  total: 64, trades: 48,
  axes: [
    { key: "pf", label: "Profit factor", value: 70, detail: "" }, { key: "payoff", label: "Win size vs loss size", value: 62, detail: "" }, { key: "winrate", label: "Win rate", value: 81, detail: "" },
    { key: "consistency", label: "Consistency", value: 58, detail: "" }, { key: "drawdown", label: "Drawdown control", value: 66, detail: "" }, { key: "discipline", label: "Discipline", value: 47, detail: "" },
  ],
  weakest: { key: "discipline", label: "Discipline", value: 47, detail: "" },
};

function ScoreBody({ s }: { s: Score }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <ScoreRing score={s.total} />
      <ul className="min-w-0 flex-1 space-y-1.5 text-xs">
        {s.axes.map((a, i) => (
          <li key={a.key} className="grid grid-cols-[8.5rem_1fr_2rem] items-center gap-2" title={a.detail}>
            <span className={`truncate ${a.key === s.weakest.key ? "font-medium text-fg" : "text-muted"}`}>{a.label}</span>
            <span className="h-1.5 overflow-hidden rounded-full bg-raised"><span className="tn-rise block h-full rounded-full bg-accent" style={{ width: `${Math.max(a.value, 2)}%`, animationDelay: `${i * 60}ms` }} /></span>
            <span className="fig text-right">{a.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Dashboard strip: TradeNotes Score, automatic insights and the AI Coach entry point.
 * Free sees one real insight, a count of the hidden ones and a sample score; paid plans see their own.
 * `demo` = the public demo (sample data, no upgrade prompts).
 */
export function PerformancePanel({ plan, score, found, tradeCount, demo = false }: { plan: PlanId; score: Score | null; found: Insight[]; tradeCount: number; demo?: boolean }) {
  const P = PLANS[plan];
  const shown = found.slice(0, P.insights);
  const hidden = found.length - shown.length;
  const upTo = plan === "free" ? "starter" : "pro";
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <Card className="tn-rise">
        <div className="mb-3 flex items-center justify-between gap-2"><Eyebrow>TradeNotes Score</Eyebrow>{P.score && score && <Link href="/learn#score" className="text-xs text-muted hover:text-fg">How it works</Link>}</div>
        {P.score ? (score ? (<>
          <ScoreBody s={score} />
          <p className="mt-4 border-t border-border pt-3 text-sm"><span className="text-muted">Fix first: </span><strong className="font-medium">{score.weakest.label}.</strong> <span className="text-muted">{SCORE_TIPS[score.weakest.key]}</span></p>
        </>) : (
          <p className="py-6 text-sm text-muted">Your score appears after {SCORE_MIN_TRADES} closed trades ({Math.max(0, SCORE_MIN_TRADES - tradeCount)} to go). It rates profit factor, win size, win rate, consistency, drawdown control and discipline from 0 to 100.</p>
        )) : (
          <div className="relative">
            <div aria-hidden="true" className="pointer-events-none select-none opacity-50 blur-[3px]"><ScoreBody s={SAMPLE_SCORE} /></div>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
              <p className="font-medium">What&apos;s your score out of 100?</p>
              <p className="max-w-xs text-xs text-muted">Six factors, one number, and the one thing to fix first. Included with {PLANS.starter.name} and {PLANS.pro.name}.</p>
              <Link href="/app/billing?plan=starter" className={btnCls}>See my score</Link>
            </div>
          </div>
        )}
      </Card>

      <Card className="tn-rise">
        <div className="mb-3 flex items-center justify-between gap-2"><Eyebrow>What your trades are telling you</Eyebrow>{found.length > 0 && <Badge tone="accent">{found.length} found</Badge>}</div>
        {found.length === 0 ? (
          <p className="text-sm text-muted">{tradeCount < 5 ? `Insights start after 5 closed trades. Tag emotions and mistakes to get the most out of them.` : "Nothing stands out yet. Tag emotions, mistakes and strategies on your trades and patterns will surface here."}</p>
        ) : (
          <ul className="tn-stagger space-y-2">
            {shown.map((f) => (
              <li key={f.id} className={`rounded-md border-l-2 bg-raised/60 px-3 py-2 ${f.tone === "bad" ? "border-loss" : f.tone === "good" ? "border-win" : "border-accent"}`}>
                <p className="text-sm font-medium">{f.href && !demo ? <Link href={f.href} className="hover:underline">{f.title}</Link> : f.title}</p>
                <p className="mt-0.5 text-xs text-muted">{f.body}</p>
              </li>
            ))}
            {hidden > 0 && (
              <li className="rounded-md border border-dashed border-border-strong px-3 py-2.5">
                <p className="text-sm font-medium">{hidden} more finding{hidden === 1 ? "" : "s"} in your trades</p>
                <p className="mt-0.5 text-xs text-muted">Including {found.slice(P.insights).some((f) => f.tone === "bad") ? "a pattern that is costing you money" : "what is working best for you"}.</p>
                {!demo && <Link href={`/app/billing?plan=${upTo}`} className={`${linkCls} mt-1 inline-block text-xs`}>Show all with {PLANS[upTo].name} →</Link>}
              </li>
            )}
          </ul>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
          <p className="text-sm"><span className="font-medium">AI Coach</span> <span className="text-muted">{plan === "free" ? `— try ${aiQuestions("free")} free questions: why did a week go red, what should I stop doing?` : "— ask why a week went red, or what to stop doing."}</span></p>
          {!demo && <Link href="/app/coach" className={plan === "free" ? btnGhostCls : btnCls}>{plan === "free" ? "Try the coach" : "Ask the coach"}</Link>}
        </div>
      </Card>
    </div>
  );
}
