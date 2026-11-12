import { describe, it, expect } from "vitest";

// Integration test: runs only when FOUNDING_TEST_DATABASE_URL points at a database with db/paste applied (npm run test:db prepares one).
const url = process.env.FOUNDING_TEST_DATABASE_URL;
describe.skipIf(!url)("founding seats (real database)", () => {
  it("15 simultaneous claims yield exactly 10 seats; confirmed members keep theirs", async () => {
    process.env.DATABASE_URL = url;
    const { pool } = await import("./db");
    const { claimFoundingSeat, foundingSeatsLeft } = await import("./founding");
    await pool.query("delete from public.tn_user where email like 'founding-test-%'");
    const ids: string[] = [];
    for (let i = 0; i < 15; i++) {
      const r = await pool.query(`insert into public.tn_user (id, name, email, "emailVerified", "createdAt", "updatedAt") values (gen_random_uuid(), 'f', $1, true, now(), now()) returning id`, [`founding-test-${i}@example.com`]);
      ids.push(r.rows[0].id);
    }
    const results = await Promise.all(ids.map((id) => claimFoundingSeat(id)));
    expect(results.filter(Boolean).length).toBe(10);
    expect(await foundingSeatsLeft()).toBe(0);
    // a holder asking again keeps the seat; a loser still doesn't get one
    const winner = ids[results.indexOf(true)], loser = ids[results.indexOf(false)];
    expect(await claimFoundingSeat(winner)).toBe(true);
    expect(await claimFoundingSeat(loser)).toBe(false);
    // abandoned reservation expires and frees the seat
    await pool.query("update tradenotes.subscriptions set founding_claimed_at = now() - interval '3 hours' where user_id = $1", [winner]);
    expect(await foundingSeatsLeft()).toBe(1);
    expect(await claimFoundingSeat(loser)).toBe(true);
    await pool.query("delete from public.tn_user where email like 'founding-test-%'");
    await pool.end();
  });
});
