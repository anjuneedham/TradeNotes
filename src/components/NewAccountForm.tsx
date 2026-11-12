"use client";
import Link from "next/link";
import { useActionState } from "react";
import { createAccount, type AccountState } from "@/app/app/accounts/actions";
import { Card, Field, Notice, inputCls, btnCls, btnGhostCls } from "./ui";

export function NewAccountForm({ defaultCurrency }: { defaultCurrency: string }) {
  const [state, action, pending] = useActionState<AccountState, FormData>(createAccount, {});
  return (
    <Card>
      <h2 className="font-medium">Add an account</h2>
      {state.message && (
        <div className="mt-3"><Notice kind={state.code ? "warn" : "error"}>{state.message}{state.code && <> <Link href="/app/billing" className={`${btnGhostCls} mt-3`}>See plans</Link></>}</Notice></div>
      )}
      <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Name"><input name="name" required maxLength={60} placeholder="e.g. Prop firm challenge" className={inputCls} /></Field>
        <Field label="Broker (optional)"><input name="broker" maxLength={60} className={inputCls} /></Field>
        <Field label="Currency"><input name="currency" defaultValue={defaultCurrency} required pattern="[A-Za-z]{3}" maxLength={3} className={inputCls} /></Field>
        <Field label="Starting balance"><input name="starting_balance" type="number" step="any" min="0" className={inputCls} /></Field>
        <div className="sm:col-span-2"><button disabled={pending} className={btnCls}>{pending ? "Adding…" : "Add account"}</button></div>
      </form>
    </Card>
  );
}
