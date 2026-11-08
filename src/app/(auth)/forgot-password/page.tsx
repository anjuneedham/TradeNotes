import { requestReset } from "../actions";
import { Field, Notice, inputCls, btnCls } from "@/components/ui";

export default async function Forgot({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const { sent } = await searchParams;
  return (
    <form action={requestReset} className="space-y-4">
      <h1 className="text-2xl font-semibold">Reset password</h1>
      {sent && <Notice kind="ok">If an account exists for that email, a reset link is on its way.</Notice>}
      <Field label="Email"><input name="email" type="email" required className={inputCls} /></Field>
      <button className={`${btnCls} w-full`}>Send reset link</button>
    </form>
  );
}
