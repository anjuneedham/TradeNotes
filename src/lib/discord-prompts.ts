/** The 30-day Journal Challenge (docs/DISCORD_COMMUNITY_PLAN.md section 5). Education and process only; nothing here is a trade call. */
export interface ChallengePrompt { day: number; week: number; theme: string; text: string }

const W = [
  { week: 1, theme: "Capture: log everything" },
  { week: 2, theme: "Cost: find your costliest mistake" },
  { week: 3, theme: "Rules: turn lessons into rules" },
  { week: 4, theme: "Execute: one rule, zero exceptions" },
  { week: 5, theme: "Graduate" },
];

const TEXTS: string[] = [
  /* 1 */ "Log your last 5 trades, or import them from your broker file. Reply here when it's done.",
  /* 2 */ "Before you trade, write a three-line plan: your setup, your risk per trade, and where you are wrong. Use /plan.",
  /* 3 */ "After your session, ask one question: did I follow my plan? Answer it with /checkin and pick one mistake tag.",
  /* 4 */ "Log every trade today, including the boring ones. The boring ones are where the data is.",
  /* 5 */ "Before each entry, note how you feel: calm, rushed, bored, angry. One word is enough.",
  /* 6 */ "Your week in numbers: trades taken, win rate, average win versus average loss. Mind the sample size; a few trades prove little.",
  /* 7 */ "Weekly review: what worked, what to repeat, which mistakes, which rules you broke, and your plan for next week.",
  /* 8 */ "Find the mistake you repeat most and tag it on every trade it shows up in.",
  /* 9 */ "What did that mistake cost you last week, in money or in R? Look at your mistake-cost numbers and share what surprised you.",
  /* 10 */ "What happened just before that mistake? Write the trigger: a loss, boredom, a missed move, a time of day.",
  /* 11 */ "Write the opposite behaviour in one sentence. If the mistake is 'moved my stop', it might be 'my stop does not move'.",
  /* 12 */ "Check in. Did the mistake repeat today? Tag it either way.",
  /* 13 */ "Compare your sessions and weekdays. Where do you trade best, and where do you give it back?",
  /* 14 */ "Weekly review: focus on mistakes and rule breaks. Pick the one that cost you most.",
  /* 15 */ "Write three rules, one line each. Short enough to read in five seconds.",
  /* 16 */ "Turn your three rules into a checklist you can tick before every entry. Your playbook is the place for it.",
  /* 17 */ "Tick the checklist before every entry today. Notice when you want to skip it.",
  /* 18 */ "Track results when you followed your rules versus when you did not. What does the gap say?",
  /* 19 */ "Find your best-adherence trade. What was different about how you prepared?",
  /* 20 */ "Find your worst-adherence trade. What was different about how you prepared?",
  /* 21 */ "Weekly review: your adherence scorecard. Rules followed, rules broken, and what each cost.",
  /* 22 */ "Pick ONE rule for this week. Zero exceptions. Write it down and share it here.",
  /* 23 */ "Pre-commit: what will you do the moment you want to break your rule? Write the exact action.",
  /* 24 */ "Check in. Did you hold your one rule today?",
  /* 25 */ "Check in. What urge showed up, and what did you do with it?",
  /* 26 */ "Holiday day. Keep it light: just log, or rest. Both count.",
  /* 27 */ "Check in. How many days in a row have you held your one rule?",
  /* 28 */ "Weekly review: your one-rule scorecard. Held, broken, and what you learned.",
  /* 29 */ "Compare week 1 with week 4. Which numbers moved, and which habits did?",
  /* 30 */ "Graduation. Write your next 30 days: one rule and one metric you will track.",
];

export const PROMPTS: readonly ChallengePrompt[] = TEXTS.map((text, i) => {
  const day = i + 1;
  const week = day <= 28 ? Math.ceil(day / 7) : 5;
  return { day, week, theme: W[week - 1].theme, text };
});

export const FOOTER = "*Education and process only. Not financial advice.*";

/** The message posted to the daily-prompt channel. */
export function promptMessage(day: number): string | null {
  const p = PROMPTS.find((x) => x.day === day);
  if (!p) return null;
  return `**Day ${p.day} of ${PROMPTS.length} · Week ${p.week}: ${p.theme}**\n${p.text}\n\nPost one line in #check-in, then run \`/checkin\`.\n${FOOTER}`;
}
