"use server";
import Anthropic from "@anthropic-ai/sdk";
import { getContext } from "@/lib/app-context";
import { PLANS, aiQuestions } from "@/lib/plans";
import { loadResults } from "@/lib/trades-data";
import { askCoach, coachConfigured, type CoachTurn } from "@/lib/coach";
import { monthSpendMicros } from "@/lib/ai-usage";

export type AskResult = { ok: true; answer: string; usedPct: number } | { ok: false; error: string; usedPct?: number };

export async function askCoachAction(question: string): Promise<AskResult> {
  const { db, plan, scope, tz } = await getContext();
  const budget = PLANS[plan].aiBudgetCents * 10_000; // micro-dollars
  if (budget <= 0) return { ok: false, error: `The AI Coach is included with ${PLANS.starter.name} and ${PLANS.pro.name}.` };
  if (!coachConfigured()) return { ok: false, error: "The AI Coach is being switched on. Please try again soon." };
  const q = String(question ?? "").trim().slice(0, 2000);
  if (q.length < 2) return { ok: false, error: "Type a question first." };

  const { spent, history } = await db(async (x) => ({
    spent: await monthSpendMicros(x),
    history: (await x<CoachTurn>("select role, content from tradenotes.ai_messages order by created_at desc, id desc limit 10")).reverse(),
  }));
  if (spent >= budget) return { ok: false, usedPct: 100, error: plan === "pro" ? `You've used this month's ${aiQuestions("pro")} coach questions. They refill on the 1st.` : plan === "starter" ? `You've used this month's coach questions. They refill on the 1st, or upgrade to ${PLANS.pro.name} for double (about ${aiQuestions("pro")} a month).` : `You've used your ${aiQuestions("free")} free coach questions this month. They refill on the 1st, or get about ${aiQuestions("starter")} a month with ${PLANS.starter.name}.` };
  while (history.length && history[0].role !== "user") history.shift(); // history must start with the trader

  const { rows } = await loadResults(db, scope.accountIds, scope.currency, undefined, tz, { checks: true });
  try {
    const r = await askCoach(history, q, rows, scope.currency, tz);
    await db((x) => x(
      "insert into tradenotes.ai_messages (role, content, model, input_tokens, output_tokens, cost_micros) values ('user', $1, $2, 0, 0, 0), ('assistant', $3, $2, $4, $5, $6)",
      [q, r.model, r.text.slice(0, 20000), r.inputTokens, r.outputTokens, r.costMicros]));
    return { ok: true, answer: r.text, usedPct: Math.min(100, Math.round(((spent + r.costMicros) / budget) * 100)) };
  } catch (e) {
    console.error("coach failed", e instanceof Anthropic.APIError ? `${e.status} ${e.message}` : e);
    if (e instanceof Anthropic.RateLimitError) return { ok: false, error: "The coach is busy right now. Try again in a minute." };
    return { ok: false, error: "The coach couldn't answer just now. Nothing was charged to your allowance — please try again." };
  }
}
