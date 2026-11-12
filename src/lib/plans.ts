/** Single source of truth for plan limits. Enforced server-side; UI reads the same table.
 *  Plan ids (free/starter/pro) are stored in tradenotes.subscriptions and must not change; only the display names were renamed (Standard, Premium). */
export const PLANS = {
  free:    { name: "Free",    monthly: 0,  annual: 0,   tradeLimit: 50,   csvImport: false, backtesting: false, accounts: 1,  screenshotQuotaMB: 0 },
  starter: { name: "Standard", monthly: 12, annual: 120, tradeLimit: 2000, csvImport: true,  backtesting: false, accounts: 2,  screenshotQuotaMB: 500 },
  pro:     { name: "Premium", monthly: 24, annual: 240, tradeLimit: null, csvImport: true,  backtesting: true,  accounts: 10, screenshotQuotaMB: 2048 },
} as const;
/** Handypay hosted subscription links (public by design; contain no secrets). Plan activation is NOT driven by these links. */
export const CHECKOUT_URLS: Record<"starter" | "pro", string> = {
  starter: "https://checkout.handypay.me/subscribe/eyJ2IjoxLCJ1IjoiMTA5MDIyNDMzMDY2MTY0OTIxNDYyIiwiYSI6ImFjY3RfMVVaV2lRSDBrZTk3WXQ3aiIsImgiOiJwbGF0Zm9ybSIsInAiOiJwcm9kX1ZhbDZFZ0NzT1lRNGVCIiwiciI6InByaWNlXzFVWlpackhwNGp6YnRHYTR0OFM0bmJuYiJ9.IsDTT-xwREoZkR65voDSDy50r78hVcLAbVepi0biiPc",
  pro: "https://checkout.handypay.me/subscribe/eyJ2IjoxLCJ1IjoiMTA5MDIyNDMzMDY2MTY0OTIxNDYyIiwiYSI6ImFjY3RfMVVaV2lRSDBrZTk3WXQ3aiIsImgiOiJwbGF0Zm9ybSIsInAiOiJwcm9kX1ZhbDd2d0kzbTF2aTJEIiwiciI6InByaWNlXzFVWlphd0hwNGp6YnRHYTRBRUpqZWlGeSJ9.F1hyNFKypqpgTV8fY65sjzPGAnf-_C01QAmWhBNUP7g",
};
export type PlanId = keyof typeof PLANS;
export const FOUNDING_OFFER = { seats: 10, discountPct: 50, months: 12 };
export type Interval = "month" | "year";
export const isInterval = (v: unknown): v is Interval => v === "month" || v === "year";
/** Annual = 10 x monthly ("2 months free"). Whole dollars. */
export const ANNUAL_MONTHS_FREE = 2;
/** Full list price in cents for a paid plan and billing interval. */
export const priceCents = (plan: Exclude<PlanId, "free">, interval: Interval) => (interval === "year" ? PLANS[plan].annual : PLANS[plan].monthly) * 100;
