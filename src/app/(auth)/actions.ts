"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const creds = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(8, "Password must be at least 8 characters").max(72) });

async function origin() {
  const h = await headers();
  return process.env.NEXT_PUBLIC_SITE_URL ?? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
}
const q = (m: string) => encodeURIComponent(m);

export async function login(formData: FormData) {
  const p = creds.safeParse(Object.fromEntries(formData));
  if (!p.success) redirect(`/login?error=${q(p.error.issues[0].message)}`);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(p.data);
  if (error) redirect(`/login?error=${q("Incorrect email or password")}`); // no user enumeration
  const next = String(formData.get("next") ?? "/app");
  redirect(next.startsWith("/app") ? next : "/app");
}

export async function signup(formData: FormData) {
  const p = creds.safeParse(Object.fromEntries(formData));
  if (!p.success) redirect(`/signup?error=${q(p.error.issues[0].message)}`);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ ...p.data, options: { emailRedirectTo: `${await origin()}/auth/callback` } });
  if (error) redirect(`/signup?error=${q(error.message)}`);
  if (!data.session) redirect("/signup?check_email=1"); // email confirmation enabled
  redirect("/app/onboarding");
}

export async function requestReset(formData: FormData) {
  const email = z.string().trim().toLowerCase().email().safeParse(formData.get("email"));
  if (email.success) {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(email.data, { redirectTo: `${await origin()}/auth/callback?next=/reset-password` });
  }
  redirect("/forgot-password?sent=1"); // same response whether or not the account exists
}

export async function updatePassword(formData: FormData) {
  const pw = z.string().min(8).max(72).safeParse(formData.get("password"));
  if (!pw.success) redirect(`/reset-password?error=${q("Password must be at least 8 characters")}`);
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: pw.data });
  if (error) redirect(`/reset-password?error=${q(error.message)}`);
  redirect("/app");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
