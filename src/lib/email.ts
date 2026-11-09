/** Transactional email via Resend's HTTP API (no SDK). Disabled until RESEND_API_KEY is set. */
export const emailEnabled = () => Boolean(process.env.RESEND_API_KEY);

export async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Email is not configured");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM ?? "TradeNotes <onboarding@resend.dev>", to, subject, text }),
  });
  if (!res.ok) throw new Error(`Email provider error ${res.status}`);
}
