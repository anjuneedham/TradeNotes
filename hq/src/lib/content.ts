/** Content engine rules from docs/CONTENT_ENGINE.md as pure functions. */
export const FORMATS = {
  F1: { name: "The number lies", pillar: "Education + stat", seconds: "25–35", beats: "0–2 hook · 2–10 setup · 10–22 reveal (big number) · 22–30 show in TradeNotes · 30–35 CTA" },
  F2: { name: "Journal this with me", pillar: "Live trade log", seconds: "30–45", beats: "Screen-record one real trade: instrument → entry/stop → exit → tag the mistake → see R. End with the lesson line." },
  F3: { name: "Mistake of the week", pillar: "Psychology", seconds: "25–40", beats: "Name the mistake → what it looks like in a journal → how tagging reveals its cost → one rule to prevent it." },
  F4: { name: "Build log", pillar: "Build in public", seconds: "20–40", beats: "One shipped feature, one real number, one honest problem. Show the progress strip." },
  F5: { name: "Beginner answers", pillar: "Q&A", seconds: "20–30", beats: "One question → direct answer first → the nuance → link to /learn." },
} as const;
export type FormatId = keyof typeof FORMATS;
export const FORMAT_IDS = Object.keys(FORMATS) as FormatId[];

export const STATUSES = ["idea", "scripted", "approved", "recorded", "edited", "posted", "measured"] as const;
export type Status = (typeof STATUSES)[number];
export const STATUS_LABEL: Record<Status, string> = { idea: "Idea", scripted: "Scripted", approved: "Approved", recorded: "Recorded", edited: "Edited", posted: "Posted", measured: "Measured" };

/** Compliance checklist. ALL must be ticked before a script can be approved ("Founder approves every claim before posting"). */
export const CHECKS = [
  { key: "no_profit_claims", label: "No profit claims, no “you’ll be profitable”, no fake results, testimonials or user counts" },
  { key: "not_advice", label: "“Not financial advice.” small text is planned on screen" },
  { key: "sample_data", label: "Demo data is my own real data, or labelled “SAMPLE DATA · NOT REAL TRADES”" },
  { key: "shipped_only", label: "Only shows features that exist today (no backtesting / CSV import / calendar yet)" },
  { key: "claims_verified", label: "Every factual claim listed under “Claims to verify” is checked or demonstrated with my data" },
  { key: "no_copying", label: "No copied scripts, footage, music or branding; platform-licensed sounds only" },
] as const;
export type Checks = Partial<Record<(typeof CHECKS)[number]["key"], boolean>>;

export type Item = { format: string; hook: string | null; voiceover: string | null; tt_caption: string | null; yt_title: string | null; talking_points: string | null; cta: string | null; checks: Checks | Record<string, unknown> | null };

const HARD: [RegExp, string][] = [
  [/\bguarantee[sd]?\b/i, "“guarantee”"], [/\brisk[- ]free\b/i, "“risk-free”"], [/\bget rich\b/i, "“get rich”"], [/\bpassive income\b/i, "“passive income”"],
  [/\bfinancial freedom\b/i, "“financial freedom”"], [/\bnever lose\b/i, "“never lose”"], [/\bmake (?:you|me|your)?\s*(?:money|a profit|profits?)\b/i, "“make money / profit”"],
  [/\b(?:become|be|get|get you|make you) (?:consistently )?profitable\b/i, "“become profitable”"], [/\bquit (?:your|my) (?:9[- ]?5|job)\b/i, "“quit your job”"], [/\bwin every\b/i, "“win every …”"],
];
const SOFT: [RegExp, string][] = [[/\bprofit(?!\s+factor)\b/i, "“profit” (fine only as a metric name, e.g. profit factor)"], [/\bsignals?\b/i, "“signals” (ad platforms flag this)"], [/(?:^|[^\w])(?:\$|£)\s?\d[\d,]*k?/i, "a money amount — only OK if it’s your own real, labelled number"]];
export function scanClaims(...texts: (string | null | undefined)[]): { hard: string[]; soft: string[] } {
  const t = texts.filter(Boolean).join("\n");
  const uniq = (l: [RegExp, string][]) => [...new Set(l.filter(([r]) => r.test(t)).map(([, s]) => s))];
  return { hard: uniq(HARD), soft: uniq(SOFT) };
}
/** Spoken length at ~160 words/minute. */
export const estimateSeconds = (vo: string | null | undefined) => { const w = (vo ?? "").trim().split(/\s+/).filter(Boolean).length; return Math.round((w / 160) * 60); };

/** Why this item cannot be approved yet (empty array = ready). */
export function approvalBlockers(it: Item): string[] {
  const out: string[] = [];
  if (!it.hook?.trim()) out.push("Write the hook (first 1–2 seconds).");
  if (!it.voiceover?.trim()) out.push("Write the full voice-over.");
  const missing = CHECKS.filter((c) => !(it.checks as Record<string, unknown> | null)?.[c.key]);
  if (missing.length) out.push(`Tick every compliance check (${missing.length} left).`);
  const scan = scanClaims(it.hook, it.voiceover, it.tt_caption, it.yt_title, it.talking_points, it.cta);
  if (scan.hard.length) out.push(`Remove banned wording: ${scan.hard.join(", ")}.`);
  const secs = estimateSeconds(it.voiceover);
  if (secs > 50) out.push(`Voice-over is about ${secs}s — the format is 20–45s. Cut it.`);
  return out;
}
export type Transition = { ok: true } | { ok: false; reason: string };
/** Forward one step at a time; backwards any distance; approval needs the compliance gate; measured needs a post with views. */
export function canMove(from: Status, to: Status, it: Item, postsWithViews = 0): Transition {
  const a = STATUSES.indexOf(from), b = STATUSES.indexOf(to);
  if (b === a) return { ok: true };
  if (b < a) return { ok: true };
  if (b > a + 1) return { ok: false, reason: `Move to “${STATUS_LABEL[STATUSES[a + 1]]}” first.` };
  if (to === "approved") { const bl = approvalBlockers(it); if (bl.length) return { ok: false, reason: bl.join(" ") }; }
  if (to === "measured" && postsWithViews < 1) return { ok: false, reason: "Log at least one post with views before marking it measured." };
  return { ok: true };
}

export const CAPTION = { maxChars: 24, maxLines: 2 } as const;
/** Burned-in caption cards per the Andrew Builds style: ≤24 chars per line, ≤2 lines per card. */
export function splitCaptions(text: string): { cards: string[][]; tooLong: string[] } {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines: string[] = []; const tooLong: string[] = []; let cur = "";
  for (const w of words) {
    if (w.length > CAPTION.maxChars) tooLong.push(w);
    if (!cur) cur = w; else if ((cur + " " + w).length <= CAPTION.maxChars) cur += " " + w; else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  const cards: string[][] = []; for (let i = 0; i < lines.length; i += CAPTION.maxLines) cards.push(lines.slice(i, i + CAPTION.maxLines));
  return { cards, tooLong };
}

export type PostRow = { format: string; views: number; view_rate_3s: number | null; avg_watch_pct: number | null; saves: number; link_clicks: number; signups: number };
export const MIN_POSTS_TO_JUDGE = 10;
export function rollupFormats(posts: PostRow[]) {
  const avg = (xs: (number | null)[]) => { const v = xs.filter((x): x is number => x !== null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const rows = FORMAT_IDS.map((f) => {
    const ps = posts.filter((p) => p.format === f);
    const views = ps.reduce((a, p) => a + p.views, 0);
    return { format: f, posts: ps.length, views, rate3s: avg(ps.map((p) => p.view_rate_3s)), watch: avg(ps.map((p) => p.avg_watch_pct)),
      saveRate: views ? ps.reduce((a, p) => a + p.saves, 0) / views : null, clickRate: views ? ps.reduce((a, p) => a + p.link_clicks, 0) / views : null, signups: ps.reduce((a, p) => a + p.signups, 0), judged: ps.length >= MIN_POSTS_TO_JUDGE };
  });
  // Playbook: "Kill formats with weak hooks after 10 posts; double down on the top 2." Hook strength = average 3-second view rate.
  const judged = rows.filter((r) => r.judged && r.rate3s !== null).sort((a, b) => b.rate3s! - a.rate3s!);
  const verdict = (f: string): "double_down" | "review" | "too_early" | "keep" => {
    const r = rows.find((x) => x.format === f)!;
    if (!r.judged) return "too_early";
    const i = judged.findIndex((x) => x.format === f);
    if (i < 0) return "keep";
    if (i < 2) return "double_down";
    return judged.length >= 3 && r.rate3s! < judged[0].rate3s! * 0.75 ? "review" : "keep";
  };
  return rows.map((r) => ({ ...r, verdict: verdict(r.format) }));
}

export const DAILY_POST_TARGET = { tiktok: 3, youtube: 2 } as const;

/** The 33-idea bank from docs/CONTENT_ENGINE.md §6. `note` = a constraint that must be true before publishing. */
export const SEED_IDEAS: { n: number; f: FormatId; hook: string; note?: string }[] = [
  { n: 1, f: "F1", hook: "A 70% win rate can still lose money — here's the math" }, { n: 2, f: "F1", hook: "Your profit factor is hiding this" },
  { n: 3, f: "F1", hook: "Why 10 trades proves nothing" }, { n: 4, f: "F1", hook: "Average win vs average loss: the number most traders skip" },
  { n: 5, f: "F1", hook: "Max drawdown: the stat that predicts if you'll quit" }, { n: 6, f: "F2", hook: "Logging a forex trade in 60 seconds" },
  { n: 7, f: "F2", hook: "How I tag a losing trade so it teaches me something" }, { n: 8, f: "F2", hook: "Logging a trade with two partial exits" },
  { n: 9, f: "F2", hook: "What R-multiple means — on a real trade" }, { n: 10, f: "F2", hook: "Importing your broker CSV", note: "BLOCKED: do not publish until the CSV import UI actually ships." },
  { n: 11, f: "F3", hook: "The mistake that cost me the most (moving my stop)" }, { n: 12, f: "F3", hook: "Revenge trading looks like this in a journal" },
  { n: 13, f: "F3", hook: "Oversizing: how to see it in your data" }, { n: 14, f: "F3", hook: "Entering early — the pattern my journal exposed" },
  { n: 15, f: "F3", hook: "FOMO trades: tag them and count them" }, { n: 16, f: "F4", hook: "Day 1: building a trading journal because I kept repeating mistakes" },
  { n: 17, f: "F4", hook: "I wrote tests for my win-rate formula — here's what broke" }, { n: 18, f: "F4", hook: "A user-isolation bug I found before launch" },
  { n: 19, f: "F4", hook: "Why I made the app say 'not enough data' instead of a number" }, { n: 20, f: "F4", hook: "First signup / first feedback", note: "ONLY when real. Never invent activity." },
  { n: 21, f: "F5", hook: "How many trades before you trust a strategy?" }, { n: 22, f: "F5", hook: "Do I need to journal if I'm profitable?" },
  { n: 23, f: "F5", hook: "What's expectancy in plain English?" }, { n: 24, f: "F5", hook: "What's a good risk/reward ratio?" },
  { n: 25, f: "F5", hook: "Why do backtests fail in live trading?" }, { n: 26, f: "F3", hook: "Sessions: which of London/NY is actually your best?", note: "Use your own data only." },
  { n: 27, f: "F1", hook: "Fees are the stat you're not counting" }, { n: 28, f: "F5", hook: "Should beginners backtest first?", note: "Backtesting is NOT built — talk about the concept, don't show the feature." },
  { n: 29, f: "F4", hook: "What I'd tell my 1-year-in self about journaling (7 years in)" }, { n: 30, f: "F5", hook: "Weekly review in 10 minutes: the 3 questions", note: "The app has no weekly-review feature yet — don't imply it." },
  { n: 31, f: "F4", hook: "I'm going all-in on one business", note: "Your story; every claim must be true and approved by you." },
  { n: 32, f: "F4", hook: "Why a two-sided marketplace is brutal to market — and what I'm doing instead", note: "Only your own facts." },
  { n: 33, f: "F4", hook: "Day 1 of outreach: 25 DMs on TikTok, 25 on Instagram — what I'll measure" },
];
