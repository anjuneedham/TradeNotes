import { getContext } from "@/lib/app-context";
import { PLANS, aiQuestions } from "@/lib/plans";
import { coachConfigured } from "@/lib/coach";
import { monthSpendMicros, nextReset } from "@/lib/ai-usage";
import { Card, PageHeader, Notice, btnCls } from "@/components/ui";
import { CoachChat } from "@/components/CoachChat";
import Link from "next/link";

export const metadata = { title: "AI Coach — TradeNotes" };


export default async function CoachPage() {
  const { db, plan } = await getContext();
  const P = PLANS[plan];
  const head = <PageHeader title="AI Coach" sub="Ask about your own trades. The coach reads your stats, tags and playbook results and answers with your numbers and specific next steps." />;
  if (plan === "free") {
    return (
      <div className="mx-auto max-w-3xl space-y-5">{head}
        <Card>
          <h2 className="font-semibold">The AI Coach is included with {PLANS.starter.name} and {PLANS.pro.name}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">Ask things like &ldquo;why was last week red?&rdquo;, &ldquo;what is my most expensive habit?&rdquo; or &ldquo;which setup should I drop?&rdquo; and get answers built from your own recorded trades. About {aiQuestions("starter")} questions a month on {PLANS.starter.name}, about {aiQuestions("pro")} on {PLANS.pro.name}.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/app/billing?plan=starter" className={btnCls}>Get the AI Coach with {PLANS.starter.name}</Link>
            <Link href="/pricing" className="self-center text-sm text-muted underline underline-offset-2">Compare plans</Link>
          </div>
        </Card>
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
      <Card><CoachChat initial={history} usedPct={usedPct} total={aiQuestions(plan)} resetLabel={reset} planName={P.name} upgrade={plan === "pro" ? null : { href: "/app/billing?plan=pro", label: `Double it with ${PLANS.pro.name}` }} disabled={!coachConfigured()} /></Card>
      <p className="text-xs leading-relaxed text-muted">The coach is an AI and can make mistakes; check anything important against your Analytics. It analyses your recorded trades only and is not financial advice. To answer, your trade results, tags and strategy names are sent to our AI provider, Anthropic, which does not train on them.</p>
    </div>
  );
}
