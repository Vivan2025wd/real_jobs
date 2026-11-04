"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { createClient } from "@/lib/supabase/server";

export type SubmitApplicationResult =
  | { ok: true }
  | { ok: false; error: string };

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

export async function submitApplication(
  jobId: string,
  coverLetter: string,
  consent: boolean
): Promise<SubmitApplicationResult> {
  if (!consent) return { ok: false, error: "Please confirm your consent to apply." };
  if (typeof jobId !== "string" || !/^[0-9a-f-]{36}$/i.test(jobId)) {
    return { ok: false, error: "This job listing is invalid." };
  }
  if (typeof coverLetter !== "string") {
    return { ok: false, error: "Cover letter must be 3000 characters or fewer." };
  }
  const normalizedCoverLetter = coverLetter.trim();
  if (normalizedCoverLetter.length > 3000) {
    return { ok: false, error: "Cover letter must be 3000 characters or fewer." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in again to apply." };

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("role, resume_url")
    .eq("id", user.id)
    .maybeSingle();
  const typedProfile = profile as unknown as {
    role: string;
    resume_url: string | null;
  } | null;

  if (profileError) {
    console.error("[applications] profile load failed:", profileError);
    return { ok: false, error: "Could not verify your profile. Please try again." };
  }
  if (!typedProfile || typedProfile.role !== "JOB_SEEKER") {
    return { ok: false, error: "Only job seekers can apply to listings." };
  }
  if (!typedProfile.resume_url) {
    return { ok: false, error: "Add a resume to your profile before applying." };
  }

  const adminDb = createAdminClient();
  const { data: applicationId, error: insertError } = await adminDb.rpc(
    "submit_application",
    {
      p_seeker_id: user.id,
      p_job_id: jobId,
      p_cover_letter: normalizedCoverLetter || null,
      p_consent: consent,
    }
  );

  if (insertError || !applicationId) {
    const message = insertError?.message ?? "";
    if (message.includes("duplicate key") || message.includes("applications_job_id_seeker_id_key")) {
      return { ok: false, error: "You have already applied to this job." };
    }
    if (message.includes("20 applications")) {
      return { ok: false, error: "You have reached the limit of 20 applications in 24 hours." };
    }
    if (message.includes("resume")) {
      return { ok: false, error: "Add a resume to your profile before applying." };
    }
    if (message.includes("no longer accepting")) {
      return { ok: false, error: "This job is no longer accepting applications." };
    }
    if (message.includes("Consent")) {
      return { ok: false, error: "Please confirm your consent to apply." };
    }
    console.error("[applications] submit failed:", insertError);
    return { ok: false, error: "Could not submit your application. Please try again." };
  }

  // The notification RPC intentionally returns no details for unclaimed sourced
  // listings. Applicant data is never sent to those external contacts.
  const { data: notification, error: notificationError } = await adminDb.rpc(
    "get_application_notification_details",
    { p_application_id: applicationId }
  );
  if (notificationError) {
    console.error("[applications] employer notification lookup failed:", notificationError);
  } else if (notification?.[0]) {
    const details = notification[0];
    try {
      await sendEmail({
        to: details.employer_email,
        subject: `New application for ${details.job_title}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 16px">
          <h1>New application received</h1>
          <p><strong>${escapeHtml(details.seeker_email ?? "A candidate")}</strong> applied for
          <strong>${escapeHtml(details.job_title)}</strong> at ${escapeHtml(details.company_name)}.</p>
          <a href="${escapeHtml(process.env.NEXT_PUBLIC_APP_URL ?? "")}/dashboard/employer/jobs">Review applicants</a>
        </div>`,
      });
    } catch (emailError) {
      console.error("[applications] employer notification email failed:", emailError);
    }
  }

  return { ok: true };
}
