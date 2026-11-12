import { LEGAL, isFilled } from "./legal";
import { report } from "./monitor";

/** Transactional email via Resend's HTTP API (no SDK). Disabled until RESEND_API_KEY is set. */
export const emailEnabled = () => Boolean(process.env.RESEND_API_KEY);

export async function sendEmail(to: string, subject: string, text: string, html?: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Email is not configured");
  const replyTo = process.env.EMAIL_REPLY_TO ?? (isFilled(LEGAL.supportEmail) ? LEGAL.supportEmail : undefined);
  const res = await fetch(process.env.RESEND_API_URL ?? "https://api.resend.com/emails", {  // RESEND_API_URL: test hook only
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM ?? "TradeNotes <onboarding@resend.dev>", to, subject, text, ...(html ? { html } : {}), ...(replyTo ? { reply_to: replyTo } : {}) }),
  });
  if (!res.ok) { const err = new Error(`Email provider error ${res.status}`); report(err, "email", { status: res.status }); throw err; }
}
