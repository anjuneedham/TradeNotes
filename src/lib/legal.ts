/**
 * Single source of truth for the facts the legal pages need. Fill these in; the pages render from here.
 * Values starting with "TODO" are treated as NOT filled (the pages show a visible warning and `npm run check:legal` fails).
 * NOTE: this is not legal advice. `counselReviewed` stays false until a qualified lawyer has reviewed the wording.
 */
export const LEGAL = {
  productName: "TradeNotes",
  /** Legal or trading name of the person/company operating TradeNotes (the "data controller"). */
  businessName: "Yardscale Digital (App Studio)",
  /** Where users contact you for support, privacy requests, cancellations and refunds. */
  supportEmail: "support@tradenotes.dev",
  /** Country the business operates from. */
  country: "Jamaica",
  /** Optional postal address (leave empty to omit). */
  address: "Independence City, St Catherine, Jamaica",
  /** Optional Jamaica Data Protection Act registration number, once you have one (leave empty to omit). */
  dpaRegistrationNumber: "",
  /** Law that governs the Terms. CONFIRM WITH COUNSEL. */
  governingLaw: "the laws of Jamaica",
  /** Days after FIRST payment during which a full refund is given on request. 0 = no refunds except where law requires. FOUNDER DECISION. */
  refundDays: 14,
  /** Days within which a verified deletion request is completed. FOUNDER DECISION (a promise you must keep). */
  deletionDays: 30,
  /** Payment provider shown to customers. */
  paymentProvider: "Handypay",
  effectiveDate: "11 November 2026",
  /** Set to true only after a qualified lawyer has reviewed these pages (it has NOT been reviewed). */
  counselReviewed: false,
  /** The operator states, in the pages themselves, that it accepts responsibility and that no lawyer has reviewed the wording. */
  responsibilityStatement: "Yardscale Digital (App Studio) accepts full responsibility for these documents and for how it handles your data. These documents were written without review by a lawyer. If anything here is unclear or you think it is wrong, tell us and we will fix it.",
} as const;

export const isFilled = (v: string) => v.trim() !== "" && !v.trim().toUpperCase().startsWith("TODO");
export const missingLegalFields = (): string[] => [
  ...(isFilled(LEGAL.businessName) ? [] : ["businessName"]),
  ...(isFilled(LEGAL.supportEmail) ? [] : ["supportEmail"]),
];
export const legalComplete = () => missingLegalFields().length === 0;
/** Text to print where a required value is still missing (visible on purpose, so it can't ship unnoticed). */
export const show = (v: string, label: string) => (isFilled(v) ? v : `[${label} — not set yet]`);
