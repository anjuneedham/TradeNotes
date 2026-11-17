import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";

// Integration test against a real database with db/paste applied. Runs only when FOUNDING_TEST_DATABASE_URL is set.
const url = process.env.FOUNDING_TEST_DATABASE_URL;
describe.skipIf(!url)("affiliate flow (real database)", () => {
  it("attributes, accrues once per payment, holds, voids on refund, and pays out via the CLI", async () => {
    process.env.DATABASE_URL = url;
    const { pool } = await import("./db");
    const { attachReferral, accrueCommission, voidUnpaidCommissions } = await import("./affiliate");
    await pool.query("delete from public.tn_user where email like 'aff-test-%'");
    await pool.query("delete from tradenotes.commissions; delete from tradenotes.referrals; delete from tradenotes.affiliates");
    const mk = async (e: string) => (await pool.query(`insert into public.tn_user (id,name,email,"emailVerified","createdAt","updatedAt") values (gen_random_uuid(),'t',$1,true,now(),now()) returning id`, [e])).rows[0].id as string;
    const [u1, u2, self] = [await mk("aff-test-1@example.com"), await mk("aff-test-2@example.com"), await mk("aff-test-self@example.com")];
    const cli = (...a: string[]) => execFileSync("node", ["scripts/affiliates.mjs", ...a], { env: { ...process.env, DATABASE_URL: url }, encoding: "utf8" });
    expect(cli("add", "fxking", "FX King", "aff-test-self@example.com")).toContain("?ref=fxking");

    await attachReferral(u1, "aff-test-1@example.com", "fxking");
    await attachReferral(u1, "aff-test-1@example.com", "nonexistent");
    await attachReferral(self, "aff-test-self@example.com", "fxking");          // self-referral ignored
    expect((await pool.query("select count(*)::int n from tradenotes.referrals")).rows[0].n).toBe(1);

    // payment 40 days ago -> payable; payment now -> still held
    const pay = async (id: string, userId: string, cents: number, ago: number) => {
      const occurred = new Date(Date.now() - ago * 86400000).toISOString();
      const c = await pool.connect();
      try {
        await c.query("begin");
        await c.query("insert into tradenotes.payments (id,user_id,amount_cents,currency,status,occurred_at) values ($1,$2,$3,'USD','paid',$4)", [id, userId, cents, occurred]);
        await accrueCommission(c, userId, { id, amount_cents: cents, occurred_at: occurred });
        await accrueCommission(c, userId, { id, amount_cents: cents, occurred_at: occurred }); // replay: no double commission
        await c.query("commit");
      } finally { c.release(); }
    };
    await pay("p_old", u1, 12000, 40);   // annual $120 -> $36, payable
    await pay("p_new", u1, 1200, 0);     // within 12 months of first payment -> $3.60, held
    await pay("p_other", u2, 1200, 0);   // not referred -> nothing
    const rows = (await pool.query("select payment_id, commission_cents from tradenotes.commissions order by commission_cents desc")).rows;
    expect(rows).toEqual([{ payment_id: "p_old", commission_cents: 3600 }, { payment_id: "p_new", commission_cents: 360 }]);

    expect(cli("due")).toContain('"fxking"');                                   // $36.00 >= $25 minimum
    expect(cli("pay", "fxking", "test-ref", "--confirm")).toContain("Marked 1 commissions paid, total $36.00");
    expect((await pool.query("select status from tradenotes.commissions where payment_id='p_new'")).rows[0].status).toBe("pending"); // still held

    const c = await pool.connect(); await voidUnpaidCommissions(c, u1); c.release();
    expect((await pool.query("select status from tradenotes.commissions where payment_id='p_new'")).rows[0].status).toBe("void");
    expect((await pool.query("select status from tradenotes.commissions where payment_id='p_old'")).rows[0].status).toBe("paid");

    await pool.query("delete from public.tn_user where email like 'aff-test-%'");          // account deletion keeps accounting rows
    expect((await pool.query("select count(*)::int n from tradenotes.commissions where user_id is null")).rows[0].n).toBe(2);
    await pool.query("delete from tradenotes.commissions; delete from tradenotes.affiliates");
    await pool.end();
  });
});
