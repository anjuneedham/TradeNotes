import "server-only";
import { redirect } from "next/navigation";
import { requireOwner } from "./auth";

/** Redirect back to a page with a one-line success / error message. */
export function flash(path: string, kind: "ok" | "err", msg: string): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}${kind}=${encodeURIComponent(msg.slice(0, 300))}`);
}
/** Wrap a server action: owner check first, then run; thrown errors become an error flash (redirects pass through). */
export async function guarded(path: string, fn: () => Promise<string | void>): Promise<never> {
  await requireOwner();
  let msg: string | void;
  try { msg = await fn(); }
  catch (e) {
    if (e instanceof Error && (e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e;
    const m = e instanceof Error ? e.message : "Something went wrong";
    const friendly = /duplicate key|unique/i.test(m) ? "That already exists." : m;
    console.error("[hq action]", m);
    flash(path, "err", friendly);
  }
  return flash(path, "ok", msg || "Saved.");
}
export const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
export const opt = (fd: FormData, k: string) => str(fd, k) || null;
export const int = (fd: FormData, k: string, d = 0) => { const n = parseInt(str(fd, k), 10); return Number.isFinite(n) && n >= 0 ? n : d; };
export const num = (fd: FormData, k: string): number | null => { const s = str(fd, k); if (!s) return null; const n = Number(s); return Number.isFinite(n) ? n : null; };
export const uuid = (v: string) => { if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) throw new Error("Bad id."); return v; };
