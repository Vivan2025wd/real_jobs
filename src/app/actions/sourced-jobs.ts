"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { jobSchema } from "@/lib/validators/job";

const sourcedFieldsSchema = z.object({
  external_company_name: z.string().trim().min(2).max(160),
  source_url: z
    .string()
    .trim()
    .max(2048)
    .url()
    .refine(
      (value) => value.startsWith("https://") && new URL(value).protocol === "https:",
      "Source URL must start with https://"
    ),
  contact_email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
});

function formValue(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function createSourcedJob(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email || user.email.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) {
    redirect("/admin/jobs/new?error=Admin%20access%20is%20required");
  }

  const parsedJob = jobSchema.safeParse({
    title: formValue(formData, "title"),
    description: formValue(formData, "description"),
    location: formValue(formData, "location"),
    work_type: formValue(formData, "work_type"),
    category: formValue(formData, "category"),
    salary_min: formValue(formData, "salary_min"),
    salary_max: formValue(formData, "salary_max"),
    duration_days: 14,
  });
  const parsedSourcedFields = sourcedFieldsSchema.safeParse({
    external_company_name: formValue(formData, "external_company_name"),
    source_url: formValue(formData, "source_url"),
    contact_email: formValue(formData, "contact_email"),
  });

  if (!parsedJob.success) {
    redirect(`/admin/jobs/new?error=${encodeURIComponent(parsedJob.error.issues[0]?.message ?? "Check the job details")}`);
  }
  if (!parsedSourcedFields.success) {
    redirect(`/admin/jobs/new?error=${encodeURIComponent(parsedSourcedFields.error.issues[0]?.message ?? "Check the sourced listing details")}`);
  }

  const claimToken = randomBytes(32).toString("base64url");
  const claimTokenHash = createHash("sha256").update(claimToken).digest("hex");
  const adminDb = createAdminClient();
  const { data: jobId, error } = await adminDb.rpc("create_sourced_job", {
    p_admin_id: user.id,
    p_title: parsedJob.data.title,
    p_description: parsedJob.data.description,
    p_location: parsedJob.data.location,
    p_work_type: parsedJob.data.work_type,
    p_category: parsedJob.data.category ?? null,
    p_salary_min: parsedJob.data.salary_min ?? null,
    p_salary_max: parsedJob.data.salary_max ?? null,
    p_external_company_name: parsedSourcedFields.data.external_company_name,
    p_source_url: parsedSourcedFields.data.source_url,
    p_contact_email: parsedSourcedFields.data.contact_email,
    p_claim_token_hash: claimTokenHash,
  });

  if (error || !jobId) {
    const message = error?.message.includes("opted out")
      ? "This address has opted out of listing invitations."
      : "Could not create the sourced listing. Please try again.";
    console.error("[sourced jobs] create failed:", error);
    redirect(`/admin/jobs/new?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/admin/jobs");
  revalidatePath("/jobs");
  redirect("/admin/jobs?created=1");
}
