import { pool } from "./db";

/** Owner-connection store for Discord check-ins (tradenotes.discord_checkins). Only a Discord id and what the member typed. */
export async function saveCheckin(c: { userId: string; day: string; followed: string; mistake: string | null; note: string | null }): Promise<void> {
  await pool.query(
    `insert into tradenotes.discord_checkins (discord_user_id, day, followed, mistake, note) values ($1, $2::date, $3, $4, $5)
     on conflict (discord_user_id, day) do update set followed = excluded.followed, mistake = excluded.mistake, note = excluded.note`,
    [c.userId, c.day, c.followed, c.mistake, c.note],
  );
}

export async function checkinDays(userId: string): Promise<string[]> {
  const r = await pool.query<{ d: string }>("select to_char(day, 'YYYY-MM-DD') as d from tradenotes.discord_checkins where discord_user_id = $1 order by day desc limit 400", [userId]);
  return r.rows.map((x) => x.d);
}

export async function forget(userId: string): Promise<number> {
  const r = await pool.query("delete from tradenotes.discord_checkins where discord_user_id = $1", [userId]);
  return r.rowCount ?? 0;
}
