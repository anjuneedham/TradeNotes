// Applies db/paste/*.sql (idempotent, safe to re-run) to DATABASE_URL. Runs before `next build` (see package.json "build").
// NEVER touches db/migrations/ (that folder contains a one-time destructive reset for a different project).
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) { console.log("[migrate] DATABASE_URL not set; skipping (local/CI build)."); process.exit(0); }

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

const dir = path.join(process.cwd(), "db", "paste");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const client = new pg.Client(config(url));
try { await client.connect(); }
catch (e) { console.error(`[migrate] cannot connect to the database: ${e.code || e.message}`); process.exit(1); }

for (const f of files) {
  const sql = fs.readFileSync(path.join(dir, f), "utf8");
  try { await client.query("begin"); await client.query(sql); await client.query("commit"); console.log(`[migrate] ok      ${f}`); }
  catch (e) {
    await client.query("rollback").catch(() => {});
    console.error(`[migrate] FAILED  ${f}: ${e.message}`);
    await client.end().catch(() => {});
    process.exit(1);
  }
}
const r = await client.query("select count(*)::int as n from information_schema.tables where table_name like 'tn\\_%' or table_schema = 'tradenotes'");
console.log(`[migrate] done. TradeNotes tables present: ${r.rows[0].n} (expected 15)`);
await client.end();
if (r.rows[0].n !== 15) { console.error("[migrate] unexpected table count"); process.exit(1); }
