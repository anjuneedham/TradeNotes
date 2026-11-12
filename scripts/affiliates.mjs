// Affiliate admin CLI (owner database connection). Needs DATABASE_URL (use the Supabase connection string; keep it out of shell history).
//   node scripts/affiliates.mjs add <code> "<Name>" <email> [pct]     create a partner; prints their link + private stats page
//   node scripts/affiliates.mjs list                                  partners with sign-ups, paying, earned, payable
//   node scripts/affiliates.mjs due                                   CSV of what is payable now (>= minimum payout)
//   node scripts/affiliates.mjs pay <code> "<payout reference>" --confirm   mark that partner's payable commissions as paid
//   node scripts/affiliates.mjs set <code> <active|paused|terminated> | payout <code> "<details>"
import { connect } from "./db-connect.mjs";

const MIN = 2500; // keep in sync with AFFILIATE.minPayoutCents in src/lib/affiliate.ts
const [cmd, ...args] = process.argv.slice(2);
const c = await connect("affiliates");
const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://YOUR-DOMAIN").replace(/\/$/, "");
const usd = (n) => (n / 100).toFixed(2);
const PAYABLE = "m.status = 'pending' and m.payable_after <= now()";
try {
  if (cmd === "add") {
    const [code, name, email, pct] = args;
    if (!/^[a-z0-9]{3,24}$/.test(code ?? "") || !name || !email) throw new Error('usage: add <code 3-24 a-z0-9> "<Name>" <email> [pct]');
    const { rows: [a] } = await c.query("insert into tradenotes.affiliates (code, name, email, commission_pct) values ($1,$2,$3,coalesce($4::int,30)) returning code, dashboard_token, commission_pct", [code, name, email, pct ?? null]);
    console.log(`Created ${a.code} at ${a.commission_pct}%\nLink:        ${site}/?ref=${a.code}\nStats (private, send to the partner): ${site}/partners/stats/${a.dashboard_token}`);
  } else if (cmd === "list") {
    const { rows } = await c.query(`select a.code, a.name, a.status, a.commission_pct pct,
      (select count(*) from tradenotes.referrals r where r.affiliate_id = a.id)::int signups,
      coalesce(sum(m.commission_cents) filter (where m.status <> 'void'), 0)::int earned,
      coalesce(sum(m.commission_cents) filter (where ${PAYABLE}), 0)::int payable,
      coalesce(sum(m.commission_cents) filter (where m.status = 'paid'), 0)::int paid
      from tradenotes.affiliates a left join tradenotes.commissions m on m.affiliate_id = a.id group by a.id order by a.created_at`);
    console.table(rows.map((r) => ({ code: r.code, name: r.name, status: r.status, pct: r.pct, signups: r.signups, earned: usd(r.earned), payable: usd(r.payable), paid: usd(r.paid) })));
  } else if (cmd === "due") {
    const { rows } = await c.query(`select a.code, a.name, a.email, a.payout_details, sum(m.commission_cents)::int total, count(*)::int n
      from tradenotes.commissions m join tradenotes.affiliates a on a.id = m.affiliate_id
      where ${PAYABLE} and a.status <> 'terminated' group by a.id having sum(m.commission_cents) >= ${MIN} order by total desc`);
    console.log("code,name,email,payout_details,payments,amount_usd");
    for (const r of rows) console.log([r.code, r.name, r.email, r.payout_details ?? "", r.n, usd(r.total)].map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","));
    if (!rows.length) console.error(`Nothing payable (minimum ${usd(MIN)} per partner).`);
  } else if (cmd === "pay") {
    const [code, ref] = args;
    if (!code || !ref || !args.includes("--confirm")) throw new Error('usage: pay <code> "<payout reference>" --confirm   (run `due` first and send the money BEFORE this)');
    const r = await c.query(`update tradenotes.commissions m set status = 'paid', paid_at = now(), payout_ref = $2 from tradenotes.affiliates a
      where a.id = m.affiliate_id and a.code = $1 and ${PAYABLE} returning m.commission_cents`, [code, ref]);
    console.log(`Marked ${r.rowCount} commissions paid, total $${usd(r.rows.reduce((s, x) => s + x.commission_cents, 0))}, ref "${ref}".`);
  } else if (cmd === "set") {
    const [code, status] = args;
    const r = await c.query("update tradenotes.affiliates set status = $2 where code = $1", [code, status]);
    console.log(r.rowCount ? `${code} is now ${status}.` : "No such code (or invalid status).");
  } else if (cmd === "payout") {
    const [code, details] = args;
    const r = await c.query("update tradenotes.affiliates set payout_details = $2 where code = $1", [code, details]);
    console.log(r.rowCount ? "Saved." : "No such code.");
  } else {
    console.log("Commands: add | list | due | pay | set | payout (see the header of this file)");
  }
} catch (e) { console.error(e.message); process.exitCode = 1; } finally { await c.end(); }
