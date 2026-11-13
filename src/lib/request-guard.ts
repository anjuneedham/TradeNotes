/**
 * CSRF guard for cookie-authenticated route handlers that change data (server actions already check this themselves).
 * Browsers always send Origin on cross-site POST/DELETE; it must match the host the request was sent to.
 */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return req.headers.get("sec-fetch-site") === "same-origin";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try { return new URL(origin).host === host; } catch { return false; }
}
