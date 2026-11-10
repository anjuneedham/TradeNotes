// Shared connection helper for build-time scripts (same TLS rules as src/lib/db-config.ts).
import pg from "pg";
export function config(raw) {
  let u; try { u = new URL(raw); } catch { return { connectionString: raw }; }
  const mode = u.searchParams.get("sslmode"); u.searchParams.delete("sslmode");
  const h = u.hostname; const local = h === "localhost" || h === "127.0.0.1" || h === "::1";
  let ssl;
  if (process.env.DATABASE_SSL_CA) ssl = { ca: process.env.DATABASE_SSL_CA, rejectUnauthorized: true };
  else if (local && (!mode || mode === "disable")) ssl = undefined;
  else if (/supabase\.(co|com)$/.test(h)) ssl = { rejectUnauthorized: false };
  else ssl = { rejectUnauthorized: true };
  return { connectionString: u.toString(), ssl };
}
export async function connect(tag) {
  const url = process.env.DATABASE_URL;
  if (!url) { console.log(`[${tag}] DATABASE_URL not set; skipping (local/CI build).`); process.exit(0); }
  const client = new pg.Client(config(url));
  try { await client.connect(); } catch (e) { console.error(`[${tag}] cannot connect to the database: ${e.code || e.message}`); process.exit(1); }
  return client;
}
