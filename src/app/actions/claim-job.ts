"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function claimJob(formData: FormData): Promise<void> {
  const tokenValue = formData.get("token");
  const token = typeof tokenValue === "string" ? tokenValue : "";
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) {
    redirect("/claim/invalid");
  }

  const claimPath = `/claim/${token}`;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(claimPath)}`);

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const typedProfile = profile as unknown as { role: string } | null;
  if (profileError) {
    console.error("[claim job] role check failed:", profileError);
    redirect(`${claimPath}?error=${encodeURIComponent("Could not verify your account.")}`);
  }
  if (typedProfile?.role !== "EMPLOYER") {
    redirect(`${claimPath}?error=${encodeURIComponent("Sign in with an employer account to claim this listing.")}`);
  }

  const adminDb = createAdminClient();
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { data: jobId, error } = await adminDb.rpc("claim_external_job", {
    p_token_hash: tokenHash,
    p_employer_id: user.id,
  });

  if (error || !jobId) {
    const message = error?.message.includes("employer account")
      ? "An employer account is required to claim this listing."
      : "This claim link is invalid, expired, or already used.";
    redirect(`${claimPath}?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/dashboard/employer");
  revalidatePath("/dashboard/employer/jobs");
  revalidatePath(`/dashboard/employer/jobs/${jobId}`);
  revalidatePath("/jobs");
  redirect(`/dashboard/employer/jobs/${jobId}?claimed=1`);
}
