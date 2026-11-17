/**
 * Reusable transactional email templates. One layout (Fable's light palette: warm paper background, ink text, blue accent,
 * IBM Plex fallback stack) + per-message content. Every message has an HTML and a plain-text part.
 * No tracking pixels, no remote images. Values are escaped.
 */
import { sendEmail } from "./email";
import { LEGAL, isFilled } from "./legal";
import { PLANS, type PlanId } from "./plans";

export type TemplateId = "welcome" | "verify_email" | "reset_password" | "subscription_confirmed" | "payment_failed" | "cancellation_scheduled" | "subscription_ended" | "account_notice" | "review_reminder";
export interface TemplateData { url?: string; plan?: PlanId; periodEnd?: string | null; message?: string; unsubscribeUrl?: string }

const C = { bg: "#f6f5f1", panel: "#ffffff", border: "#dfdcd3", fg: "#17191c", muted: "#5a626d", accent: "#2c50c4" };
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? process.env.BETTER_AUTH_URL ?? "https://tradenotes.dev";
const day = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }) : null);

interface Content { subject: string; heading: string; paras: string[]; cta?: { label: string; url: string }; foot?: string }

function content(id: TemplateId, d: TemplateData): Content {
  const plan = d.plan ? PLANS[d.plan].name : "paid";
  const end = day(d.periodEnd);
  const billing = `${site()}/app/billing`;
  switch (id) {
    case "review_reminder": return { subject: "Time for your weekly review", heading: "Time for your weekly review",
      paras: ["Last week is over. Five minutes to write down what worked, what to repeat and what to fix is how a journal turns into improvement.", "Your numbers for the week are already filled in for you."],
      cta: { label: "Open your weekly review", url: d.url! },
      foot: `You are getting this because you turned on weekly review reminders in Settings. Turn it off any time in Settings${d.unsubscribeUrl ? `, or in one click: ${d.unsubscribeUrl}` : "."}` };
    case "welcome": return { subject: "Welcome to TradeNotes", heading: "Your journal is ready",
      paras: ["Thanks for signing up. The fastest way to get value from TradeNotes is to log your last few trades — even the ones you'd rather forget.",
        "After about 20 closed trades your numbers start to mean something, and every statistic explains what it means and when it is too early to trust it.",
        "TradeNotes is a journal and review tool. It does not give trading advice or predict results."],
      cta: { label: "Log a trade", url: `${site()}/app/journal/new` } };
    case "verify_email": return { subject: "Confirm your TradeNotes email", heading: "Confirm your email",
      paras: ["Confirm your email address to finish creating your account. We use it to match payments to your account and to help you get back in if you forget your password."],
      cta: { label: "Confirm email", url: d.url! }, foot: "If you didn't create a TradeNotes account, you can ignore this email." };
    case "reset_password": return { subject: "Reset your TradeNotes password", heading: "Choose a new password",
      paras: ["Use the button below to choose a new password. The link works for one hour. Resetting signs you out on every device."],
      cta: { label: "Reset password", url: d.url! }, foot: "If you didn't ask for this, ignore this email — your password hasn't changed." };
    case "subscription_confirmed": return { subject: `Your TradeNotes ${plan} plan is active`, heading: `${plan} is active`,
      paras: [`Thanks for subscribing. Your ${plan} plan is active now${end ? ` and paid through ${end}` : ""}.`,
        "It renews automatically each month until you cancel. You can cancel at any time from Plan & billing; you keep access until the end of the period you've paid for.",
        "Your card receipt comes separately from HandyPay, our payment processor."],
      cta: { label: "View your plan", url: billing } };
    case "payment_failed": return { subject: "Your TradeNotes payment didn't go through", heading: "We couldn't take your payment",
      paras: [`Your latest ${plan} payment failed. HandyPay will retry the card automatically over the next few days.`,
        `You keep your ${plan} plan for now${end ? ` (paid through ${end}, plus a short grace period)` : ""}. If the payment still fails, your account moves to Free. Nothing is deleted.`,
        "To fix it, update your card from the manage link in your HandyPay receipt or from Plan & billing."],
      cta: { label: "Update payment", url: billing } };
    case "cancellation_scheduled": return { subject: "Your TradeNotes subscription is cancelled", heading: "Cancellation confirmed",
      paras: [`Your ${plan} subscription won't renew. There are no further charges.`,
        `You keep ${plan} until ${end ?? "the end of the period you've paid for"}, then your account moves to Free. All your trades and statistics stay.`,
        "Changed your mind? You can resume from Plan & billing before that date."],
      cta: { label: "Plan & billing", url: billing } };
    case "subscription_ended": return { subject: "Your TradeNotes plan has ended", heading: "You're on the Free plan",
      paras: [`Your ${plan} subscription has ended and your account is now on Free.`,
        `Every trade you've logged is still there and your statistics keep working. You can add new trades while you hold fewer than ${PLANS.free.tradeLimit}.`],
      cta: { label: "See plans", url: billing } };
    case "account_notice": return { subject: "Important information about your TradeNotes account", heading: "Account notice",
      paras: [d.message ?? ""], cta: { label: "Open TradeNotes", url: `${site()}/app` } };
  }
}

export function render(id: TemplateId, d: TemplateData = {}): { subject: string; html: string; text: string } {
  const c = content(id, d);
  const support = isFilled(LEGAL.supportEmail) ? LEGAL.supportEmail : null;
  const footer = `TradeNotes — a trading journal. Not financial advice.${support ? ` Questions? ${support}` : ""}`;
  const font = "'IBM Plex Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif";
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(c.subject)}</title></head>
<body style="margin:0;padding:0;background:${C.bg};color:${C.fg};font-family:${font};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
<tr><td style="padding:0 4px 16px;font-weight:600;font-size:15px;letter-spacing:-0.01em;">TradeNotes</td></tr>
<tr><td style="background:${C.panel};border:1px solid ${C.border};border-radius:10px;padding:28px 24px;">
<h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;font-weight:600;">${esc(c.heading)}</h1>
${c.paras.map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;">${esc(p)}</p>`).join("\n")}
${c.cta ? `<p style="margin:22px 0 6px;"><a href="${esc(c.cta.url)}" style="display:inline-block;background:${C.accent};color:#ffffff;text-decoration:none;font-weight:500;font-size:15px;padding:11px 18px;border-radius:6px;">${esc(c.cta.label)}</a></p>
<p style="margin:10px 0 0;font-size:12px;line-height:1.5;color:${C.muted};word-break:break-all;">Or paste this link: ${esc(c.cta.url)}</p>` : ""}
${c.foot ? `<p style="margin:18px 0 0;font-size:13px;line-height:1.5;color:${C.muted};">${esc(c.foot)}</p>` : ""}
</td></tr>
<tr><td style="padding:16px 4px;font-size:12px;line-height:1.5;color:${C.muted};">${esc(footer)}</td></tr>
</table></td></tr></table></body></html>`;
  const text = [c.heading, "", ...c.paras.flatMap((p) => [p, ""]), ...(c.cta ? [`${c.cta.label}: ${c.cta.url}`, ""] : []), ...(c.foot ? [c.foot, ""] : []), "—", footer].join("\n");
  return { subject: c.subject, html, text };
}

export async function sendTemplate(to: string, id: TemplateId, d: TemplateData = {}) {
  const m = render(id, d);
  await sendEmail(to, m.subject, m.text, m.html, d.unsubscribeUrl ? { "List-Unsubscribe": `<${d.unsubscribeUrl}>` } : undefined);
}
