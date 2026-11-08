import { updatePassword } from "../actions";
import { Field, Notice, inputCls, btnCls } from "@/components/ui";

export default async function Reset({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <form action={updatePassword} className="space-y-4">
      <h1 className="text-2xl font-semibold">Choose a new password</h1>
      {error && <Notice kind="error">{error}</Notice>}
      <Field label="New password"><input name="password" type="password" minLength={8} required autoComplete="new-password" className={inputCls} /></Field>
      <button className={`${btnCls} w-full`}>Update password</button>
    </form>
  );
}
