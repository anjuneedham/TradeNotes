import "server-only";
import { Pool, types } from "pg";
import { poolConfig } from "./db-config";

types.setTypeParser(1184, (v) => new Date(v).toISOString());   // timestamptz -> ISO string
types.setTypeParser(1082, (v) => v);                            // date -> 'YYYY-MM-DD' (no timezone shifting)
types.setTypeParser(1700, (v) => Number(v));                    // numeric -> number (money amounts here are small)
types.setTypeParser(20, (v) => Number(v));                      // bigint -> number

const g = globalThis as unknown as { __hqPool?: Pool };
/** Owner connection (bypasses RLS). HQ is single-user and owner-only, so this is its only connection. */
export const pool = (g.__hqPool ??= new Pool({ ...poolConfig(process.env.DATABASE_URL, process.env.DATABASE_SSL_CA), max: 5 }));

export async function q<R = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<R[]> {
  return (await pool.query(text, params)).rows as R[];
}
export async function tx<T>(fn: (q: <R = Record<string, unknown>>(t: string, p?: unknown[]) => Promise<R[]>) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query("begin");
    const out = await fn(async (t, p = []) => (await c.query(t, p)).rows as never);
    await c.query("commit");
    return out;
  } catch (e) { await c.query("rollback").catch(() => undefined); throw e; } finally { c.release(); }
}
