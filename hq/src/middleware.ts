import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, verifySession } from "@/lib/session";

/** First gate: nothing except /login is reachable without a valid owner session. Pages and actions re-check (defence in depth). */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/login") return NextResponse.next();
  const sub = await verifySession(process.env.HQ_SESSION_SECRET, req.cookies.get(COOKIE)?.value);
  const owner = (process.env.HQ_OWNER_EMAIL ?? "").trim().toLowerCase();
  if (sub && sub === owner) return NextResponse.next();
  return NextResponse.redirect(new URL("/login", req.url));
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
