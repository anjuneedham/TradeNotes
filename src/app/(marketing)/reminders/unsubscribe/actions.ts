"use server";
import { redirect } from "next/navigation";
import { pool } from "@/lib/db";
import { verifyUnsubscribeToken } from "@/lib/reminders";

/** One-click unsubscribe from the email link: the signed token IS the credential (no login needed). Turning it off is idempotent. */
export async function unsubscribeReminders(formData: FormData) {
  const token = String(formData.get("t") ?? "");
  const id = process.env.BETTER_AUTH_SECRET ? verifyUnsubscribeToken(token, process.env.BETTER_AUTH_SECRET) : null;
  if (!id) redirect("/reminders/unsubscribe?error=1");
  await pool.query("update tradenotes.profiles set review_reminders = false where id = $1", [id]);
  redirect("/reminders/unsubscribe?done=1");
}
