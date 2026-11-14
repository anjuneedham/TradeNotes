/** Evening daily report (docs/DAILY_OPERATIONS.md) as copy-paste text. */
export type Snapshot = {
  day: string; signups: number; signupsBySource: { source: string; signups: number; activated: number }[]; activations: number; paying: number; mrr: number; foundingUsed: number; foundingSeats: number;
  dms: { tiktok: number; instagram: number }; followups: number; replies: number; demos: number; posts: { tiktok: number; youtube: number; instagram: number }; views: number;
  adSpend: number; adClicks: number; openFeedback: number;
};
export function reportText(s: Snapshot, manual: { blockers?: string | null; bugs?: string | null; notes?: string | null }): string {
  const src = s.signupsBySource.length ? s.signupsBySource.map((x) => `${x.source}: ${x.signups} (${x.activated} logged a trade)`).join(", ") : "none";
  return [
    `TradeNotes daily report — ${s.day}`,
    `Signups: ${s.signups} · by source: ${src}`,
    `Activations (≥1 trade logged, total): ${s.activations} · Paying: ${s.paying} · MRR: $${s.mrr.toFixed(2)} · Founding seats: ${s.foundingUsed}/${s.foundingSeats}`,
    `Outreach: DMs TikTok ${s.dms.tiktok} / Instagram ${s.dms.instagram} · follow-ups ${s.followups} · replies ${s.replies} · demos ${s.demos}`,
    `Posts: TikTok ${s.posts.tiktok} · Shorts ${s.posts.youtube} · Instagram ${s.posts.instagram} · views logged ${s.views}`,
    `Paid: spend $${s.adSpend.toFixed(2)} · clicks ${s.adClicks}${s.adClicks ? ` · cost/click $${(s.adSpend / s.adClicks).toFixed(2)}` : ""}`,
    `Open feedback/bugs: ${s.openFeedback}`,
    `Bugs today: ${manual.bugs?.trim() || "none logged"}`,
    `Blockers: ${manual.blockers?.trim() || "none"}`,
    ...(manual.notes?.trim() ? [`Notes: ${manual.notes.trim()}`] : []),
  ].join("\n");
}
export const pct = (n: number | null, d = 0) => (n === null ? "—" : `${(n * 100).toFixed(d)}%`);

/** Launch gates seeded into hq.tasks (from LAUNCH_TOMORROW.md / READINESS_REVIEW.md). seed_key keeps seeding idempotent. */
export const SEED_TASKS: { key: string; area: string; title: string; detail: string; owner: string; sort: number }[] = [
  { key: "gate-domain", area: "launch", sort: 10, owner: "you", title: "Register tradenotes.dev and attach it in Vercel", detail: "Vercel → Domains. Then set BETTER_AUTH_URL + NEXT_PUBLIC_SITE_URL. Also attach hq.tradenotes.dev to the HQ project." },
  { key: "gate-resend", area: "launch", sort: 20, owner: "you", title: "Verify the sending domain in Resend and set RESEND_API_KEY + EMAIL_FROM", detail: "Needed for email confirmation, password reset and HQ nurture emails. See docs/RESEND_SETUP.md." },
  { key: "gate-legal", area: "launch", sort: 30, owner: "you", title: "Fill businessName + supportEmail in src/lib/legal.ts (and HQ Settings)", detail: "Legal pages show a warning until filled; HQ nurture email is blocked until the sender identity is set. Not legal advice — get counsel review." },
  { key: "gate-vercel-pro", area: "launch", sort: 40, owner: "you", title: "Upgrade Vercel to Pro before charging customers", detail: "Hobby is non-commercial only." },
  { key: "gate-handypay-test", area: "launch", sort: 50, owner: "you", title: "Make one real Handypay payment and activate it from HQ → Customers", detail: "Then confirm the plan shows in the customer app, refund, and confirm downgrade. Nobody has paid yet." },
  { key: "gate-smoke", area: "launch", sort: 60, owner: "claude", title: "Live smoke test on the public URL (signup → trade → dashboard)", detail: "Delete test users afterwards (delete from public.tn_user where email like '%@e2e.test')." },
  { key: "gate-sentry", area: "launch", sort: 70, owner: "you", title: "Add error monitoring (Sentry free tier)", detail: "Known gap in KNOWN_ISSUES." },
  { key: "gate-links", area: "launch", sort: 80, owner: "you", title: "Put tagged links in bios: ?src=tt-organic and ?src=ig-organic", detail: "HQ → Social has the link builder." },
  { key: "ops-ad", area: "launch", sort: 90, owner: "you", title: "Start the $50 Instagram ad ($10/day × 5) with ?src=ig-ad", detail: "docs/PAID_TEST.md. Log spend daily in HQ → Social. Pause at $15 spent with zero clicks." },
];
