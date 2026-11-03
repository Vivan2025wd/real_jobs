import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  return NextResponse.redirect(
    new URL(`/email-preferences/unsubscribe/${encodeURIComponent(params.token)}`, _request.url)
  );
}

export async function POST(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(params.token)) {
    return NextResponse.json({ error: "Invalid unsubscribe token" }, { status: 400 });
  }

  const adminDb = createAdminClient();
  const tokenHash = createHash("sha256").update(params.token).digest("hex");
  const { data: token, error: tokenError } = await adminDb
    .from("email_unsubscribe_tokens")
    .select("email")
    .eq("token_hash", tokenHash)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (tokenError) {
    console.error("[email unsubscribe] one-click token lookup failed:", tokenError);
    return NextResponse.json({ error: "Could not process unsubscribe request" }, { status: 500 });
  }
  if (!token) return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });

  const { error: suppressionError } = await adminDb
    .from("email_suppressions")
    .upsert({ email: token.email.toLowerCase(), reason: "external_job_invitation" });
  if (suppressionError) {
    console.error("[email unsubscribe] one-click suppression failed:", suppressionError);
    return NextResponse.json({ error: "Could not process unsubscribe request" }, { status: 500 });
  }

  const { error: deleteError } = await adminDb
    .from("email_unsubscribe_tokens")
    .delete()
    .eq("token_hash", tokenHash);
  if (deleteError) console.error("[email unsubscribe] one-click cleanup failed:", deleteError);

  return NextResponse.json({ ok: true });
}
