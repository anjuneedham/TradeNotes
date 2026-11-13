import Link from "next/link";
import { getContext } from "@/lib/app-context";
import { PLANS } from "@/lib/plans";
import { updateAccount, deleteAccountRecord } from "./actions";
import { NewAccountForm } from "@/components/NewAccountForm";
import { Card, Notice, PageHeader, Badge, Field, inputCls, btnGhostCls, btnDangerCls, linkCls } from "@/components/ui";
import { money } from "@/lib/format";

export const metadata = { title: "Accounts — TradeNotes" };
const ERRORS: Record<string, string> = { last: "You need at least one account, so the last one can't be deleted.", confirm: "Type the account name exactly to delete it. Nothing was deleted.", invalid: "Please check the account details and try again.", currency: "An account's currency can't be changed once it has trades, because their results are recorded in it. Create a new account in the other currency instead." };

export default async function Accounts({ searchParams }: { searchParams: Promise<{ created?: string; saved?: string; deleted?: string; error?: string }> }) {
  const sp = await searchParams;
  const { db, accounts, plan } = await getContext();
  const counts = await db((q) => q<{ account_id: string; n: number }>("select account_id, count(*)::int as n from tradenotes.trades group by account_id"));
  const n = new Map(counts.map((c) => [c.account_id, c.n]));
  const max = PLANS[plan].accounts;
  const room = accounts.length < max;
  const currencies = new Set(accounts.map((a) => a.currency));

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Trading accounts" sub={`${accounts.length} of ${max} on ${PLANS[plan].name}. Choose which account you're viewing from the switcher at the top of the app.`} />
      {sp.created && <Notice kind="ok">Account created.</Notice>}
      {sp.saved && <Notice kind="ok">Account saved.</Notice>}
      {sp.deleted && <Notice kind="ok">Account and its trades deleted.</Notice>}
      {sp.error && <Notice kind="error">{ERRORS[sp.error] ?? "Something went wrong. Nothing was changed."}</Notice>}
      {accounts.length > max && <Notice kind="warn">You have {accounts.length} accounts but {PLANS[plan].name} includes {max}. Everything stays readable and you can keep logging trades; you can&apos;t add another account unless you upgrade or delete one.</Notice>}
      {currencies.size > 1 && <Notice>Your accounts use different currencies ({[...currencies].join(", ")}). &ldquo;All accounts&rdquo; adds up only the accounts in {accounts[0].currency} and lists the rest separately, because we don&apos;t convert between currencies.</Notice>}

      <div className="space-y-3">
        {accounts.map((a) => (
          <Card key={a.id}>
            <details>
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{a.name} <Badge>{a.currency}</Badge></span>
                <span className="text-sm text-muted">{(n.get(a.id) ?? 0).toLocaleString("en-US")} trades · start {money(Number(a.starting_balance), a.currency)} <span className={linkCls}>Edit</span></span>
              </summary>
              <form action={updateAccount} className="mt-4 grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="id" value={a.id} />
                <Field label="Name"><input name="name" defaultValue={a.name} required maxLength={60} className={inputCls} /></Field>
                <Field label="Broker (optional)"><input name="broker" defaultValue={a.broker ?? ""} maxLength={60} className={inputCls} /></Field>
                <Field label="Currency" hint={(n.get(a.id) ?? 0) > 0 ? "Fixed once the account has trades." : "Can be changed until you add trades."}><input name="currency" defaultValue={a.currency} required pattern="[A-Za-z]{3}" maxLength={3} className={inputCls} /></Field>
                <Field label="Starting balance"><input name="starting_balance" type="number" step="any" min="0" defaultValue={Number(a.starting_balance)} className={inputCls} /></Field>
                <div className="sm:col-span-2"><button className={btnGhostCls}>Save</button></div>
              </form>
              {accounts.length > 1 && (
                <form action={deleteAccountRecord} className="mt-5 grid gap-2 border-t border-border pt-4 sm:max-w-sm">
                  <input type="hidden" name="id" value={a.id} /><input type="hidden" name="expected_name" value={a.name} />
                  <p className="text-sm text-muted">Deleting removes this account and its {(n.get(a.id) ?? 0).toLocaleString("en-US")} trades and screenshots permanently.</p>
                  <label className="text-sm">Type <strong>{a.name}</strong> to confirm<input name="confirm_name" autoComplete="off" required className={`${inputCls} mt-1`} /></label>
                  <button className={btnDangerCls}>Delete account and its trades</button>
                </form>
              )}
            </details>
          </Card>
        ))}
      </div>

      {room ? <NewAccountForm defaultCurrency={accounts[0]?.currency ?? "USD"} /> : (
        <Notice kind="warn">
          <p>{PLANS[plan].name} includes {max} trading account{max === 1 ? "" : "s"}.{plan !== "pro" && ` ${plan === "free" ? PLANS.starter.name : PLANS.pro.name} includes ${plan === "free" ? PLANS.starter.accounts : PLANS.pro.accounts}.`}</p>
          {plan !== "pro" && <Link href="/app/billing" className={`${btnGhostCls} mt-3`}>See plans</Link>}
        </Notice>
      )}
    </div>
  );
}
