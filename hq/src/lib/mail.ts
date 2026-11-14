import "server-only";
/** Resend HTTP API (no SDK). Disabled until RESEND_API_KEY is set. RESEND_API_URL is a test hook only. */
export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
export async function sendMail(to: string, subject: string, text: string, replyTo?: string): Promise<void> {
  const key = process.env.RESEND_API_KEY; if (!key || !process.env.EMAIL_FROM) throw new Error("Email is not configured (RESEND_API_KEY, EMAIL_FROM).");
  const res = await fetch(process.env.RESEND_API_URL ?? "https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, text, ...(replyTo ? { reply_to: replyTo } : {}) }),
  });
  if (!res.ok) throw new Error(`Email provider error ${res.status}`);
}
