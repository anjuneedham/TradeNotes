import { PLANS, TRIAL_DAYS, FOUNDING_OFFER, aiQuestions } from "./plans";

/**
 * Data for the marketing funnel pages (features, import, compare, guides). Copy here must only describe what exists in code
 * today (see docs/PAGE_BRIEF_TEMPLATE.md). Plan numbers are always read from plans.ts, never typed in.
 */
export type NextLink = { href: string; label: string };

/** Shared, honest one-liners reused across pages. */
export const OFFER = {
  free: `Free plan: up to ${PLANS.free.tradeLimit} trades, no card.`,
  paid: `${PLANS.starter.name} $${PLANS.starter.monthly}/month or ${PLANS.pro.name} $${PLANS.pro.monthly}/month, each with a ${TRIAL_DAYS}-day free trial.`,
  founding: `Founding offer: the first ${FOUNDING_OFFER.seats} paying members get ${FOUNDING_OFFER.discountPct}% off for ${FOUNDING_OFFER.months} months (no trial on the founding price).`,
};
export const NOT_AFFILIATED = "TradeNotes is not affiliated with, endorsed by or sponsored by any prop firm, broker or platform named on this site. Names are used only to describe compatibility.";

export interface Feature { slug: string; name: string; title: string; description: string; plan: string; points: string[]; next: NextLink[] }
const paidFrom = `${PLANS.starter.name} and ${PLANS.pro.name}`;

export const FEATURES: Feature[] = [
  { slug: "broker-import", name: "Broker and CSV import", title: "Import trades from your broker or any CSV", plan: `${paidFrom} (Free logs trades by hand)`,
    description: "Upload a broker export or any CSV. TradeNotes groups fills into trades, handles time zones, skips duplicates and lets you roll back an import.",
    points: ["Recognises MetaTrader 4/5, cTrader, TradingView, Tradovate, NinjaTrader, Thinkorswim, Interactive Brokers, Webull, Binance and Bybit exports.", "Or map any CSV's columns yourself.", "Fills are grouped into trades; duplicates already in your journal are skipped.", "Preview before importing, and roll back any import afterwards.", "Formats were built from sample files, not every real export. If yours does not import cleanly, tell us."],
    next: [{ href: "/import", label: "See every supported platform" }, { href: "/features/analytics", label: "What you see after importing" }, { href: "/pricing", label: "Plans" }] },
  { slug: "analytics", name: "Analytics and R-multiples", title: "Trading analytics in R, after fees", plan: "Every plan",
    description: "Win rate, profit factor, expectancy, drawdown and R-multiples, broken down by strategy, session, instrument, weekday, mistake and emotion.",
    points: ["Eight core metrics and an equity curve, all after fees.", "Record a stop and every result is also shown in R.", "R distribution, weekday-by-hour heatmap, results by time held, drawdown and recovery.", "What each mistake tag cost you, in money and R.", "Sample-size warnings so a 6-trade streak is not mistaken for an edge."],
    next: [{ href: "/learn/r-multiple-prop-firm-challenge", label: "R-multiple explained" }, { href: "/demo/analytics", label: "Analytics on sample data" }, { href: "/features/ai-coach", label: "AI Coach" }] },
  { slug: "calendar-and-reviews", name: "Calendar and reviews", title: "Trading calendar and daily, weekly, monthly reviews", plan: paidFrom,
    description: "A month grid of daily P&L and trade count, plus a five-part review template with your numbers filled in.",
    points: ["Daily profit or loss and trade count in your time zone, with weekly totals.", "Click a day to see its trades.", "Reviews: what worked, what to repeat, mistakes, rule breaks, next plan.", "Your numbers are filled in; your review history is kept.", "Signs and sizes are written out, so it does not depend on colour."],
    next: [{ href: "/learn/what-to-journal-during-a-prop-firm-evaluation", label: "What to journal during an evaluation" }, { href: "/features/playbook", label: "Playbook and rules" }, { href: "/free/review-checklist", label: "Free 30-trade review checklist" }] },
  { slug: "playbook", name: "Playbook and rule adherence", title: "A trading playbook that checks if you followed your rules", plan: paidFrom,
    description: "An entry checklist per strategy, ticked on each trade, with results compared when you followed your rules and when you did not.",
    points: ["Write an entry checklist for each strategy.", "Tick it when you log a trade.", "See results with rules followed vs. broken, side by side.", "Pairs with mistake tags to show what rule breaks cost."],
    next: [{ href: "/learn/why-prop-firm-challenges-fail-rule-breaks", label: "Why challenges fail from rule breaks" }, { href: "/features/calendar-and-reviews", label: "Calendar and reviews" }, { href: "/prop-firm-traders", label: "For prop-firm traders" }] },
  { slug: "ai-coach", name: "AI Coach", title: "An AI coach that answers with your own trade numbers", plan: `Every plan (Free about ${aiQuestions("free")} questions a month to try)`,
    description: "Ask about your own trades in plain English. The coach looks up your stats, tags and playbook results and answers with your numbers.",
    points: ["\"Why was last week red?\", \"What is my most expensive habit?\", \"Which setup should I drop?\"", `About ${aiQuestions("free")} questions a month on Free, ${aiQuestions("starter")} on ${PLANS.starter.name}, ${aiQuestions("pro")} on ${PLANS.pro.name}. Refilled on the 1st.`, "It reads your journal; it does not give signals, predictions or financial advice."],
    next: [{ href: "/features/analytics", label: "Analytics and R" }, { href: "/pricing", label: "Plans and coach allowance" }, { href: "/how-it-works", label: "How it works" }] },
  { slug: "accounts", name: "Multiple accounts", title: "Track several trading accounts, separately or combined", plan: `Free ${PLANS.free.accounts}, ${PLANS.starter.name} ${PLANS.starter.accounts}, ${PLANS.pro.name} ${PLANS.pro.accounts}`,
    description: "Keep an evaluation, a funded account and a personal account apart, or view them combined.",
    points: ["Switch between accounts or view them combined.", "Every filter and metric works per account.", `Up to ${PLANS.free.accounts} account on Free, ${PLANS.starter.accounts} on ${PLANS.starter.name}, ${PLANS.pro.accounts} on ${PLANS.pro.name}.`],
    next: [{ href: "/prop-firm-traders", label: "For prop-firm traders" }, { href: "/features/share-links", label: "Share links" }, { href: "/pricing", label: "Plans" }] },
  { slug: "share-links", name: "Share links", title: "Share a read-only trading report you can revoke", plan: "Every plan",
    description: "A public, read-only report of your ratios and equity curve shape. Money amounts are hidden unless you choose to show them.",
    points: ["Shows ratios and the equity curve shape; profit and loss only if you choose.", "Never shows notes, instruments, strategy or account names, email, screenshots or individual trade dates.", "Revoke at any time; expires after 7 to 90 days."],
    next: [{ href: "/features/accounts", label: "Multiple accounts" }, { href: "/demo", label: "See the demo" }, { href: "/how-it-works", label: "How it works" }] },
];

export interface Platform { slug: string; name: string; presetIds: string[]; note?: string }
/** One per format with a tested importer and fixture (src/lib/import-fixtures). `formats`/`help` text is read live from PRESETS. */
export const PLATFORMS: Platform[] = [
  { slug: "mt4", name: "MetaTrader 4", presetIds: ["metatrader4", "metatrader"] },
  { slug: "mt5", name: "MetaTrader 5", presetIds: ["metatrader"] },
  { slug: "ctrader", name: "cTrader", presetIds: ["ctrader"] },
  { slug: "tradingview", name: "TradingView", presetIds: ["tradingview"], note: "This is the Paper Trading history export." },
  { slug: "tradovate", name: "Tradovate", presetIds: ["tradovate"] },
  { slug: "ninjatrader", name: "NinjaTrader", presetIds: ["ninjatrader"] },
  { slug: "thinkorswim", name: "Thinkorswim", presetIds: ["thinkorswim"] },
  { slug: "ibkr", name: "Interactive Brokers", presetIds: ["ibkr"] },
  { slug: "webull", name: "Webull", presetIds: ["webull"] },
  { slug: "binance", name: "Binance", presetIds: ["binance-spot", "binance-futures"] },
  { slug: "bybit", name: "Bybit", presetIds: ["bybit-spot", "bybit-derivatives"] },
];

export interface Competitor { slug: string; name: string; site: string; checked: string; pricing?: { text: string; source: string }; }
/** Only facts fetched from the competitor's own pricing page on `checked`. If a page could not be read, `pricing` is omitted. */
export const COMPETITORS: Competitor[] = [
  { slug: "tradezella", name: "TradeZella", site: "https://www.tradezella.com", checked: "2026-11-16", pricing: { text: "Essential $35/month, Pro $59/month, Ultra $99/month (lower per-month prices when billed yearly). No free plan or free trial was listed.", source: "https://www.tradezella.com/pricing" } },
  { slug: "tradersync", name: "TraderSync", site: "https://tradersync.com", checked: "2026-11-16" },
  { slug: "tradervue", name: "Tradervue", site: "https://www.tradervue.com", checked: "2026-11-16" },
  { slug: "edgewonk", name: "Edgewonk", site: "https://edgewonk.com", checked: "2026-11-16", pricing: { text: "$35 billed monthly or $197 billed every 12 months, with a 14-day money-back guarantee. No free plan or free trial was listed.", source: "https://edgewonk.com/pricing" } },
  { slug: "tradesviz", name: "TradesViz", site: "https://www.tradesviz.com", checked: "2026-11-16", pricing: { text: "Basic free; Pro $13.99/month and Platinum $20.99/month (shown as discounts from $19.99 and $29.99), with a 7-day free trial on paid plans.", source: "https://www.tradesviz.com/pricing/" } },
];

export interface Guide { slug: string; title: string; description: string; sections: [string, string][]; next: NextLink[] }
export const GUIDES: Guide[] = [
  { slug: "daily-loss-limit-in-r", title: "Your daily loss limit, measured in R", description: "Turn a prop firm's daily loss limit into a number of losing trades, so you know before the open when your day is over.",
    sections: [
      ["The idea", "A daily loss limit in dollars is hard to feel mid-session. Divide it by your risk per trade (1R) and it becomes a count: \"I can take N full losses today.\" That count is the number to plan around."],
      ["Worked example", "Say a $50,000 evaluation has a $1,000 daily loss limit and you risk $250 per trade. $1,000 ÷ $250 = 4R. Four full losses end the day. At $125 risk it becomes 8R. Use your own firm's rules; they differ between firms and change over time."],
      ["Leave a buffer", "Slippage, fees and a trade that loses more than 1R all eat into the limit. Many traders stop one loss before the limit (for example after 3R of a 4R limit) instead of trading right up to it."],
      ["Check it in your journal", "Log a stop on every trade and your journal shows your real loss per trade in R. If your losers average −1.3R, your 4R limit is really about 3 losses."],
    ],
    next: [{ href: "/learn/r-multiple-prop-firm-challenge", label: "R-multiple calculator" }, { href: "/features/analytics", label: "Analytics in R" }, { href: "/prop-firm-traders", label: "For prop-firm traders" }] },
  { slug: "what-to-journal-during-a-prop-firm-evaluation", title: "What to journal during a prop firm evaluation", description: "A short list of what to record on every trade during a challenge, and what to review at the end of each day.",
    sections: [
      ["On every trade", "Instrument, direction, size, entry, stop, exit and fees. The setup or strategy name. One line on why you took it, and one on how you felt. Any mistake, tagged (moved stop, oversized, revenge trade)."],
      ["At the end of each day", "Today's result in R, how much of the daily limit you used, whether you followed your entry checklist on every trade, and one thing to repeat or stop tomorrow."],
      ["Each week", "Results by setup and by session, your costliest mistake tag, and your distance to the target and to the max loss, both in R."],
      ["Keep it fast", "If logging takes too long you will stop doing it. Aim for under a minute per trade and a five-minute daily review."],
    ],
    next: [{ href: "/free", label: "Free journal template" }, { href: "/features/calendar-and-reviews", label: "Calendar and reviews" }, { href: "/learn/daily-loss-limit-in-r", label: "Daily loss limit in R" }] },
  { slug: "why-prop-firm-challenges-fail-rule-breaks", title: "Why prop firm challenges fail: rule breaks, not strategy", description: "Common ways evaluations end early, and how a journal makes rule breaks visible before they cost the account.",
    sections: [
      ["The usual pattern", "Many failed evaluations are not a strategy with no edge. They are one or two days where a trader broke their own rules: oversized after a loss, moved a stop, or kept trading past their planned stop for the day."],
      ["Why it is hard to see", "Without a record, a bad day feels like bad luck. Tag the mistake on each trade and the total cost of each habit becomes a number you can look at."],
      ["Make rules checkable", "Write your entry rules as a short checklist and tick it on every trade. Then compare results when you followed it against when you did not."],
      ["No guarantees", "A journal does not make anyone pass a challenge. It shows what you actually did, so you can decide what to change."],
    ],
    next: [{ href: "/features/playbook", label: "Playbook and rule adherence" }, { href: "/learn/what-to-journal-during-a-prop-firm-evaluation", label: "What to journal" }, { href: "/demo", label: "See the demo" }] },
];

/** Changelog: only items present in code/docs today. "Not available yet" items are never promised a date. */
export const SHIPPED: string[] = ["Manual trade entry with partial exits, fees, forex lots and futures/options specs", "Dashboard, equity curve and deeper analytics with R-multiples", "Filters on every view", "Broker and CSV import (11 platforms, roll back any import)", "Calendar and daily/weekly/monthly reviews", "Playbook and rule adherence", "AI Coach", "TradeNotes Score and automatic insights", "Multiple accounts", "Strategy comparison and manual backtest log", "Read-only share links", "Mobile quick-log", "CSV export of your trades", "Public demo with sample data", "Annual plans, a free trial on paid plans and a founding-member offer"];
export const NOT_YET: string[] = ["Broker auto-sync (import is by file upload today)", "Chart replay or historical market data", "Reminder emails", "News or economic calendar"];

export const HUB_LINKS: NextLink[] = [
  { href: "/prop-firm-traders", label: "For prop-firm traders" }, { href: "/features", label: "Features" }, { href: "/import", label: "Broker import" },
  { href: "/compare", label: "Compare" }, { href: "/how-it-works", label: "How it works & FAQ" }, { href: "/changelog", label: "Changelog" },
  { href: "/learn", label: "Learn" }, { href: "/free", label: "Free tools" }, { href: "/partners", label: "Partners" },
];

/** Every public path these pages add (sitemap + link tests read it). */
export const FUNNEL_PATHS: string[] = ["/prop-firm-traders", "/features", ...FEATURES.map((f) => `/features/${f.slug}`), "/import", ...PLATFORMS.map((p) => `/import/${p.slug}`), "/compare", ...COMPETITORS.map((c) => `/compare/${c.slug}`), "/how-it-works", "/changelog", ...GUIDES.map((g) => `/learn/${g.slug}`)];
