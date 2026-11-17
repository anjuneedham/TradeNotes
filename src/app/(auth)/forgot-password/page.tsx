import { requestReset } from "../actions";
import { emailEnabled } from "@/lib/email";
import Link from "next/link";
import { Field, Notice, inputCls, btnCls, linkCls } from "@/components/ui";

export const dynamic = "force-dynamic";
export default async function Forgot({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const { sent } = await searchParams;
  if (!emailEnabled()) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold tracking-tight">Reset password</h1>
        <Notice>Automatic password reset isn&apos;t available yet. Please contact support from the email you signed up with and we&apos;ll reset it for you.</Notice>
        <p className="text-sm"><Link href="/login" className={linkCls}>← Back to log in</Link></p>
      </div>
    );
  }
  return (
    <form action={requestReset} className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">Reset password</h1>
      {sent && <Notice kind="ok">If an account exists for that email, a reset link is on its way.</Notice>}
      <p className="text-sm text-muted">Enter your account email and we&apos;ll send a link to choose a new password. The link works for 1 hour.</p>
      <Field label="Email"><input name="email" type="email" required className={inputCls} /></Field>
      <button className={`${btnCls} w-full`}>Send reset link</button>
      <p className="text-sm"><Link href="/login" className={linkCls}>← Back to log in</Link></p>
    </form>
  );
}
