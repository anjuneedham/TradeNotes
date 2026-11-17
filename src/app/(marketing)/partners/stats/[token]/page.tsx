import { notFound } from "next/navigation";
import { pool } from "@/lib/db";
import { AFFILIATE } from "@/lib/affiliate";
import { LEGAL, isFilled } from "@/lib/legal";

export const dynamic = "force-dynamic";
export const metadata = { title: "Partner stats — TradeNotes", robots: { index: false, follow: false } };
const usd = (c: number) => (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

/** Private stats page, reachable only with the affiliate's secret token. Shows counts and amounts, never customer identities. */
export default async function Stats({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{64}$/.test(token)) notFound();
  const { rows: [a] } = await pool.query("select id, code, name, commission_pct, status from tradenotes.affiliates where dashboard_token = $1", [token]);
  if (!a) notFound();
  const { rows: [t] } = await pool.query(
    `select
       (select count(*)::int from tradenotes.referrals where affiliate_id = $1) as signups,
       (select count(distinct r.user_id)::int from tradenotes.referrals r join tradenotes.subscriptions s on s.user_id = r.user_id where r.affiliate_id = $1 and s.plan <> 'free' and s.status in ('active','trialing','past_due')) as paying,
       coalesce(sum(commission_cents) filter (where status = 'pending' and payable_after > now()), 0)::int as holding,
       coalesce(sum(commission_cents) filter (where status = 'pending' and payable_after <= now()), 0)::int as payable,
       coalesce(sum(commission_cents) filter (where status = 'paid'), 0)::int as paid
     from tradenotes.commissions where affiliate_id = $1`, [a.id]);
  const { rows: recent } = await pool.query("select created_at, commission_cents, status from tradenotes.commissions where affiliate_id = $1 order by created_at desc limit 20", [a.id]);
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const cells: [string, string][] = [["Sign-ups", String(t.signups)], ["Paying now", String(t.paying)], ["Holding (not yet payable)", usd(t.holding)], ["Payable", usd(t.payable)], ["Paid to you", usd(t.paid)]];
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-sm">
      <h1 className="text-2xl font-semibold tracking-tight">Partner stats: {a.name}</h1>
      {a.status !== "active" && <p className="mt-3 rounded border border-border bg-raised p-3">This partnership is {a.status}. New referrals no longer earn commission.</p>}
      <p className="mt-3 text-muted">Your link: <code className="text-fg">{site}/?ref={a.code}</code> · {a.commission_pct}% for {AFFILIATE.months} months · payable {AFFILIATE.holdDays} days after each payment · paid monthly from {usd(AFFILIATE.minPayoutCents)}.</p>
      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {cells.map(([k, v]) => <div key={k} className="rounded-lg border border-border bg-panel p-3"><dt className="text-xs text-muted">{k}</dt><dd className="fig mt-1 text-lg font-medium">{v}</dd></div>)}
      </dl>
      <h2 className="mt-8 font-medium">Recent commissions</h2>
      {recent.length === 0 ? <p className="mt-2 text-muted">None yet. Commission appears when a customer you referred pays.</p> : (
        <ul className="mt-2 divide-y divide-border">
          {recent.map((r, i) => <li key={i} className="flex justify-between py-2"><span>{new Date(r.created_at).toISOString().slice(0, 10)}</span><span className="fig">{usd(r.commission_cents)} · {r.status}</span></li>)}
        </ul>
      )}
      <p className="mt-8 text-xs text-muted">Questions or payout details: {isFilled(LEGAL.supportEmail) ? LEGAL.supportEmail : "contact the TradeNotes team"}. Keep this page&apos;s address private; anyone with it can see these numbers.</p>
    </div>
  );
}
