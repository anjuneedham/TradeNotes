/** Single source of truth for plan limits. Enforced server-side; UI reads the same table. */
export const PLANS = {
  free:    { name: "Free",    monthly: 0,  annual: 0,   tradeLimit: 50,   csvImport: false, backtesting: false, accounts: 1 },
  starter: { name: "Starter", monthly: 12, annual: 108, tradeLimit: 2000, csvImport: true,  backtesting: false, accounts: 2 },
  pro:     { name: "Pro",     monthly: 24, annual: 216, tradeLimit: null, csvImport: true,  backtesting: true,  accounts: 10 },
} as const;
export type PlanId = keyof typeof PLANS;
export const FOUNDING_OFFER = { seats: 10, discountPct: 50, months: 12 };
