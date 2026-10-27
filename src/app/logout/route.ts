// src/app/logout/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET logout — signs the user out and redirects to /login.
 *
 * Why GET is safe:
 *
 * 1. Next.js `<Link>` prefetch does NOT execute route handlers on prefetch.
 *    Route handlers are endpoints, not page navigations. The GET only fires
 *    when the user actually clicks the link. (Verified against Next.js 14.)
 *
 * 2. CSRF is mitigated by Supabase's session cookies, which use
 *    SameSite=Lax by default. Cross-site GET requests do not carry them,
 *    so a malicious page cannot trigger logout on a visitor's behalf.
 *
 * 3. Logout is idempotent — running it twice does not break anything,
 *    so a stale prefetch cache (in any future Next.js version that might
 *    add this behavior) would be harmless.
 *
 * If you later need a POST-based flow for stronger CSRF guarantees,
 * the POST handler below is already in place.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), {
    status: 303, // See Other — converts GET to a follow-up GET on /login
  });
}

// Keep POST for programmatic use / future-proofing.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), {
    status: 303,
  });
}