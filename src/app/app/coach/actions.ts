"use server";
import { getContext } from "@/lib/app-context";
import { PLANS } from "@/lib/plans";
import { loadJournalTrades } from "@/lib/load-trades";
import { askCoach, coachConfigured, type CoachTurn } from "@/lib/coach";
import Anthropic from "@anthropic-ai/sdk";

export type AskResult = { ok: true; answer: string; remaining: number } | { ok: false; error: string };

export async function askCoachAction(question: string): Promise<AskResult> {
  const { db, accounts, plan } = await getContext();
  const P = PLANS[plan];
  if (!P.coach) return { ok: false, error: "The AI Coach is part of the Pro plan." };
  if (!coachConfigured()) return { ok: false, error: "The AI Coach isn't switched on yet. Please try again later." };
  const q = question.trim().slice(0, 2000);
  if (q.length < 2) return { ok: false, error: "Ask a question first." };

  const cur = accounts[0]?.currency ?? "USD";
  const { used, history } = await db(async (x) => ({
    used: (await x<{ n: number }>("select count(*)::int n from tradenotes.ai_messages where role = 'user' and created_at > now() - interval '24 hours'"))[0].n,
    history: (await x<CoachTurn>("select role, content from tradenotes.ai_messages order by created_at desc, id desc limit 12")).reverse(),
  }));
  if (used >= P.coachDailyMessages) return { ok: false, error: `You've used all ${P.coachDailyMessages} coach questions for the last 24 hours. Your allowance refills on a rolling basis.` };
  // History must start with a user turn.
  while (history.length && history[0].role !== "user") history.shift();

  const { trades } = await loadJournalTrades(db, cur);
  try {
    const r = await askCoach(history, q, trades, cur);
    await db((x) => x(
      "insert into tradenotes.ai_messages (role, content, input_tokens, output_tokens) values ('user', $1, 0, 0), ('assistant', $2, $3, $4)",
      [q, r.text.slice(0, 20000), r.inputTokens, r.outputTokens]));
    return { ok: true, answer: r.text, remaining: P.coachDailyMessages - used - 1 };
  } catch (e) {
    console.error("coach failed", e instanceof Anthropic.APIError ? `${e.status} ${e.message}` : e);
    if (e instanceof Anthropic.RateLimitError) return { ok: false, error: "The coach is busy right now. Try again in a minute." };
    if (e instanceof Anthropic.APIError && (e.status === 400 || e.status === 401 || e.status === 403)) return { ok: false, error: "The coach is temporarily unavailable. We've been notified." };
    return { ok: false, error: "Something went wrong reaching the coach. Please try again." };
  }
}
