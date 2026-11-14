import { redirect } from "next/navigation";
import { attemptLogin, authConfigured, isOwner, totpEnabled } from "@/lib/auth";
import { Card, Field, Notice, btnCls, inputCls } from "@/components/ui";

async function login(fd: FormData) {
  "use server";
  const r = await attemptLogin(String(fd.get("email") ?? ""), String(fd.get("password") ?? ""), String(fd.get("code") ?? ""));
  redirect(r.ok ? "/" : `/login?err=${encodeURIComponent(r.error)}`);
}
export default async function Login({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  if (await isOwner()) redirect("/");
  const { err } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4">
      <h1 className="text-xl font-semibold"><span className="text-accent">TradeNotes</span> HQ</h1>
      <p className="text-sm text-muted">Owner-only. This is not the customer login.</p>
      {!authConfigured() && <Notice kind="warn">Login is not configured on this deployment (HQ_OWNER_EMAIL, HQ_PASSWORD_HASH, HQ_SESSION_SECRET).</Notice>}
      {err && <Notice kind="error">{err}</Notice>}
      <Card>
        <form action={login} className="space-y-3">
          <Field label="Email"><input name="email" type="email" autoComplete="username" required className={inputCls} /></Field>
          <Field label="Password"><input name="password" type="password" autoComplete="current-password" required className={inputCls} /></Field>
          {totpEnabled() && <Field label="Authenticator code"><input name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className={inputCls} /></Field>}
          <button className={`${btnCls} w-full`}>Log in</button>
        </form>
      </Card>
    </main>
  );
}
