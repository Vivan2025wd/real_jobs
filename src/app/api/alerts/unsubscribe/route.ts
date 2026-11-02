import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(
      new URL("/alerts/unsubscribe?result=invalid", request.url),
      303
    );
  }
  return NextResponse.redirect(
    new URL(`/alerts/unsubscribe?token=${encodeURIComponent(token)}`, request.url),
    303
  );
}

export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token || !/^[a-f0-9]{48}$/i.test(token)) {
    return NextResponse.redirect(
      new URL("/alerts/unsubscribe?result=invalid", request.url),
      303
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("saved_searches")
    .update({ alert_frequency: "NONE" })
    .eq("unsubscribe_token", token)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[alerts:unsubscribe]", error);
    return NextResponse.redirect(
      new URL("/alerts/unsubscribe?result=error", request.url),
      303
    );
  }

  return NextResponse.redirect(
    new URL(
      `/alerts/unsubscribe?result=${data ? "success" : "invalid"}`,
      request.url
    ),
    303
  );
}
