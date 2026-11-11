"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getContext } from "@/lib/app-context";

/** Preferences: explanation toggle (profiles.show_explanations, own row under RLS) and a per-device appearance cookie. */
export async function savePreferences(formData: FormData) {
  const { db, user } = await getContext();
  const show = formData.get("show_explanations") === "on";
  await db((q) => q("update tradenotes.profiles set show_explanations = $1 where id = $2", [show, user.id]));
  const theme = String(formData.get("theme") ?? "system");
  const jar = await cookies();
  if (theme === "light" || theme === "dark") jar.set("tn_theme", theme, { maxAge: 60 * 60 * 24 * 365, path: "/", sameSite: "lax", httpOnly: true });
  else jar.delete("tn_theme");
  revalidatePath("/app", "layout");
  redirect("/app/settings?saved=1");
}
