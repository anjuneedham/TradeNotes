/** Single source of truth for plan limits. Enforced server-side; UI reads the same table.
 *  Plan ids (free/starter/pro) are stored in tradenotes.subscriptions and must not change; only the display names were renamed (Standard, Premium). */
export const PLANS = {
  free:    { name: "Free",    monthly: 0,  annual: 0,   tradeLimit: 50,   csvImport: false, backtesting: false, accounts: 1,  screenshotQuotaMB: 0,    calendar: false, reviews: false, playbook: false },
  starter: { name: "Standard", monthly: 12, annual: 120, tradeLimit: 2000, csvImport: true,  backtesting: false, accounts: 2,  screenshotQuotaMB: 500,  calendar: true,  reviews: true,  playbook: true },
  pro:     { name: "Premium", monthly: 24, annual: 240, tradeLimit: null, csvImport: true,  backtesting: true,  accounts: 10, screenshotQuotaMB: 2048, calendar: true,  reviews: true,  playbook: true },
} as const;
/** Free trial on every paid plan checkout (the HandyPay products below are configured with the same 14 days; we also send it with the session). The founding-member price is an inline custom amount and has NO trial. */
export const TRIAL_DAYS = 14;
/** HandyPay subscription PRICES (identifiers, not secrets). Each product in HandyPay has the 14-day trial. Verified on the hosted pages 2026-11-13: starter month = US$12, pro month = US$24, starter year = US$120, pro year = US$240. */
export const HANDYPAY_PRICE_IDS = {
  starter: { month: "price_1UbNwWHp4jzbtGa4LkgU88GF", year: "price_1UbOGwHp4jzbtGa4xlIRf8KQ" },
  pro: { month: "price_1UbOC1Hp4jzbtGa4xW3b1hxF", year: "price_1UbOJMHp4jzbtGa4rCO5bFQO" },
} as const;
/** Handypay hosted subscription links (public by design; contain no secrets). Fallback when the API is not configured; each carries the 14-day trial. Plan activation is NOT driven by these links. */
export const CHECKOUT_LINKS = {
  starter: {
    month: "https://checkout.handypay.me/subscribe/eyJ2IjoxLCJ1IjoiMTA5MDIyNDMzMDY2MTY0OTIxNDYyIiwiYSI6ImFjY3RfMVVaV2lRSDBrZTk3WXQ3aiIsImgiOiJwbGF0Zm9ybSIsInAiOiJwcm9kX1ZjZENhTDJsbjhjMkgwIiwiciI6InByaWNlXzFVYk53V0hwNGp6YnRHYTRMa2dVODhHRiJ9.X1YDiQNV0bbWe3tF07zn9VwC9UtA_iFY9rW-Z39S5i8",
    year: "https://checkout.handypay.me/subscribe/eyJ2IjoxLCJ1IjoiMTA5MDIyNDMzMDY2MTY0OTIxNDYyIiwiYSI6ImFjY3RfMVVaV2lRSDBrZTk3WXQ3aiIsImgiOiJwbGF0Zm9ybSIsInAiOiJwcm9kX1ZjZFlUdGRFVHlibHNJIiwiciI6InByaWNlXzFVYk9Hd0hwNGp6YnRHYTR4bElSZjhLUSJ9.6i6EUFTr5XtIDapg12YrNqI2IEgudjFouPxfAcLycCc",
  },
  pro: {
    month: "https://checkout.handypay.me/subscribe/eyJ2IjoxLCJ1IjoiMTA5MDIyNDMzMDY2MTY0OTIxNDYyIiwiYSI6ImFjY3RfMVVaV2lRSDBrZTk3WXQ3aiIsImgiOiJwbGF0Zm9ybSIsInAiOiJwcm9kX1ZjZFN0TGF3YkFkc3dLIiwiciI6InByaWNlXzFVYk9DMUhwNGp6YnRHYTR4VzNiMWh4RiJ9.ptzWI3eNmafhU-trekzowvqrX6fBRtgUeJLmd45Ev08",
    year: "https://checkout.handypay.me/subscribe/eyJ2IjoxLCJ1IjoiMTA5MDIyNDMzMDY2MTY0OTIxNDYyIiwiYSI6ImFjY3RfMVVaV2lRSDBrZTk3WXQ3aiIsImgiOiJwbGF0Zm9ybSIsInAiOiJwcm9kX1ZjZGFRZE9VaDI5RjZGIiwiciI6InByaWNlXzFVYk9KTUhwNGp6YnRHYTRyQ081YkZRTyJ9._50OUEXzQZX1SnEpzC063J945XcJJ_44AkCaKl4zJ4s",
  },
} as const;
export type PlanId = keyof typeof PLANS;
export const FOUNDING_OFFER = { seats: 10, discountPct: 50, months: 12 };
export type Interval = "month" | "year";
export const checkoutLink = (plan: "starter" | "pro", interval: Interval) => CHECKOUT_LINKS[plan][interval];
export const isInterval = (v: unknown): v is Interval => v === "month" || v === "year";
/** Annual = 10 x monthly ("2 months free"). Whole dollars. */
export const ANNUAL_MONTHS_FREE = 2;
/** Full list price in cents for a paid plan and billing interval. */
export const priceCents = (plan: Exclude<PlanId, "free">, interval: Interval) => (interval === "year" ? PLANS[plan].annual : PLANS[plan].monthly) * 100;
