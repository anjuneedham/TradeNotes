import Link from "next/link";
import { listCustomers, summarize, effPlan, left, paying, type Customer } from "@/lib/customers";
import { getSettings } from "@/lib/settings";
import { PRICES } from "@/lib/plans";
import { findPayer, extend } from "@/app/actions/customers";
import { Badge, Card, Field, Flash, PageHeader, Stat, Table, btnCls, btnGhostCls, btnSmCls, fmtDate, inputCls, money, td, th } from "@/components/ui";

const FILTERS: [string, string][] = [["all", "All"], ["paying", "Paying"], ["expiring", "Expiring ≤7d"], ["stuck", "Signed up, no trade"], ["free_active", "Free & logging trades"], ["lapsed", "Lapsed"]];
export const metadata = { title: "Customers — HQ" };

export default async function Customers({ searchParams }: { searchParams: Promise<{ f?: string; s?: string; test?: string; ok?: string; err?: string }> }) {
  const sp = await searchParams; const set = await getSettings();
  const showTest = sp.test === "1" || set.show_test_accounts;
  const all = await listCustomers(showTest); const sum = summarize(all); const now = new Date();
  const f = sp.f ?? "all"; const s = (sp.s ?? "").toLowerCase();
  const pred: Record<string, (c: Customer) => boolean> = {
    all: () => true, paying: (c) => paying(c, now), expiring: (c) => sum.expiring.some((x) => x.id === c.id), lapsed: (c) => sum.lapsed.some((x) => x.id === c.id),
    stuck: (c) => c.trades === 0 && now.getTime() - new Date(c.created_at).getTime() > 2 * 86_400_000, free_active: (c) => !paying(c, now) && c.trades > 0,
  };
  const rows = all.filter(pred[f] ?? pred.all).filter((c) => !s || c.email.toLowerCase().includes(s) || (c.name ?? "").toLowerCase().includes(s));
  return (
    <>
      <PageHeader title="Customers" sub="Everyone who signed up, with real plan and activity. Plans are changed here (audited) — no more SQL.">
        {/* file download, not a page */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/customers/export" className={btnGhostCls}>Export CSV</a>
      </PageHeader>
      <Flash sp={sp} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Signups" value={sum.total} />
        <Stat label="Logged a trade" value={sum.activated} sub={sum.total ? `${Math.round((sum.activated / sum.total) * 100)}% activation` : "—"} />
        <Stat label="Paying" value={sum.paying} tone={sum.paying ? "good" : undefined} sub={`goal ${set.goal_paying} by ${set.goal_date}`} />
        <Stat label="MRR (recorded)" value={money(sum.mrr)} sub="active, unexpired, founding = 50%" />
        <Stat label="Expiring ≤7d" value={sum.expiring.length} tone={sum.expiring.length ? "warn" : undefined} sub={sum.lapsed.length ? `${sum.lapsed.length} lapsed` : undefined} />
      </div>
      <Card title="Payment received? (Handypay → activate)">
        <form action={findPayer} className="flex flex-wrap items-end gap-3">
          <Field label="Payer email (must match their signup email)" className="min-w-64 flex-1"><input name="email" type="email" required className={inputCls} placeholder="customer@example.com" /></Field>
          <Field label="Plan paid"><select name="plan" className={inputCls}><option value="starter">Starter ${PRICES.starter}</option><option value="pro">Pro ${PRICES.pro}</option></select></Field>
          <button className={btnCls}>Find & activate</button>
        </form>
        <p className="mt-2 text-xs text-muted">Only record a plan after you have seen the payment in Handypay. Nothing here talks to Handypay; this is your manual confirmation step.</p>
      </Card>
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map(([k, l]) => <Link key={k} href={`/customers?f=${k}${showTest ? "&test=1" : ""}`} className={`rounded-full border px-3 py-1 text-sm ${f === k ? "border-accent text-accent" : "border-border text-muted hover:text-fg"}`}>{l}</Link>)}
        <form className="ml-auto flex gap-2"><input type="hidden" name="f" value={f} /><input name="s" defaultValue={sp.s} placeholder="Search email / name" className={`${inputCls} w-56`} /><button className={btnGhostCls}>Search</button></form>
        <Link href={showTest ? `/customers?f=${f}` : `/customers?f=${f}&test=1`} className="text-xs text-muted underline">{showTest ? "Hide" : "Show"} test accounts</Link>
      </div>
      <Table>
        <thead><tr><th className={th}>Customer</th><th className={th}>Signed up</th><th className={th}>Source</th><th className={th}>Plan</th><th className={th}>Trades</th><th className={th}></th></tr></thead>
        <tbody className="divide-y divide-border">
          {rows.length === 0 && <tr><td className={td} colSpan={6}><span className="text-muted">No customers match.</span></td></tr>}
          {rows.map((c) => { const p = effPlan(c); const d = left(c); return (
            <tr key={c.id}>
              <td className={td}><Link href={`/customers/${c.id}`} className="font-medium hover:text-accent">{c.email}</Link><div className="text-xs text-muted">{c.name}{!c.verified && " · unverified"}{c.email_opt_out && " · opted out"}</div></td>
              <td className={td}>{fmtDate(c.created_at)}</td>
              <td className={td}>{c.signup_source ? <Badge>{c.signup_source}</Badge> : <span className="text-muted">—</span>}</td>
              <td className={td}><Badge tone={p === "free" ? "muted" : "good"}>{p}</Badge>{c.is_founding_member && <> <Badge tone="accent">founding</Badge></>}
                {c.plan !== "free" && <div className={`text-xs ${d !== null && d <= 7 ? "text-warn" : "text-muted"}`}>{d !== null && d < 0 ? `lapsed ${-d}d ago` : d !== null ? `${d}d left` : ""}</div>}</td>
              <td className={td}>{c.trades}{c.last_trade && <div className="text-xs text-muted">last {fmtDate(c.last_trade)}</div>}</td>
              <td className={td}>{c.plan !== "free" && <form action={extend}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="back" value="list" /><button className={btnSmCls} title="Use after you see this month's payment in Handypay">+35d</button></form>}</td>
            </tr>); })}
        </tbody>
      </Table>
    </>
  );
}
