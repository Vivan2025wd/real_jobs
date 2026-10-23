import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { randomUUID } from "node:crypto";

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

type JobToVerify = {
  id: string;
  title: string;
  last_verified_at: string | null;
  created_at: string;
  companies: { employer_id: string; company_name: string };
  users: { email: string };
};

/**
 * Cron 1 — send verification emails.
 * Returns a small report for the cron response body.
 */
export async function dispatchVerificationEmails(): Promise<{
  processed: number;
  sent: number;
  failed: number;
}> {
  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - FOURTEEN_DAYS_MS).toISOString();

  const { data: jobs, error } = await supabase
    .from("jobs")
    .select(
      "id, title, last_verified_at, created_at, companies!inner(employer_id, company_name), users!inner(email)"
    )
    .eq("status", "ACTIVE")
    .is("verification_token", null)
    .or(`last_verified_at.lt.${cutoff},and(last_verified_at.is.null,created_at.lt.${cutoff})`)
    .returns<JobToVerify[]>();

  if (error) throw new Error(`Failed to load jobs to verify: ${error.message}`);
  if (!jobs?.length) return { processed: 0, sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;

  for (const job of jobs) {
    const token = randomUUID();
    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-job/${token}`;
    const employerEmail = job.users.email;

    try {
      await sendEmail({
        to: employerEmail,
        subject: `Still hiring for "${job.title}"?`,
        html: verificationEmailHtml({
          jobTitle: job.title,
          companyName: job.companies.company_name,
          verifyUrl,
        }),
      });

      await supabase
        .from("jobs")
        .update({
          verification_token: token,
          verification_sent_at: new Date().toISOString(),
        } as never)
        .eq("id", job.id);

      sent++;
    } catch (err) {
      console.error(`[cron:verify] failed for job ${job.id}:`, err);
      failed++;
    }
  }

  return { processed: jobs.length, sent, failed };
}

/**
 * Cron 2 — expire jobs whose verification window (48h) has elapsed.
 */
export async function expireStaleJobs(): Promise<{ expired: number }> {
  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - FORTY_EIGHT_HOURS_MS).toISOString();

  const { data: jobs, error } = await supabase
    .from("jobs")
    .select("id, title")
    .eq("status", "ACTIVE")
    .not("verification_token", "is", null)
    .lt("verification_sent_at", cutoff)
    .returns<{ id: string; title: string }[]>();

  if (error) throw new Error(`Failed to load jobs to expire: ${error.message}`);
  if (!jobs?.length) return { expired: 0 };

  const ids = jobs.map((j) => j.id);
  const { error: updateError } = await supabase
    .from("jobs")
    .update({
      status: "EXPIRED",
      verification_token: null,
      verification_sent_at: null,
    } as never)
    .in("id", ids);

  if (updateError) throw new Error(`Expire update failed: ${updateError.message}`);
  return { expired: ids.length };
}

// ---------------------------------------------------------------------------
// Inline HTML template — kept simple, styled inline for maximum email client
// compatibility.
// ---------------------------------------------------------------------------
function verificationEmailHtml({
  jobTitle,
  companyName,
  verifyUrl,
}: {
  jobTitle: string;
  companyName: string;
  verifyUrl: string;
}): string {
  const safeTitle = escapeHtml(jobTitle);
  const safeCompany = escapeHtml(companyName);
  return `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
      <tr><td align="center" style="padding:40px 16px;">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,0.05);">
          <tr><td style="padding:32px 32px 8px;">
            <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">${safeCompany}</p>
            <h1 style="margin:0;font-size:22px;color:#111827;">Still hiring for "${safeTitle}"?</h1>
            <p style="margin:16px 0 0;font-size:15px;line-height:1.6;color:#374151;">
              Your job listing on <strong>HireLoop</strong> is 14 days old. To keep the marketplace accurate, we re-verify every active listing.
            </p>
            <p style="margin:12px 0 0;font-size:15px;line-height:1.6;color:#374151;">
              Confirm the role is still open — or let us know it's filled. If we don't hear back within <strong>48 hours</strong>, the listing is automatically archived.
            </p>
          </td></tr>
          <tr><td align="center" style="padding:24px 32px 32px;">
            <a href="${verifyUrl}" style="display:inline-block;padding:12px 28px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">
              Confirm status →
            </a>
          </td></tr>
          <tr><td style="padding:16px 32px 24px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              This is an automated message from HireLoop. Replies are not monitored.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`.trim();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}