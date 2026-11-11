import Link from "next/link";
import { signup } from "../actions";
import { Field, Notice, inputCls, btnCls, linkCls } from "@/components/ui";
import { LEGAL, isFilled } from "@/lib/legal";
import { PLANS } from "@/lib/plans";

export const metadata = { title: "Create account — TradeNotes" };
export default async function Signup({ searchParams }: { searchParams: Promise<{ error?: string; check_email?: string }> }) {
  const { error, check_email } = await searchParams;
  if (check_email) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold tracking-tight">Confirm your email</h1>
        <Notice kind="ok">Check your email for a confirmation link to finish creating your account.</Notice>
        <p className="text-sm leading-relaxed text-muted">
          Nothing after a few minutes? Check your spam folder, then try <Link href="/login" className={linkCls}>logging in</Link> — we&apos;ll send a fresh link.
          {isFilled(LEGAL.supportEmail) && <> Still stuck? Email {LEGAL.supportEmail}.</>}
        </p>
      </div>
    );
  }
  return (
    <form action={signup} className="space-y-4">
      <div><h1 className="text-xl font-semibold tracking-tight">Create your free account</h1><p className="mt-1 text-sm text-muted">Free plan · no card required · up to {PLANS.free.tradeLimit} trades.</p></div>
      {error && <Notice kind="error">{error}</Notice>}
      <Field label="Email"><input name="email" type="email" autoComplete="email" inputMode="email" required className={inputCls} /></Field>
      <Field label="Password" hint="At least 8 characters."><input name="password" type="password" autoComplete="new-password" minLength={8} required className={inputCls} /></Field>
      <button className={`${btnCls} w-full`}>Create account</button>
      <p className="text-xs leading-relaxed text-muted">By signing up you agree to the <Link href="/legal/terms" className="underline underline-offset-2">Terms</Link> and <Link href="/legal/privacy" className="underline underline-offset-2">Privacy Policy</Link>. TradeNotes is a journaling tool, not financial advice.</p>
      <p className="border-t border-border pt-4 text-sm text-muted">Already have an account? <Link href="/login" className={linkCls}>Log in</Link></p>
    </form>
  );
}
