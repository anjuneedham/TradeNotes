/** Default message templates (from docs/SALES_PLAYBOOK.md). Editable in HQ → Settings; edits are stored in hq.templates. */
export type Tpl = { key: string; title: string; body: string; for?: string[] };
export const DEFAULT_TEMPLATES: Tpl[] = [
  { key: "cold_dm", title: "Cold DM (first message)", for: ["tiktok", "instagram"], body: "Hey {name} — saw your post about {specific thing}. I've been trading ~7 years and kept making the same mistakes until I started journaling properly, so I'm building TradeNotes, a simple journal that shows things like what your mistakes actually cost you. Would you be up for trying it free and telling me what's confusing? No pressure either way." },
  { key: "ig_dm", title: "Instagram first message (no link)", for: ["instagram"], body: "Hey {name} — saw your story about {specific thing}. I'm a forex trader (7 yrs) building a free journal that shows what your mistakes actually cost you. Want to try it and tell me what's confusing?" },
  { key: "link_after_reply", title: "Send the link (after they reply)", for: ["tiktok", "instagram"], body: "Great — here's the link, it's free to start: {link}\nTell me honestly what's confusing and what you'd want it to show you." },
  { key: "followup", title: "Follow-up (day 3, once)", for: ["tiktok", "instagram"], body: "Just bumping this in case it got buried — happy to set your account up with you on a 10-minute call if that's easier." },
  { key: "founding", title: "Founding-member close", for: ["tiktok", "instagram"], body: "You've been one of the most useful testers. I'm opening 10 founding spots: 50% off for 12 months in return for a 20-min feedback call each month. Want one?" },
  { key: "feedback", title: "Feedback request", body: "What almost stopped you from logging a trade? What's one number you wish TradeNotes showed you?" },
  { key: "launch", title: "Launch announcement (founder post)", body: "After 7 years of trading, the thing that changed my results most wasn't a new strategy — it was writing down every trade and measuring my mistakes. I built TradeNotes to make that easy for newer traders. It's free to start. I'd love your honest feedback." },
];
