/** Onboarding / nurture schedule from docs/SALES_PLAYBOOK.md: D0 welcome · D2 expectancy · D5 tag mistakes · D10 review + feedback · D14 upgrade (free only). */
export type StepKey = "d0" | "d2" | "d5" | "d10" | "d14";
export const STEPS: { key: StepKey; day: number; label: string; freeOnly?: boolean }[] = [
  { key: "d0", day: 0, label: "Welcome + log your first trade" }, { key: "d2", day: 2, label: "What is expectancy?" },
  { key: "d5", day: 5, label: "Tag your mistakes" }, { key: "d10", day: 10, label: "Weekly review prompt + feedback ask" },
  { key: "d14", day: 14, label: "Upgrade offer (free accounts)", freeOnly: true },
];
export const stepLabel = (k: string) => STEPS.find((s) => s.key === k)?.label ?? k;

export type Person = { createdAt: string; plan: string; paying: boolean; verified: boolean; emailOk: boolean; optOut: boolean; sent: string[] };
export type Due = { step: (typeof STEPS)[number]; skipOlder: StepKey[] } | null;
/** Only the single most recent due step is offered (never a burst of five emails); older unsent steps are marked skipped on send. */
export function dueStep(p: Person, now = new Date()): Due {
  if (p.optOut) return null;
  const days = Math.floor((now.getTime() - new Date(p.createdAt).getTime()) / 86_400_000);
  const eligible = STEPS.filter((s) => s.day <= days && !(s.freeOnly && p.paying) && !p.sent.includes(s.key));
  if (!eligible.length) return null;
  const step = eligible[eligible.length - 1];
  return { step, skipOlder: eligible.slice(0, -1).map((s) => s.key) };
}
/** Can we email this address at all? Verified by the customer app, or confirmed by the owner (e.g. they replied to a DM). */
export const canEmail = (p: Pick<Person, "verified" | "emailOk" | "optOut">) => !p.optOut && (p.verified || p.emailOk);

export type Mail = { subject: string; body: string };
export const DEFAULT_NURTURE: Record<StepKey, Mail> = {
  d0: { subject: "Welcome to TradeNotes — log your first trade", body: "Hi {name},\n\nThanks for signing up for TradeNotes. The one thing that makes it useful is writing down your trades, so the best first step is to log just one — it takes about a minute.\n\n{trades_line}\n\nIf anything is confusing, reply to this email and tell me what. I read every reply.\n\n— {sender}" },
  d2: { subject: "What “expectancy” actually means", body: "Hi {name},\n\nOne number worth understanding early is expectancy: roughly, what an average trade has been worth to you. It matters more than win rate, because a 70% win rate can still lose money if your losses are bigger than your wins.\n\nTradeNotes shows it on your dashboard, with a short explanation next to it. The number only means something after a decent sample of trades, so don't read too much into it early.\n\n— {sender}" },
  d5: { subject: "Tag your mistakes — that's where the learning is", body: "Hi {name},\n\nWhen you log a trade, tag any mistake you made (moved the stop, entered early, oversized…). After a few weeks the dashboard shows what those mistakes cost you, which is usually more useful than the wins.\n\nTry tagging the next three trades honestly.\n\n— {sender}" },
  d10: { subject: "Quick question about TradeNotes", body: "Hi {name},\n\nA 10-minute review each week helps: what went well, what to improve, one focus for next week. You can do that in any notebook — TradeNotes doesn't have a built-in weekly review yet.\n\nTwo questions, if you have a minute to reply:\n1. What almost stopped you from logging a trade?\n2. What's one number you wish TradeNotes showed you?\n\n— {sender}" },
  d14: { subject: "Your TradeNotes plan", body: "Hi {name},\n\nThe free plan covers your first 50 trades. If you're getting near that, Starter ($12/month) raises the limit to 2,000 trades and Pro ($24/month) removes it. Backtesting is still in development and isn't included yet.\n\n{founding_line}\n\nNo pressure either way — the free plan stays free and your data stays yours.\n\n— {sender}" },
};
export function renderMail(m: Mail, v: { name: string; sender: string; trades: number; foundingLeft: number }, footer: string): Mail {
  const trades_line = v.trades > 0 ? `You've logged ${v.trades} trade${v.trades === 1 ? "" : "s"} so far — nice.` : "You haven't logged a trade yet — one is enough to see how it works.";
  // Playbook: the founding offer is only for people who have actually logged trades.
  const founding_line = v.foundingLeft > 0 && v.trades > 0 ? `I'm also opening ${v.foundingLeft} founding spot${v.foundingLeft === 1 ? "" : "s"}: 50% off for 12 months in return for a short feedback call each month. Reply if you'd like one.` : "";
  const fill = (s: string) => s.replace(/\{name\}/g, v.name).replace(/\{sender\}/g, v.sender).replace(/\{trades_line\}/g, trades_line).replace(/\{founding_line\}/g, founding_line).replace(/\n{3,}/g, "\n\n");
  return { subject: fill(m.subject), body: `${fill(m.body).trim()}\n\n--\n${footer}` };
}
export const nameFor = (name: string | null, email: string) => (name && name.trim() && !name.includes("@") ? name.trim().split(/\s+/)[0] : email.split("@")[0]);
export const footerFor = (s: { business_name: string; support_email: string }) =>
  `You're receiving this because you signed up for TradeNotes. Reply "stop" and I'll stop sending these.\n${s.business_name} · ${s.support_email}`;
