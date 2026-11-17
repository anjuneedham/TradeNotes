import { pool } from "./db";
import { FOUNDING_OFFER, priceCents, type Interval, type PlanId } from "./plans";

/** A reserved-but-unpaid seat is held this long, then released so an abandoned checkout can't block a real buyer. */
export const RESERVATION_HOURS = 2;

/** Discounted monthly price in cents for a paid plan (whole cents, never below 1). */
export const foundingPriceCents = (plan: Exclude<PlanId, "free">, interval: Interval = "month") =>
  Math.max(1, Math.round(priceCents(plan, interval) * (100 - FOUNDING_OFFER.discountPct) / 100));

/** Seats still open given how many are held (confirmed + live reservations). Never negative. */
export const seatsLeft = (taken: number) => Math.max(0, FOUNDING_OFFER.seats - taken);

const TAKEN_SQL = `select count(*)::int as n from tradenotes.subscriptions
  where is_founding_member or (founding_claimed_at is not null and founding_claimed_at > now() - make_interval(hours => ${RESERVATION_HOURS}))`;

/** Seats left right now; null if the database can't be read (callers then show generic copy rather than a wrong number). */
export async function foundingSeatsLeft(): Promise<number | null> {
  try { return seatsLeft((await pool.query(TAKEN_SQL)).rows[0].n); } catch { return null; }
}

/**
 * Reserve (or keep) a founding seat for this user. Serialised with an advisory lock so two simultaneous checkouts
 * can never take the 11th seat. Returns true if the user now holds a seat.
 */
export async function claimFoundingSeat(userId: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(hashtext('tradenotes.founding'))");
    await client.query("insert into tradenotes.subscriptions (user_id) values ($1) on conflict do nothing", [userId]);
    const { rows: [me] } = await client.query(
      `select is_founding_member as member, (founding_claimed_at is not null and founding_claimed_at > now() - make_interval(hours => ${RESERVATION_HOURS})) as live
       from tradenotes.subscriptions where user_id = $1`, [userId]);
    if (me.member) { await client.query("commit"); return true; } // already a confirmed member
    const { rows: [t] } = await client.query(`${TAKEN_SQL} and user_id <> $1`, [userId]);
    const ok = me.live || seatsLeft(t.n) > 0;
    if (ok) await client.query("update tradenotes.subscriptions set founding_claimed_at = now() where user_id = $1", [userId]);
    await client.query("commit");
    return ok;
  } catch (e) {
    await client.query("rollback").catch(() => undefined);
    throw e;
  } finally { client.release(); }
}
