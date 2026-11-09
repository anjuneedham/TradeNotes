"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { APIError } from "better-auth/api";
import { getAuth } from "@/lib/auth";
import { emailEnabled } from "@/lib/email";

const creds = z.object({ email: z.string().trim().toLowerCase().email("Enter a valid email"), password: z.string().min(8, "Password must be at least 8 characters").max(72, "Password is too long") });
const q = (m: string) => encodeURIComponent(m);
const siteUrl = () => process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Run an auth call; return a user-safe error message instead of throwing. (redirect() must stay outside try/catch.) */
async function attempt(fn: () => Promise<unknown>, friendly: Record<string, string> = {}): Promise<string | null> {
  try { await fn(); return null; }
  catch (e) {
    if (e instanceof APIError) {
      const code = String((e.body as { code?: string } | undefined)?.code ?? "");
      return friendly[code] ?? friendly["*"] ?? e.message ?? "Something went wrong";
    }
    console.error("auth error", e);
    return "Something went wrong. Please try again.";
  }
}

export async function login(formData: FormData) {
  const p = creds.safeParse(Object.fromEntries(formData));
  if (!p.success) redirect(`/login?error=${q(p.error.issues[0].message)}`);
  const err = await attempt(
    async () => getAuth().api.signInEmail({ body: p.data, headers: await headers() }),
    { EMAIL_NOT_VERIFIED: "Please confirm your email first — check your inbox.", "*": "Incorrect email or password" }, // no user enumeration
  );
  if (err) redirect(`/login?error=${q(err)}`);
  const next = String(formData.get("next") ?? "/app");
  redirect(next.startsWith("/app") ? next : "/app");
}

export async function signup(formData: FormData) {
  const p = creds.safeParse(Object.fromEntries(formData));
  if (!p.success) redirect(`/signup?error=${q(p.error.issues[0].message)}`);
  const err = await attempt(
    async () => getAuth().api.signUpEmail({ body: { ...p.data, name: p.data.email.split("@")[0] }, headers: await headers() }),
    { USER_ALREADY_EXISTS: "An account with that email already exists. Try logging in.", USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "An account with that email already exists. Try logging in." },
  );
  if (err) redirect(`/signup?error=${q(err)}`);
  redirect(emailEnabled() ? "/signup?check_email=1" : "/app/onboarding");
}

export async function requestReset(formData: FormData) {
  const email = z.string().trim().toLowerCase().email().safeParse(formData.get("email"));
  if (email.success && emailEnabled()) {
    await attempt(() => getAuth().api.requestPasswordReset({ body: { email: email.data, redirectTo: `${siteUrl()}/reset-password` } }));
  }
  redirect("/forgot-password?sent=1"); // identical response whether or not the account exists
}

export async function updatePassword(formData: FormData) {
  const pw = z.string().min(8).max(72).safeParse(formData.get("password"));
  const token = String(formData.get("token") ?? "");
  if (!token) redirect(`/reset-password?error=${q("This reset link is invalid or has expired. Request a new one.")}`);
  if (!pw.success) redirect(`/reset-password?token=${q(token)}&error=${q("Password must be at least 8 characters")}`);
  const err = await attempt(() => getAuth().api.resetPassword({ body: { newPassword: pw.data, token } }), { "*": "This reset link is invalid or has expired. Request a new one." });
  if (err) redirect(`/reset-password?error=${q(err)}`);
  redirect("/login?reset=1");
}

export async function logout() {
  await attempt(async () => getAuth().api.signOut({ headers: await headers() }));
  redirect("/");
}
