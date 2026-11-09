import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic gate only (cookie present). The real session check happens server-side in getContext(),
 * which every /app page calls before touching data.
 */
export function middleware(req: NextRequest) {
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

export const config = { matcher: ["/app/:path*", "/login", "/signup"] };
