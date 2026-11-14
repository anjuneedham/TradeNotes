/** Single source of truth for plan limits. Enforced server-side; UI reads the same table. */
export const PLANS = {
  free:    { name: "Free",    monthly: 0,  annual: 0,   tradeLimit: 50,   csvImport: false, backtesting: false, accounts: 1 },
  starter: { name: "Starter", monthly: 12, annual: 108, tradeLimit: 2000, csvImport: true,  backtesting: false, accounts: 2 },
  pro:     { name: "Pro",     monthly: 24, annual: 216, tradeLimit: null, csvImport: true,  backtesting: true,  accounts: 10 },
} as const;
/** Handypay hosted subscription links (public by design; contain no secrets). Plan activation is NOT driven by these links. */
export const CHECKOUT_URLS: Record<"starter" | "pro", string> = {
  starter: "https://checkout.handypay.me/subscribe/eyJ2IjoxLCJ1IjoiMTA5MDIyNDMzMDY2MTY0OTIxNDYyIiwiYSI6ImFjY3RfMVVaV2lRSDBrZTk3WXQ3aiIsImgiOiJwbGF0Zm9ybSIsInAiOiJwcm9kX1ZhbDZFZ0NzT1lRNGVCIiwiciI6InByaWNlXzFVWlpackhwNGp6YnRHYTR0OFM0bmJuYiJ9.IsDTT-xwREoZkR65voDSDy50r78hVcLAbVepi0biiPc",
  pro: "https://checkout.handypay.me/subscribe/eyJ2IjoxLCJ1IjoiMTA5MDIyNDMzMDY2MTY0OTIxNDYyIiwiYSI6ImFjY3RfMVVaV2lRSDBrZTk3WXQ3aiIsImgiOiJwbGF0Zm9ybSIsInAiOiJwcm9kX1ZhbDd2d0kzbTF2aTJEIiwiciI6InByaWNlXzFVWlphd0hwNGp6YnRHYTRBRUpqZWlGeSJ9.F1hyNFKypqpgTV8fY65sjzPGAnf-_C01QAmWhBNUP7g",
};
export type PlanId = keyof typeof PLANS;
// No discount or founding offer exists. Do not advertise one anywhere (site, DMs, videos) until it is
// built (Handypay coupon/price), tracked, and written up (terms), per docs/HQ.md "Offer rule".
