// Applies hq/db/paste/*.sql (idempotent) to DATABASE_URL, then seeds default launch tasks. Runs before `next build`.
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) { console.log("[hq-migrate] DATABASE_URL not set; skipping (local/CI build)."); process.exit(0); }
function config(raw) {
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
const client = new pg.Client(config(url));
try { await client.connect(); } catch (e) { console.error(`[hq-migrate] cannot connect: ${e.code || e.message}`); process.exit(1); }
const dir = path.join(process.cwd(), "db", "paste");
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
  try { await client.query("begin"); await client.query(fs.readFileSync(path.join(dir, f), "utf8")); await client.query("commit"); console.log(`[hq-migrate] ok      ${f}`); }
  catch (e) { await client.query("rollback").catch(() => {}); console.error(`[hq-migrate] FAILED  ${f}: ${e.message}`); await client.end().catch(() => {}); process.exit(1); }
}
const r = await client.query("select count(*)::int n from information_schema.tables where table_schema='hq'");
console.log(`[hq-migrate] done. hq tables: ${r.rows[0].n}`);
await client.end();
