import Link from "next/link";
import { login } from "../actions";
import { Field, Notice, inputCls, btnCls } from "@/components/ui";

export const metadata = { title: "Log in — TradeNotes" };
export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; next?: string; reset?: string }> }) {
  const { error, next, reset } = await searchParams;
  return (
    <form action={login} className="space-y-4">
      <h1 className="text-2xl font-semibold">Log in</h1>
      {reset && <Notice kind="ok">Password updated. Please log in.</Notice>}
      {error && <Notice kind="error">{error}</Notice>}
      <input type="hidden" name="next" value={next ?? "/app"} />
      <Field label="Email"><input name="email" type="email" autoComplete="email" required className={inputCls} /></Field>
      <Field label="Password"><input name="password" type="password" autoComplete="current-password" required className={inputCls} /></Field>
      <button className={`${btnCls} w-full`}>Log in</button>
      <p className="text-sm text-muted"><Link href="/forgot-password" className="underline">Forgot password?</Link> · <Link href="/signup" className="underline">Create account</Link></p>
    </form>
  );
}
