// src/middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * Middleware responsibilities:
 *   1. Refresh the Supabase session cookie on every request
 *   2. Block unauthenticated users from /dashboard/*
 *   3. Redirect authenticated users away from /login and /register
 *   4. Enforce role-based dashboards (EMPLOYER vs JOB_SEEKER)
 *
 * IMPORTANT: always call `supabase.auth.getUser()` here. It validates the
 * JWT against the auth server. Do NOT use `getSession()` — it only reads
 * the cookie and can be spoofed.
 */
export async function middleware(request: NextRequest) {
  // Start with a pass-through response. It will be replaced whenever
  // Supabase needs to write refreshed cookies back to the browser.
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          // Mirror the updated cookies onto the incoming request so the
          // current handler sees them …
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // … and onto the outgoing response so the browser gets them.
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session. MUST run before any early returns.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isAuthRoute =
    pathname === "/login" || pathname === "/register";

  const isDashboardRoute = pathname.startsWith("/dashboard");

  // ---- Rule 1: dashboard requires a session ----
  if (isDashboardRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return redirectWithCookies(url, supabaseResponse);
  }

  // ---- Rule 2: logged-in users skip the auth pages ----
  if (isAuthRoute && user) {
    const role = (user.user_metadata?.role ?? "").toUpperCase();
    const url = request.nextUrl.clone();
    url.pathname =
      role === "EMPLOYER" ? "/dashboard/employer" : "/dashboard/seeker";
    return redirectWithCookies(url, supabaseResponse);
  }

  // ---- Rule 3: role-based dashboard routing ----
  if (user && isDashboardRoute) {
    const role = (user.user_metadata?.role ?? "").toUpperCase();
    const isEmployerArea = pathname.startsWith("/dashboard/employer");
    const isSeekerArea = pathname.startsWith("/dashboard/seeker");

    // Employer trying to reach a seeker page → bounce to employer dashboard
    if (role === "EMPLOYER" && isSeekerArea) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard/employer";
      return redirectWithCookies(url, supabaseResponse);
    }

    // Seeker trying to reach an employer page → bounce to seeker dashboard
    if (role === "JOB_SEEKER" && isEmployerArea) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard/seeker";
      return redirectWithCookies(url, supabaseResponse);
    }
  }

  return supabaseResponse;
}

/**
 * Copy the refreshed Supabase cookies onto a redirect response.
 * Without this, an auth refresh happening on the same request that
 * triggers a redirect would be lost — causing an infinite login loop.
 */
function redirectWithCookies(url: URL, from: NextResponse) {
  const response = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     *   - _next/static, _next/image      (build assets)
     *   - favicon.ico, and common images (public files)
     *   - anything under /api/*          (Route Handlers do their own auth)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/).*)",
  ],
};