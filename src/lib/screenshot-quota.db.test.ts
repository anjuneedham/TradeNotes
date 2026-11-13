import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";

// Integration test against a real database with db/paste applied. Runs only when FOUNDING_TEST_DATABASE_URL is set (CI database job, or locally).
const url = process.env.FOUNDING_TEST_DATABASE_URL;
describe.skipIf(!url)("screenshot quota counts real AND hypothetical-trade screenshots (real database)", () => {
  it("one per-user total across both tables, scoped by row-level security; the user's other data does not leak into it", async () => {
    process.env.DATABASE_URL = url;
    const { pool, withUser } = await import("./db");
    const { USER_SCREENSHOT_BYTES_SQL } = await import("./screenshots");
    const mk = async () => (await pool.query(`insert into public.tn_user (id,name,email,"emailVerified","createdAt","updatedAt") values (gen_random_uuid(),'t',$1,true,now(),now()) returning id`, [`quota-test-${randomUUID()}@example.com`])).rows[0].id as string;
    const [A, B] = [await mk(), await mk()];
    try {
      const total = (u: string) => withUser(u, async (q) => Number((await q<{ b: string }>(`select ${USER_SCREENSHOT_BYTES_SQL} as b`))[0].b));
      await withUser(A, (q) => q("select tradenotes.ensure_user()")); await withUser(B, (q) => q("select tradenotes.ensure_user()"));
      expect(await total(A)).toBe(0);
      await withUser(A, async (q) => {
        const [acct] = await q<{ id: string }>("select id from tradenotes.accounts limit 1");
        const [t] = await q<{ id: string }>("insert into tradenotes.trades (user_id, account_id, symbol, side, quantity, entry_price, opened_at) values ($1,$2,'X','long',1,1,now()) returning id", [A, acct.id]);
        const [bt] = await q<{ id: string }>("insert into tradenotes.backtest_trades (user_id, symbol, side, quantity, entry_price, opened_at) values ($1,'H','long',1,1,now()) returning id", [A]);
        await q("insert into tradenotes.trade_screenshots (trade_id, user_id, storage_path, size_bytes) values ($1,$2,$3,1000)", [t.id, A, `${A}/${t.id}/${randomUUID()}.png`]);
        await q("insert into tradenotes.backtest_screenshots (backtest_id, user_id, storage_path, size_bytes) values ($1,$2,$3,500)", [bt.id, A, `${A}/backtest/${bt.id}/${randomUUID()}.png`]);
        await q("insert into tradenotes.backtest_screenshots (backtest_id, user_id, storage_path, size_bytes) values ($1,$2,$3,250)", [bt.id, A, `${A}/backtest/${bt.id}/${randomUUID()}.webp`]);
      });
      expect(await total(A)).toBe(1750); // 1000 (real) + 500 + 250 (hypothetical)
      expect(await total(B)).toBe(0);    // B cannot see or count A's bytes
    } finally {
      await pool.query("delete from public.tn_user where id = any($1)", [[A, B]]);
      await pool.end();
    }
  });
});
