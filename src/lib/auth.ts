import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { pool } from "./db";
import { emailEnabled } from "./email";
import { sendTemplate } from "./email-templates";

function create() {
  const site = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const mail = emailEnabled();
  return betterAuth({
    database: pool,
    baseURL: site,
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins: [site, ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : [])],
    advanced: { database: { generateId: "uuid" } },
    user: { modelName: "tn_user", deleteUser: { enabled: true } }, // self-service deletion; requires the current password (settings/actions.ts)
    session: { modelName: "tn_session", expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
    account: { modelName: "tn_account" },
    verification: { modelName: "tn_verification" },
    rateLimit: { enabled: true, storage: "database", modelName: "tn_rate_limit", window: 60, max: 30 },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 72,
      // Verified email matters: payments are matched to accounts by email. Enforced as soon as email sending exists.
      requireEmailVerification: mail,
      resetPasswordTokenExpiresIn: 3600,
      revokeSessionsOnPasswordReset: true, // a reset signs the account out everywhere
      sendResetPassword: async ({ user, url }) => {
        await sendTemplate(user.email, "reset_password", { url });
      },
    },
    emailVerification: {
      sendOnSignUp: mail,
      sendOnSignIn: mail, // unverified user tries to log in => send a fresh confirmation link
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        await sendTemplate(user.email, "verify_email", { url });
      },
    },
    plugins: [nextCookies()], // must be last
  });
}

let instance: ReturnType<typeof create> | undefined;
/** Lazy so `next build` doesn't need runtime secrets. */
export const getAuth = () => (instance ??= create());
