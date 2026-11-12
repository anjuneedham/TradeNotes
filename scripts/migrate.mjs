// Applies db/paste/*.sql (idempotent, safe to re-run) to DATABASE_URL. Runs before `next build` (see package.json "build").
// NEVER touches db/migrations/ (that folder contains a one-time destructive reset for a different project).
import fs from "node:fs";
import path from "node:path";
import { connect } from "./db-connect.mjs";

/** Update when a db/paste file adds or drops a table (also in verify-db.mjs). */
const EXPECTED_TABLES = 20;
const dir = path.join(process.cwd(), "db", "paste");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const client = await connect("migrate");

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
console.log(`[migrate] done. TradeNotes tables present: ${r.rows[0].n} (expected ${EXPECTED_TABLES})`);
await client.end();
if (r.rows[0].n !== EXPECTED_TABLES) { console.error("[migrate] unexpected table count"); process.exit(1); }
