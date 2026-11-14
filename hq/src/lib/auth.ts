import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { q } from "./db";
import { COOKIE, SESSION_HOURS, signSession, verifySession } from "./session";
import { verifyPassword, verifyTotp } from "./password";

export const MAX_FAILS = 5;
export const LOCK_MINUTES = 15;

export const ownerEmail = () => (process.env.HQ_OWNER_EMAIL ?? "").trim().toLowerCase();
export const authConfigured = () => Boolean(ownerEmail() && process.env.HQ_PASSWORD_HASH && (process.env.HQ_SESSION_SECRET ?? "").length >= 16);
export const totpEnabled = () => Boolean(process.env.HQ_TOTP_SECRET);

export async function isOwner(): Promise<boolean> {
  const sub = await verifySession(process.env.HQ_SESSION_SECRET, (await cookies()).get(COOKIE)?.value);
  return Boolean(sub) && sub === ownerEmail();
}
/** Call at the top of every page and every server action (middleware is the first gate, this is the second). */
export async function requireOwner(): Promise<void> {
  if (!(await isOwner())) redirect("/login");
}

export type LoginResult = { ok: true } | { ok: false; error: string };
export async function attemptLogin(email: string, password: string, code: string): Promise<LoginResult> {
  if (!authConfigured()) return { ok: false, error: "HQ login is not configured (set HQ_OWNER_EMAIL, HQ_PASSWORD_HASH, HQ_SESSION_SECRET)." };
  const ip = ((await headers()).get("x-forwarded-for") ?? "").split(",")[0].trim().slice(0, 64) || null;
  const [{ n }] = await q<{ n: number }>(`select count(*)::int n from hq.login_attempts where ok = false and at > now() - make_interval(mins => $1)`, [LOCK_MINUTES]);
  if (n >= MAX_FAILS) return { ok: false, error: `Too many failed attempts. Try again in ${LOCK_MINUTES} minutes.` };
  // Always run the password check (constant-ish work) so a wrong email is indistinguishable from a wrong password.
  const pwOk = verifyPassword(password, process.env.HQ_PASSWORD_HASH);
  const emailOk = email.trim().toLowerCase() === ownerEmail();
  const totpOk = !totpEnabled() || verifyTotp(process.env.HQ_TOTP_SECRET!, code.trim());
  const ok = pwOk && emailOk && totpOk;
  await q(`insert into hq.login_attempts (ok, ip) values ($1, $2)`, [ok, ip]);
  if (!ok) return { ok: false, error: totpEnabled() ? "Wrong email, password or code." : "Wrong email or password." };
  const token = await signSession(process.env.HQ_SESSION_SECRET!, ownerEmail());
  (await cookies()).set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: SESSION_HOURS * 3600 });
  return { ok: true };
}
export async function logout() { (await cookies()).delete(COOKIE); }
