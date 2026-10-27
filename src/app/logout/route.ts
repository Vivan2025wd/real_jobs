// src/app/logout/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST-only logout.
 *
 * GET is intentionally NOT implemented. Next.js <Link> prefetches GET
 * targets as soon as they enter the viewport. A GET /logout route would
 * therefore sign the user out the moment the sidebar or navbar rendered —
 * before the user ever clicked anything.
 *
 * Only a real form POST should be able to end the session. The UI uses
 * <form action="/logout" method="post"> for exactly this reason.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), {
    status: 303, // See Other — converts POST to a follow-up GET on /login
  });
}