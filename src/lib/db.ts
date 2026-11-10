import { Pool, types } from "pg";
import { poolConfig } from "./db-config";

// timestamptz -> ISO string (instead of Date) so values serialise consistently.
types.setTypeParser(1184, (v) => new Date(v).toISOString());

const g = globalThis as unknown as { __tnPool?: Pool };
/** Owner connection. Bypasses row-level security: ONLY for auth library, webhooks and admin jobs. */
export const pool = (g.__tnPool ??= new Pool({ ...poolConfig(process.env.DATABASE_URL, process.env.DATABASE_SSL_CA), max: 5 }));

export type Q = <R = Record<string, unknown>>(text: string, params?: unknown[]) => Promise<R[]>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Run queries as the signed-in user inside ONE transaction: role app_user + app.user_id set,
 * so Postgres row-level security isolates tenants even if a query forgets a WHERE clause.
 * Throwing inside `fn` rolls everything back.
 */
export async function withUser<T>(userId: string, fn: (q: Q) => Promise<T>): Promise<T> {
  if (!UUID.test(userId)) throw new Error("invalid user id");
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("set local role app_user");
    await client.query("select set_config('app.user_id', $1, true)", [userId]);
    const q: Q = async (text, params) => (await client.query(text, params)).rows as never;
    const out = await fn(q);
    await client.query("commit");
    return out;
  } catch (e) {
    await client.query("rollback").catch(() => undefined);
    throw e;
  } finally {
    client.release();
  }
}
