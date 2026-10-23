// src/lib/supabase/middleware.ts
//
// Session-refresh helper used by src/middleware.ts. Its only responsibility
// is to call supabase.auth.getUser() and return an updated response whose
// cookies carry the refreshed session. Route rules stay in src/middleware.ts.
import { NextResponse, type NextRequest } from "next/server";
import {
  createServerClient,
  type CookieOptions,
} from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";

type CookieToSet = {
  name: string;
  value: string;
  options?: CookieOptions;
};

export type SessionRefreshResult = {
  supabase: SupabaseClient;
  user: User | null;
  response: NextResponse;
};

export async function updateSession(
  request: NextRequest
): Promise<SessionRefreshResult> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          // Mirror the refreshed cookies onto the incoming request so the
          // current handler sees them …
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // … and rebuild the response so the browser receives them.
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // This call validates the JWT against the auth server and triggers the
  // cookie refresh that `setAll` just handled.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user, response };
}