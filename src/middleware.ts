import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfigured, supabaseEnv } from "@/lib/supabase/env";

export async function middleware(req: NextRequest) {
  const needsAuth = req.nextUrl.pathname.startsWith("/app");
  if (!supabaseConfigured()) {
    // Public pages keep working before Supabase is configured; the app area says so explicitly.
    if (needsAuth) return NextResponse.redirect(new URL("/login?error=not_configured", req.url));
    return NextResponse.next();
  }
  let res = NextResponse.next({ request: req });
  const { url, key } = supabaseEnv();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser(); // validates JWT with Supabase Auth
  if (needsAuth && !user) {
    const to = new URL("/login", req.url);
    to.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(to);
  }
  if (user && ["/login", "/signup"].includes(req.nextUrl.pathname)) return NextResponse.redirect(new URL("/app", req.url));
  return res;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)$).*)"] };
