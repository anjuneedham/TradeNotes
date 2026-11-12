import Link from "next/link";
import { login } from "../actions";
import { Field, Notice, inputCls, btnCls, linkCls } from "@/components/ui";

export const metadata = { title: "Log in — TradeNotes" };
export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; next?: string; reset?: string }> }) {
  const { error, next, reset } = await searchParams;
  return (
    <form action={login} className="space-y-4">
      <div><h1 className="text-xl font-semibold tracking-tight">Log in</h1><p className="mt-1 text-sm text-muted">Pick up where your journal left off.</p></div>
      {reset && <Notice kind="ok">Password updated. Please log in.</Notice>}
      {error && <Notice kind="error">{error}</Notice>}
      <input type="hidden" name="next" value={next ?? "/app"} />
      <Field label="Email"><input name="email" type="email" autoComplete="email" inputMode="email" required className={inputCls} /></Field>
      <Field label="Password"><input name="password" type="password" autoComplete="current-password" required className={inputCls} /></Field>
      <button className={`${btnCls} w-full`}>Log in</button>
      <p className="flex flex-wrap justify-between gap-2 text-sm"><Link href="/forgot-password" className={linkCls}>Forgot password?</Link><span className="text-muted">New here? <Link href="/signup" className={linkCls}>Create account</Link></span></p>
    </form>
  );
}
