import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const N = 16384, R = 8, P = 1, LEN = 64;
/** Format: scrypt$N$r$p$saltB64$hashB64 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const h = scryptSync(password, salt, LEN, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${h.toString("base64")}`;
}
export function verifyPassword(password: string, stored: string | undefined): boolean {
  try {
    if (!stored) return false;
    const [alg, n, r, p, salt, hash] = stored.split("$");
    if (alg !== "scrypt") return false;
    const want = Buffer.from(hash, "base64");
    const got = scryptSync(password, Buffer.from(salt, "base64"), want.length, { N: +n, r: +r, p: +p });
    return got.length === want.length && timingSafeEqual(got, want);
  } catch { return false; }
}

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export function base32Decode(s: string): Buffer {
  let bits = ""; for (const ch of s.toUpperCase().replace(/[\s=]/g, "")) { const i = B32.indexOf(ch); if (i < 0) throw new Error("bad base32"); bits += i.toString(2).padStart(5, "0"); }
  const out: number[] = []; for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(out);
}
export function base32Encode(buf: Buffer): string {
  let bits = ""; for (const b of buf) bits += b.toString(2).padStart(8, "0");
  let out = ""; for (let i = 0; i < bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5).padEnd(5, "0"), 2)];
  return out;
}
/** RFC 6238 TOTP (SHA-1, 30 s, 6 digits). */
export function totp(secretB32: string, atMs: number, digits = 6): string {
  const counter = Math.floor(atMs / 1000 / 30);
  const msg = Buffer.alloc(8); msg.writeBigUInt64BE(BigInt(counter));
  const h = createHmac("sha1", base32Decode(secretB32)).update(msg).digest();
  const o = h[h.length - 1] & 0xf;
  const code = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(code % 10 ** digits).padStart(digits, "0");
}
/** Accepts the current code and one step either side (clock drift). */
export function verifyTotp(secretB32: string, code: string, atMs = Date.now()): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  let ok = false;
  for (const d of [-1, 0, 1]) { const want = Buffer.from(totp(secretB32, atMs + d * 30_000)); if (timingSafeEqual(want, Buffer.from(code))) ok = true; }
  return ok;
}
