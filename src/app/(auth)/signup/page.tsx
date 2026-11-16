import Link from "next/link";
import { signup } from "../actions";
import { Field, Notice, inputCls, btnCls } from "@/components/ui";
import { PencilArrow } from "@/components/stickman/PencilArrow";
import { Stickman } from "@/components/stickman/Stickman";
import { LEGAL, isFilled } from "@/lib/legal";

export const metadata = { title: "Create account — TradeNotes" };
export default async function Signup({ searchParams }: { searchParams: Promise<{ error?: string; check_email?: string }> }) {
  const { error, check_email } = await searchParams;
  if (check_email) {
    return (
      <div className="space-y-3">
        <Notice kind="ok">Check your email for a confirmation link to finish creating your account.</Notice>
        <p className="text-sm text-muted">
          Nothing after a few minutes? Check your spam folder, then try <Link href="/login" className="underline">logging in</Link> — we&apos;ll send a fresh link.
          {isFilled(LEGAL.supportEmail) && <> Still stuck? Email {LEGAL.supportEmail}.</>}
        </p>
      </div>
    );
  }
  return (
    <form action={signup} className="space-y-4">
      <div className="flex items-end gap-3"><Stickman pose="win" className="sm-only h-14 w-10" /><h1 className="text-2xl font-semibold">Create your free account</h1></div>
      {error && <Notice kind="error">{error}</Notice>}
      <Field label="Email"><input name="email" type="email" autoComplete="email" required className={inputCls} /></Field>
      <Field label="Password" hint="At least 8 characters."><input name="password" type="password" autoComplete="new-password" minLength={8} required className={inputCls} /></Field>
      <div className="relative">
        <button className={`${btnCls} w-full`}>Create account</button>
        <PencilArrow dir="left" label="free, no card" className="absolute -right-4 -top-14 hidden md:inline-flex" delay={0.5} />
      </div>
      <p className="text-xs text-muted">By signing up you agree to the <Link href="/legal/terms" className="underline">Terms</Link> and <Link href="/legal/privacy" className="underline">Privacy Policy</Link>.</p>
      <p className="text-sm text-muted">Already have an account? <Link href="/login" className="underline">Log in</Link></p>
    </form>
  );
}
