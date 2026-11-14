/** Signed session token (HMAC-SHA256, Web Crypto) — usable from middleware (edge) and server code. */
const enc = new TextEncoder();
export const COOKIE = "hq_session";
export const SESSION_HOURS = 12;

const b64u = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = ""; for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fromB64u = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const key = (secret: string) => crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);

export async function signSession(secret: string, sub: string, now = Date.now()): Promise<string> {
  const body = b64u(enc.encode(JSON.stringify({ sub, exp: now + SESSION_HOURS * 3600_000 })));
  const sig = await crypto.subtle.sign("HMAC", await key(secret), enc.encode(body));
  return `${body}.${b64u(sig)}`;
}

/** Returns the subject if the token is authentic and unexpired, else null. Never throws. */
export async function verifySession(secret: string | undefined, token: string | undefined, now = Date.now()): Promise<string | null> {
  if (!secret || secret.length < 16 || !token) return null;
  try {
    const [body, sig] = token.split(".");
    if (!body || !sig) return null;
    const ok = await crypto.subtle.verify("HMAC", await key(secret), fromB64u(sig), enc.encode(body));
    if (!ok) return null;
    const p = JSON.parse(new TextDecoder().decode(fromB64u(body))) as { sub?: string; exp?: number };
    return typeof p.sub === "string" && typeof p.exp === "number" && p.exp > now ? p.sub : null;
  } catch { return null; }
}
