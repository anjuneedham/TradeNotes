import Link from "next/link";
import { updatePassword } from "../actions";
import { Field, Notice, inputCls, btnCls, linkCls } from "@/components/ui";

export default async function Reset({ searchParams }: { searchParams: Promise<{ error?: string; token?: string }> }) {
  const { error, token } = await searchParams;
  if (!token) {
    return (
      <div className="space-y-4">
        <Notice kind="error">{error ?? "This reset link is invalid or has expired."}</Notice>
        <Link href="/forgot-password" className={linkCls}>Request a new link</Link>
      </div>
    );
  }
  return (
    <form action={updatePassword} className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">Choose a new password</h1>
      {error && <Notice kind="error">{error}</Notice>}
      <input type="hidden" name="token" value={token} />
      <Field label="New password" hint="At least 8 characters. You will be signed out on other devices."><input name="password" type="password" minLength={8} required autoComplete="new-password" className={inputCls} /></Field>
      <button className={`${btnCls} w-full`}>Update password</button>
    </form>
  );
}
