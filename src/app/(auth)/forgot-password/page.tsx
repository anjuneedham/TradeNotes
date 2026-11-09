import { requestReset } from "../actions";
import { emailEnabled } from "@/lib/email";
import { Field, Notice, inputCls, btnCls } from "@/components/ui";

export const dynamic = "force-dynamic";
export default async function Forgot({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const { sent } = await searchParams;
  if (!emailEnabled()) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Reset password</h1>
        <Notice>Automatic password reset isn&apos;t available yet. Please contact support from the email you signed up with and we&apos;ll reset it for you.</Notice>
      </div>
    );
  }
  return (
    <form action={requestReset} className="space-y-4">
      <h1 className="text-2xl font-semibold">Reset password</h1>
      {sent && <Notice kind="ok">If an account exists for that email, a reset link is on its way.</Notice>}
      <Field label="Email"><input name="email" type="email" required className={inputCls} /></Field>
      <button className={`${btnCls} w-full`}>Send reset link</button>
    </form>
  );
}
