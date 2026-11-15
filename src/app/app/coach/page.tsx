import { getContext } from "@/lib/app-context";
import { PLANS } from "@/lib/plans";
import { coachConfigured } from "@/lib/coach";
import { monthSpendMicros, nextReset } from "@/lib/ai-usage";
import { Card, Badge, PageHeader, Notice } from "@/components/ui";
import { UpgradeNotice } from "@/components/UpgradeNotice";
import { CoachChat } from "@/components/CoachChat";

export const metadata = { title: "AI Coach — TradeNotes" };

const EXAMPLE = [
  { role: "user" as const, content: "Why was last week red?" },
  { role: "assistant" as const, content: "Example answer (sample data):\n\nLast week you closed 14 trades for −$412. Two things drove it:\n• 5 trades tagged “Moved stop” lost $530 — more than the whole week.\n• Entries around 13:00 went 0 for 4.\n\nFor your next 10 trades: keep stops where you placed them, and skip 13:00–14:00 entries. Then compare." },
];

export default async function CoachPage() {
  const { db, plan } = await getContext();
  const P = PLANS[plan];
  const head = <PageHeader title="AI Coach" sub="Ask about your own trades. The coach reads your stats, tags and playbook results and answers with your numbers and specific next steps." />;
  if (P.aiBudgetCents <= 0) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">{head}
        <UpgradeNotice feature="The AI Coach">Weekly reviews in seconds, “what is my most expensive habit?”, setup-by-setup comparisons and three rules for next week — all from your own journal.</UpgradeNotice>
        <Card className="opacity-80"><Badge>Example — not your data</Badge><div className="mt-3"><CoachChat initial={EXAMPLE} usedPct={0} disabled /></div></Card>
      </div>
    );
  }
  const { history, spent } = await db(async (x) => ({
    history: (await x<{ role: "user" | "assistant"; content: string }>("select role, content from tradenotes.ai_messages order by created_at desc, id desc limit 30")).reverse(),
    spent: await monthSpendMicros(x),
  }));
  const usedPct = Math.min(100, Math.round((spent / (P.aiBudgetCents * 10_000)) * 100));
  const reset = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(nextReset());
  return (
    <div className="mx-auto max-w-3xl space-y-5">{head}
      {!coachConfigured() && <Notice kind="warn">The AI Coach is being switched on and will be available shortly.</Notice>}
      <Card><CoachChat initial={history} usedPct={usedPct} resetLabel={reset} planName={P.name} disabled={!coachConfigured()} /></Card>
      <p className="text-xs leading-relaxed text-muted">The coach is an AI and can make mistakes; check anything important against your Analytics. It analyses your recorded trades only and is not financial advice. To answer, your trade results, tags and strategy names are sent to our AI provider, Anthropic, which does not train on them.</p>
    </div>
  );
}
