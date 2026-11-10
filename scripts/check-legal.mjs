// Fails (exit 1) while required legal details in src/lib/legal.ts are still "TODO". Run before launch: npm run check:legal
import fs from "node:fs";
const src = fs.readFileSync("src/lib/legal.ts", "utf8");
const need = ["businessName", "supportEmail"];
const missing = need.filter((k) => new RegExp(`${k}:\\s*"(TODO[^"]*|\\s*)"`, "i").test(src));
if (missing.length) { console.error(`[legal] NOT READY — fill in src/lib/legal.ts: ${missing.join(", ")}`); process.exit(1); }
const reviewed = /counselReviewed:\s*true/.test(src);
console.log(`[legal] required details are filled in. Lawyer-reviewed flag: ${reviewed ? "yes" : "NO (pages say they are unreviewed)"}`);
