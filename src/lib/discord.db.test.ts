import { describe, it, expect } from "vitest";

// Integration test against a real database with db/paste applied. Runs only when FOUNDING_TEST_DATABASE_URL is set.
const url = process.env.FOUNDING_TEST_DATABASE_URL;
describe.skipIf(!url)("Discord check-ins (real database)", () => {
  it("upserts one check-in per member per day, lists days, forgets a member, and is closed to the app roles", async () => {
    process.env.DATABASE_URL = url;
    const { pool } = await import("./db");
    const { saveCheckin, checkinDays, forget } = await import("./discord-store");
    await pool.query("delete from tradenotes.discord_checkins where discord_user_id in ('990000000000000001','990000000000000002')");
    const a = "990000000000000001", b = "990000000000000002";

    await saveCheckin({ userId: a, day: "2026-12-01", followed: "yes", mistake: null, note: null });
    await saveCheckin({ userId: a, day: "2026-12-01", followed: "no", mistake: "FOMO", note: "second run replaces the first" });   // same day: replaced
    await saveCheckin({ userId: a, day: "2026-12-02", followed: "partly", mistake: null, note: "x" });
    await saveCheckin({ userId: b, day: "2026-12-01", followed: "yes", mistake: null, note: null });
    expect(await checkinDays(a)).toEqual(["2026-12-02", "2026-12-01"]);
    const row = (await pool.query("select followed, mistake, note from tradenotes.discord_checkins where discord_user_id = $1 and day = '2026-12-01'", [a])).rows[0];
    expect(row).toEqual({ followed: "no", mistake: "FOMO", note: "second run replaces the first" });

    // constraints
    await expect(pool.query("insert into tradenotes.discord_checkins (discord_user_id, day, followed) values ('abc', '2026-12-03', 'yes')")).rejects.toThrow();
    await expect(pool.query("insert into tradenotes.discord_checkins (discord_user_id, day, followed) values ('990000000000000003', '2026-12-03', 'maybe')")).rejects.toThrow();
    await expect(pool.query("insert into tradenotes.discord_checkins (discord_user_id, day, followed, note) values ('990000000000000003', '2026-12-03', 'yes', $1)", ["n".repeat(281)])).rejects.toThrow();

    // forgetting one member leaves the other alone
    expect(await forget(a)).toBe(2);
    expect(await checkinDays(a)).toEqual([]);
    expect(await checkinDays(b)).toEqual(["2026-12-01"]);
    await forget(b);

    // the app's own database role cannot read it (owner connection only)
    const r = await pool.query("select has_table_privilege('app_user', 'tradenotes.discord_checkins', 'select') as s, has_table_privilege('app_user', 'tradenotes.discord_checkins', 'insert') as i");
    expect(r.rows[0]).toEqual({ s: false, i: false });
    await pool.end();
  });
});
