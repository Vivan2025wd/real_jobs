"use server";

import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

export async function confirmEmailUnsubscribe(formData: FormData): Promise<void> {
  const tokenValue = formData.get("token");
  const token = typeof tokenValue === "string" ? tokenValue : "";
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) redirect("/email-preferences/unsubscribe/invalid");

  const adminDb = createAdminClient();
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { data: record, error: tokenError } = await adminDb
    .from("email_unsubscribe_tokens")
    .select("email")
    .eq("token_hash", tokenHash)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (tokenError) {
    console.error("[email unsubscribe] token lookup failed:", tokenError);
    redirect("/email-preferences/unsubscribe/invalid");
  }
  if (!record) redirect("/email-preferences/unsubscribe/invalid");

  const { error: suppressionError } = await adminDb
    .from("email_suppressions")
    .upsert({ email: record.email.toLowerCase(), reason: "external_job_invitation" });
  if (suppressionError) {
    console.error("[email unsubscribe] suppression failed:", suppressionError);
    redirect("/email-preferences/unsubscribe/invalid?error=1");
  }

  const { error: deleteError } = await adminDb
    .from("email_unsubscribe_tokens")
    .delete()
    .eq("token_hash", tokenHash);
  if (deleteError) console.error("[email unsubscribe] token cleanup failed:", deleteError);

  redirect("/email-preferences/unsubscribe/done");
}
