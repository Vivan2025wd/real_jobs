"use server";

import { revalidatePath } from "next/cache";
import { sendApplicationStatusEmails } from "@/lib/email/application-status";
import { createClient } from "@/lib/supabase/server";

export type BulkApplicationStatus = "REVIEWED" | "SHORTLISTED" | "REJECTED";

export type BulkApplicationUpdateResult =
  | { success: true; updated: number; emailFailures: number }
  | { success: false; message: string };

type OwnedJob = {
  id: string;
  companies: { employer_id: string };
};

type UpdatedApplication = {
  id: string;
  users: { email: string };
  jobs: { title: string; companies: { company_name: string } };
};

type ExistingApplication = {
  id: string;
  status: string;
};

export async function bulkUpdateApplications(
  jobId: string,
  applicationIds: string[],
  status: BulkApplicationStatus
): Promise<BulkApplicationUpdateResult> {
  if (
    status !== "REVIEWED" &&
    status !== "SHORTLISTED" &&
    status !== "REJECTED"
  ) {
    return { success: false, message: "Invalid application status." };
  }

  const ids = [...new Set(applicationIds.filter((id) => typeof id === "string" && id.length > 0))];
  if (!jobId || ids.length === 0) {
    return {
      success: false,
      message: "Select at least one application to update.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, message: "Please sign in again to continue." };
  }

  const { data: job, error: ownershipError } = await supabase
    .from("jobs")
    .select("id, companies!inner(employer_id)")
    .eq("id", jobId)
    .maybeSingle()
    .returns<OwnedJob | null>();

  if (ownershipError) {
    console.error("[bulkUpdateApplications] Ownership check failed:", ownershipError);
    return { success: false, message: "Could not verify job ownership." };
  }
  if (!job || job.companies.employer_id !== user.id) {
    return { success: false, message: "You can only update applications for your own jobs." };
  }

  const { data: existingApplications, error: lookupError } = await supabase
    .from("applications")
    .select("id, status")
    .eq("job_id", jobId)
    .in("id", ids)
    .returns<ExistingApplication[]>();
  if (lookupError) {
    console.error("[bulkUpdateApplications] Application check failed:", lookupError);
    return { success: false, message: "Could not verify the selected applications." };
  }
  if ((existingApplications ?? []).length !== ids.length) {
    return {
      success: false,
      message: "Some selected applications are no longer available. Refresh and try again.",
    };
  }

  const { data: updatedApplications, error: updateError } = await supabase
    .from("applications")
    .update({ status } as never)
    .eq("job_id", jobId)
    .in("id", ids)
    .select("id, users!inner(email), jobs!inner(title, companies!inner(company_name))")
    .returns<UpdatedApplication[]>();

  if (updateError) {
    console.error("[bulkUpdateApplications] Update failed:", updateError);
    return { success: false, message: "The applications could not be updated." };
  }
  if (!updatedApplications || updatedApplications.length !== ids.length) {
    console.error(
      "[bulkUpdateApplications] The update did not affect every selected application."
    );
    return {
      success: false,
      message: "Not all applications could be updated. Refresh the list and check their statuses.",
    };
  }

  const changedApplicationIds = new Set(
    (existingApplications ?? [])
      .filter((application) => application.status !== status)
      .map((application) => application.id)
  );
  const { failed: emailFailures } = await sendApplicationStatusEmails(
    updatedApplications
      .filter((application) => changedApplicationIds.has(application.id))
      .map((application) => ({
        email: application.users.email,
        jobTitle: application.jobs.title,
        companyName: application.jobs.companies.company_name,
      })),
    status
  );

  revalidatePath(`/dashboard/employer/jobs/${jobId}`);
  revalidatePath("/dashboard/employer");

  return {
    success: true,
    updated: updatedApplications.length,
    emailFailures,
  };
}
