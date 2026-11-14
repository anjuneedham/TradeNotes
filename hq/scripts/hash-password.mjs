// Usage: node scripts/hash-password.mjs            -> prompts for a password, prints HQ_PASSWORD_HASH
//        node scripts/hash-password.mjs --totp     -> prints a new HQ_TOTP_SECRET + otpauth URL for your authenticator app
import { randomBytes, scryptSync } from "node:crypto";
import readline from "node:readline";
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
if (process.argv.includes("--totp")) {
  let bits = ""; for (const b of randomBytes(20)) bits += b.toString(2).padStart(8, "0");
  let s = ""; for (let i = 0; i < bits.length; i += 5) s += B32[parseInt(bits.slice(i, i + 5), 2)];
  console.log(`HQ_TOTP_SECRET=${s}\notpauth://totp/TradeNotes%20HQ?secret=${s}&issuer=TradeNotes%20HQ\n(Add the secret to your authenticator app, then set it as an env var. Do not commit it.)`);
  process.exit(0);
}
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question("New HQ password (min 12 chars; typed text is visible): ", (pw) => {
  rl.close();
  if (pw.length < 12) { console.error("Too short."); process.exit(1); }
  const salt = randomBytes(16);
  const h = scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1 });
  console.log(`HQ_PASSWORD_HASH=scrypt$16384$8$1$${salt.toString("base64")}$${h.toString("base64")}`);
});
