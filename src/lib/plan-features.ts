import { PLANS, type PlanId } from "./plans";
import { remindersLive } from "./reminders";

/**
 * Presentation data for pricing and billing. Limits are read from PLANS (the enforced source of truth);
 * nothing here grants access. `now` rows exist in the product today; `dev` rows are NOT built and must
 * always render under an "In development — not available yet" heading.
 */
export const PLAN_ORDER: PlanId[] = ["free", "starter", "pro"];
const limit = (id: PlanId) => (PLANS[id].tradeLimit === null ? "Unlimited" : PLANS[id].tradeLimit.toLocaleString("en-US"));
type Cell = string | boolean;
export interface FeatureRow { label: string; detail?: string; cells: Record<PlanId, Cell> }
const all = (v: Cell): Record<PlanId, Cell> => ({ free: v, starter: v, pro: v });

export const FEATURES_NOW: FeatureRow[] = [
  { label: "Trades you can store", detail: "Counted across your whole journal.", cells: { free: limit("free"), starter: limit("starter"), pro: limit("pro") } },
  { label: "Manual trade entry", detail: "Long/short, partial exits, fees, forex lots, other quote currencies.", cells: all(true) },
  { label: "Risk plan and R-multiples", detail: "Stop, target, planned risk, reward : risk.", cells: all(true) },
  { label: "Notes, emotion and mistake tags", cells: all(true) },
  { label: "Dashboard", detail: "Eight core metrics, equity curve, what to review.", cells: all(true) },
  { label: "Filters on every view", detail: "Date range, account, strategy, instrument, direction, tags and session on the dashboard, analytics, journal and calendar. The filter lives in the page address.", cells: all(true) },
  { label: "Analytics breakdowns", detail: "By strategy, instrument, session, direction, weekday, mistake and emotion.", cells: all(true) },
  { label: "Deeper analytics", detail: "Profit factor with sample-size warnings, drawdown and recovery, R-multiple distribution, weekday-by-hour heatmap, results by time held, and what each mistake cost.", cells: all(true) },
  { label: "Plain-English explanations and metric guide", cells: all(true) },
  { label: "Broker import", detail: "Recognises MetaTrader 4/5, cTrader, TradingView, Tradovate, NinjaTrader, Thinkorswim, Interactive Brokers, Webull, Binance and Bybit exports, or map any CSV yourself. Time zones, fills grouped into trades, duplicates skipped, roll back any import.", cells: { free: false, starter: true, pro: true } },
  { label: "Futures, options, forex and crypto specs", detail: "Contract point values, option multipliers, pips and lots handled for you.", cells: all(true) },
  { label: "Multiple trading accounts", detail: "Switch between accounts or view them combined.", cells: { free: "1", starter: `Up to ${PLANS.starter.accounts}`, pro: `Up to ${PLANS.pro.accounts}` } },
  { label: "Calendar view", detail: "A month grid of daily profit or loss and trade count in your time zone, weekly totals, and a click through to that day's trades. Not colour-dependent: signs and sizes are written out.", cells: { free: PLANS.free.calendar, starter: PLANS.starter.calendar, pro: PLANS.pro.calendar } },
  { label: "Daily, weekly and monthly reviews", detail: "A five-part template (what worked, what to repeat, mistakes, rule breaks, next plan) with your numbers filled in, and a history.", cells: { free: PLANS.free.reviews, starter: PLANS.starter.reviews, pro: PLANS.pro.reviews } },
  { label: "Playbook and rule adherence", detail: "An entry checklist per strategy, ticked on each trade, with your results compared when you followed your rules and when you did not.", cells: { free: PLANS.free.playbook, starter: PLANS.starter.playbook, pro: PLANS.pro.playbook } },
  { label: "Strategy comparison", detail: "Two to four strategies side by side: closed trades, win rate, expectancy, profit factor, average R and maximum drawdown, each with a small-sample warning, and their equity curves on one chart. Real trades only, with the same filters.", cells: { free: PLANS.free.comparison, starter: PLANS.starter.comparison, pro: PLANS.pro.comparison } },
  { label: "Manual backtest log", detail: "Type in hypothetical trades from your own chart work and get the same metrics. Always labelled HYPOTHETICAL, kept apart from your real results, and in its own export. You enter every trade yourself: TradeNotes does not supply market data and has no chart playback.", cells: { free: PLANS.free.backtesting, starter: PLANS.starter.backtesting, pro: PLANS.pro.backtesting } },
  { label: "Share links", detail: "A public, read-only report you can revoke at any time. It shows totals and an equity curve only: no notes, instruments, strategy or account names, email, screenshots or the dates of individual trades. Expires after 7 to 90 days.", cells: { free: PLANS.free.shareLinks, starter: PLANS.starter.shareLinks, pro: PLANS.pro.shareLinks } },
  { label: "Mobile quick-log", detail: "Six fields and big buttons for logging a trade from your phone, starting from your last trade, with add-to-home-screen. Needs an internet connection.", cells: all(true) },
  { label: "Export all your trades (CSV)", detail: "Trades only. Reviews, playbook rules and screenshots are not in the export.", cells: all(true) },
];
const SCREENSHOTS: FeatureRow = { label: "Trade screenshots", detail: `Up to 5 per trade, paste from clipboard. Storage: ${PLANS.starter.screenshotQuotaMB} MB on ${PLANS.starter.name}, ${PLANS.pro.screenshotQuotaMB / 1024} GB on ${PLANS.pro.name}.`, cells: { free: false, starter: true, pro: true } };
/** Screenshots are built and tested, but only "available now" once the owner has configured storage (docs/NEXT_BUILD_BRIEF.md §3c). */
export const screenshotsLive = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
/** The reviews row says whether the weekly reminder email exists, from the same switch that shows the setting (remindersLive), so copy cannot get ahead of what is built and configured. */
const withReminderNote = (rows: FeatureRow[]): FeatureRow[] => rows.map((r) => (r.label === "Daily, weekly and monthly reviews" ? { ...r, detail: `${r.detail} ${remindersLive() ? "Optional weekly reminder email, off by default." : "Reminder emails are not available yet."}` } : r));
/** Screenshots on hypothetical trades exist only where screenshots themselves are switched on (same switch, same storage quota). */
const withBacktestShots = (rows: FeatureRow[]): FeatureRow[] => rows.map((r) => (r.label === "Manual backtest log" && screenshotsLive() ? { ...r, detail: `${r.detail} Screenshots on hypothetical trades count toward your screenshot storage.` } : r));
export const featuresNow = (): FeatureRow[] => withBacktestShots(withReminderNote(screenshotsLive() ? [...FEATURES_NOW, SCREENSHOTS] : FEATURES_NOW));
export const featuresDev = (): FeatureRow[] => (screenshotsLive() ? FEATURES_DEV : [SCREENSHOTS, ...FEATURES_DEV]);

/** Nothing else is promised. (Chart replay needs a paid market-data licence, which the owner has not approved, so it is not listed.) */
export const FEATURES_DEV: FeatureRow[] = [];
export const PLAN_BLURB: Record<PlanId, string> = {
  free: "Everything you need to start journaling and see your numbers.",
  starter: "The full journal with room for an active trader's history, plus the calendar, reviews and playbook.",
  pro: "No trade limit, plus strategy comparison and a manual backtest log for testing ideas on paper.",
};
export const planHeadline = (id: PlanId) => (id === "free" ? `Up to ${limit(id)} trades` : id === "starter" ? `Up to ${limit(id)} trades` : "Unlimited trades");

/** One sentence used by pricing/landing/billing copy, so all three say the same true thing. */
/** What Premium adds on top of Standard (each is enforced on the server from the same PLANS flags). */
export const premiumAddsText = () => "unlimited trades, up to " + PLANS.pro.accounts + " trading accounts, strategy comparison and the manual backtest log";
export const paidAddsText = () => `a higher trade limit, broker import, more trading accounts, the calendar, daily/weekly/monthly reviews and the playbook${screenshotsLive() ? " and trade screenshots" : ""}`;
