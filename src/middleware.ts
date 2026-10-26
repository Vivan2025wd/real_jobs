// src/middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Route rules:
 *   1. /dashboard/* requires a session
 *   2. Logged-in users skip /login and /register
 *   3. Employer cannot reach seeker pages, seeker cannot reach employer pages
 *
 * Session refresh happens inside updateSession(). Every early-return path
 * must copy the refreshed cookies onto the redirect, otherwise the user is
 * logged out on the next request.
 */
export async function middleware(request: NextRequest) {
  let user: Awaited<ReturnType<typeof updateSession>>["user"] = null;
  let response: NextResponse;

  try {
    const result = await updateSession(request);
    user = result.user;
    response = result.response;
  } catch (err) {
    console.error("[middleware] updateSession failed:", err);
    response = NextResponse.next({ request });
    request.cookies.getAll().forEach((cookie) => {
      response.cookies.set({
        name: cookie.name,
        value: cookie.value,
        path: "/",
        sameSite: "lax",
        secure: request.nextUrl.protocol === "https:",
      });
    });
  }

  const { pathname } = request.nextUrl;
  const isAuthRoute = pathname === "/login" || pathname === "/register";
  const isDashboardRoute = pathname.startsWith("/dashboard");

  // Rule 1: dashboard requires a session
  if (isDashboardRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return redirectWithCookies(url, response);
  }

  // Rule 2: signed-in users skip auth pages
  if (isAuthRoute && user) {
    const role = (user.user_metadata?.role ?? "").toUpperCase();
    const url = request.nextUrl.clone();
    url.pathname =
      role === "EMPLOYER" ? "/dashboard/employer" : "/dashboard/seeker";
    return redirectWithCookies(url, response);
  }

  // Rule 3: role-based dashboard routing
  if (user && isDashboardRoute) {
    const role = (user.user_metadata?.role ?? "").toUpperCase();
    const isEmployerArea = pathname.startsWith("/dashboard/employer");
    const isSeekerArea = pathname.startsWith("/dashboard/seeker");

    if (role === "EMPLOYER" && isSeekerArea) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard/employer";
      return redirectWithCookies(url, response);
    }

    if (role === "JOB_SEEKER" && isEmployerArea) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard/seeker";
      return redirectWithCookies(url, response);
    }
  }

  return response;
}

/**
 * Copy the refreshed Supabase cookies onto a redirect response.
 * Without this, an auth refresh happening on the same request that
 * triggers a redirect would be lost — causing an infinite login loop.
 */
function redirectWithCookies(url: URL, from: NextResponse) {
  const redirectRes = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirectRes.cookies.set(cookie));
  return redirectRes;
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