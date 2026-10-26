// src/lib/supabase/server.ts
import "server-only";

import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "@/types/database.types";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[]
        ) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set({
                name,
                value,
                ...options,
                path: "/",
                sameSite: "lax",
                secure: process.env.NODE_ENV === "production",
                maxAge: options?.maxAge ?? 60 * 60 * 24 * 400,
              });
            });
          } catch (err) {
            // Server Components cannot write cookies; middleware refreshes
            // the session on the next request.
            console.error("[supabase/server] setAll failed:", err);
          }
        },
      },
    }
  );
}