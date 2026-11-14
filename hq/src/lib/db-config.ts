import type { PoolConfig } from "pg";

/**
 * Build pg pool settings from DATABASE_URL.
 * - We strip `sslmode` from the URL and decide TLS explicitly (pg lets URL params override options, which made behaviour surprising).
 * - DATABASE_SSL_CA (PEM) => full certificate verification on any host (recommended; download the CA from the Supabase dashboard).
 * - Supabase hosts without a CA: encrypted but NOT verified (Supabase's pooler uses a private CA absent from system stores). Known issue, see docs.
 * - Other remote hosts (Neon etc.): verified TLS. localhost/unix socket: no TLS.
 */
export function poolConfig(url: string | undefined, ca?: string): PoolConfig {
  if (!url) return {};
  let u: URL;
  try { u = new URL(url); } catch { return { connectionString: url }; }
  const mode = u.searchParams.get("sslmode");
  u.searchParams.delete("sslmode");
  const host = u.hostname;
  const local = host === "localhost" || host === "127.0.0.1" || host === "::1" || host.startsWith("/");
  let ssl: PoolConfig["ssl"];
  if (ca) ssl = { ca, rejectUnauthorized: true };
  else if (local && (!mode || mode === "disable")) ssl = undefined;
  else if (/\.supabase\.(co|com)$/.test(host) || /pooler\.supabase\.com$/.test(host)) ssl = { rejectUnauthorized: false };
  else ssl = { rejectUnauthorized: true };
  return { connectionString: u.toString(), ssl };
}

/** Attribution tags we accept from ?src= (kept strict: it is stored in the database). */
export const SRC_RE = /^[a-z0-9-]{1,24}$/;
export const cleanSrc = (v: string | null | undefined): string | null => {
  const s = (v ?? "").trim().toLowerCase();
  return SRC_RE.test(s) ? s : null;
};
