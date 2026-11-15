import { getContext } from "@/lib/app-context";
import { PLANS } from "@/lib/plans";
import { coachConfigured } from "@/lib/coach";
import { Badge, Card, Locked } from "@/components/ui";
import CoachChat from "@/components/CoachChat";

export const metadata = { title: "AI Coach — TradeNotes" };

const DEMO = [
  { role: "user" as const, content: "Why was last week red?" },
  { role: "assistant" as const, content: "Last week you closed 14 trades for −$412. Two things drove it:\n\n• 5 trades tagged “Moved stop” lost $530 combined — more than your whole week.\n• Your 13:00 UTC entries went 0 for 4.\n\nNext week: keep stops fixed for 10 trades, and skip 13:00–14:00 entries." },
];

export default async function CoachPage() {
  const { db, plan } = await getContext();
  const P = PLANS[plan];
  const header = (
    <div className="anim-fade-up">
      <Badge>✦ AI Coach</Badge>
      <h1 className="mt-2 text-3xl font-semibold">Your trading coach</h1>
      <p className="text-sm text-muted">Ask about your own trades. The coach looks up your stats, reads your tags and notes, and replies with specific next steps.</p>
    </div>
  );
  if (!P.coach) {
    return (
      <div className="space-y-4">{header}
        <Locked plan="Pro" title="Get answers from your own data" teaser={`Pro includes ${PLANS.pro.coachDailyMessages} coach questions a day: weekly reviews, “what should I stop doing?”, setup comparisons, tilt checks and more.`}>
          <Card><CoachChat initial={DEMO} remaining={0} disabled /></Card>
        </Locked>
      </div>
    );
  }
  const { history, used } = await db(async (x) => ({
    history: (await x<{ role: "user" | "assistant"; content: string }>("select role, content from tradenotes.ai_messages order by created_at desc, id desc limit 30")).reverse(),
    used: (await x<{ n: number }>("select count(*)::int n from tradenotes.ai_messages where role = 'user' and created_at > now() - interval '24 hours'"))[0].n,
  }));
  return (
    <div className="space-y-4">{header}
      <Card className="anim-fade-up"><CoachChat initial={history} remaining={Math.max(0, P.coachDailyMessages - used)} disabled={!coachConfigured()} /></Card>
      <p className="text-xs text-muted">The coach is an AI and can make mistakes. It analyses your past trades only and does not give financial advice. To answer, your trade data and notes are sent to our AI provider (Anthropic) and are not used to train models.</p>
    </div>
  );
}
