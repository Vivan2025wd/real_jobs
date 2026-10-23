// src/app/(auth)/callback/route.ts
import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const { searchParams, origin } = url;

  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Supabase bounced us back with an error (expired link, etc.)
  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(
        errorDescription ?? error
      )}`
    );
  }

  const supabase = await createClient();

  // ---- 1. Exchange credentials ----
  if (code) {
    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(exchangeError.message)}`
      );
    }
  } else if (token_hash && type) {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash,
      type,
    });
    if (verifyError) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(verifyError.message)}`
      );
    }
  } else {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(
        "Missing authentication parameters."
      )}`
    );
  }

  // ---- 2. Ensure the public.users row exists ----
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(
        "Could not load user session."
      )}`
    );
  }

  const { data: existingUserData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const existingUser = existingUserData as { role?: string } | null;

  let role: "EMPLOYER" | "JOB_SEEKER";
  if (existingUser?.role === "EMPLOYER" || existingUser?.role === "JOB_SEEKER") {
    role = existingUser.role;
  } else {
    role =
      (user.user_metadata?.role as string)?.toUpperCase() === "EMPLOYER"
        ? "EMPLOYER"
        : "JOB_SEEKER";

    // public.users is populated by the handle_new_user() trigger in
    // 20250103000000_auth_trigger.sql. Do not insert here — RLS has
    // no INSERT policy for users and the trigger handles it atomically.
  }

  // ---- 3. Redirect to dashboard (or `next` if safe) ----
  const defaultDashboard =
    role === "EMPLOYER" ? "/dashboard/employer" : "/dashboard/seeker";
  const target =
    next.startsWith("/") && !next.startsWith("//") ? next : defaultDashboard;

  return NextResponse.redirect(`${origin}${target}`);
}