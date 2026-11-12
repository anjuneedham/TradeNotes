import { NextResponse, type NextRequest } from "next/server";
import { cleanSrc } from "@/lib/db-config";
import { cleanRef, AFFILIATE } from "@/lib/affiliate-config";

/**
 * Optimistic gate only (cookie present). The real session check happens server-side in getContext(),
 * which every /app page calls before touching data.
 */
export function middleware(req: NextRequest) {
  const res = handle(req);
  // Attribution: remember the first ?src= tag (e.g. ig-ad, tt-dm) for 30 days; stored on the profile at first sign-in.
  const src = cleanSrc(req.nextUrl.searchParams.get("src"));
  if (src && !req.cookies.get("tn_src")) res.cookies.set("tn_src", src, { maxAge: 60 * 60 * 24 * 30, path: "/", sameSite: "lax", httpOnly: true });
  // Affiliate attribution: last valid ?ref= wins for 30 days; linked to the account at first sign-in.
  const ref = cleanRef(req.nextUrl.searchParams.get("ref"));
  if (ref) res.cookies.set("tn_ref", ref, { maxAge: 60 * 60 * 24 * AFFILIATE.cookieDays, path: "/", sameSite: "lax", httpOnly: true });
  return res;
}

function handle(req: NextRequest) {
  // Better Auth session cookie: "better-auth.session_token", prefixed "__Secure-" over HTTPS.
  const hasCookie = req.cookies.getAll().some((c) => c.name.endsWith("better-auth.session_token") && c.value.length > 0);
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/app") && !hasCookie) {
    const to = new URL("/login", req.url);
    to.searchParams.set("next", pathname);
    return NextResponse.redirect(to);
  }
  if (hasCookie && (pathname === "/login" || pathname === "/signup")) return NextResponse.redirect(new URL("/app", req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/", "/pricing", "/learn", "/partners", "/app/:path*", "/login", "/signup"] };
