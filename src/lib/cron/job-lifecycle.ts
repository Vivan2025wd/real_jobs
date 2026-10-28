import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { randomUUID } from "node:crypto";

const VERIFICATION_CYCLE_DAYS = 14;
const VERIFICATION_GRACE_HOURS = 48;
const STALE_THRESHOLD_DAYS = 3;
const HOT_THRESHOLD = 10;
const EXPIRING_WINDOW_HOURS = 24;

// ───────────────────────────────────────────────────────────────────────────
// Verification emails (unchanged behavior, kept for long-duration jobs)
// ───────────────────────────────────────────────────────────────────────────
type JobToVerify = {
  id: string;
  title: string;
  created_at: string;
  last_verified_at: string | null;
  companies: {
    employer_id: string;
    company_name: string;
    users: { email: string };
  };
};

export async function dispatchVerificationEmails(): Promise<{
  processed: number;
  sent: number;
  failed: number;
}> {
  const supabase = createAdminClient();
  const cutoff = new Date(
    Date.now() - VERIFICATION_CYCLE_DAYS * 86_400_000
  ).toISOString();

  const { data: jobs, error } = await supabase
    .from("jobs")
    .select(
      "id, title, created_at, last_verified_at, companies!inner(employer_id, company_name, users!inner(email))"
    )
    .eq("status", "ACTIVE")
    .is("verification_token", null)
    // Only verify jobs that will still be live when the grace window ends
    .gt("expires_at", new Date(Date.now() + VERIFICATION_GRACE_HOURS * 3_600_000).toISOString())
    .or(`last_verified_at.lt.${cutoff},and(last_verified_at.is.null,created_at.lt.${cutoff})`)
    .returns<JobToVerify[]>();

  if (error) throw new Error(`verify load failed: ${error.message}`);
  if (!jobs?.length) return { processed: 0, sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;

  for (const job of jobs) {
    const token = randomUUID();
    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-job/${token}`;

    try {
      await sendEmail({
        to: job.companies.users.email,
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
      console.error(`[cron:verify] ${job.id} failed:`, err);
      failed++;
    }
  }
  return { processed: jobs.length, sent, failed };
}

// ───────────────────────────────────────────────────────────────────────────
// Expire jobs whose expires_at has passed, or whose verification window closed
// ───────────────────────────────────────────────────────────────────────────
export async function expireStaleJobs(): Promise<{ expired: number }> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const graceCutoff = new Date(
    Date.now() - VERIFICATION_GRACE_HOURS * 3_600_000
  ).toISOString();

  const { data: jobs, error } = await supabase
    .from("jobs")
    .select("id, title")
    .eq("status", "ACTIVE")
    .or(`expires_at.lte.${now},and(verification_token.not.is.null,verification_sent_at.lt.${graceCutoff})`)
    .returns<{ id: string; title: string }[]>();

  if (error) throw new Error(`expire load failed: ${error.message}`);
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

  if (updateError) throw new Error(`expire update failed: ${updateError.message}`);
  return { expired: ids.length };
}

// ───────────────────────────────────────────────────────────────────────────
// Notify employers when a job hits 10+ applicants
// ───────────────────────────────────────────────────────────────────────────
type HotJob = {
  id: string;
  title: string;
  company_id: string;
  created_at: string;
  companies: { employer_id: string; company_name: string; users: { email: string } };
};

export async function notifyHotJobs(): Promise<{ processed: number; sent: number; failed: number }> {
  const supabase = createAdminClient();

  const { data: jobs, error } = await supabase
    .from("jobs")
    .select("id, title, company_id, created_at, companies!inner(employer_id, company_name, users!inner(email))")
    .eq("status", "ACTIVE")
    .is("notified_10_applicants_at", null)
    .returns<HotJob[]>();

  if (error) throw new Error(`hot jobs load failed: ${error.message}`);
  if (!jobs?.length) return { processed: 0, sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;

  for (const job of jobs) {
    const { count } = await supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("job_id", job.id);

    if (!count || count < HOT_THRESHOLD) continue;

    try {
      await sendEmail({
        to: job.companies.users.email,
        subject: `🔥 ${count} candidates applied to "${job.title}"`,
        html: hotJobEmailHtml({
          jobTitle: job.title,
          companyName: job.companies.company_name,
          applicantCount: count,
          dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/employer/jobs/${job.id}`,
        }),
      });
      await supabase
        .from("jobs")
        .update({ notified_10_applicants_at: new Date().toISOString() } as never)
        .eq("id", job.id);
      sent++;
    } catch (err) {
      console.error(`[cron:hot] ${job.id} failed:`, err);
      failed++;
    }
  }
  return { processed: jobs.length, sent, failed };
}

// ───────────────────────────────────────────────────────────────────────────
// Suggest improvements when a job has 0 applicants after 3 days
// ───────────────────────────────────────────────────────────────────────────
type StaleJob = {
  id: string;
  title: string;
  description: string;
  category: string | null;
  location: string;
  work_type: string;
  salary_min: number | null;
  salary_max: number | null;
  created_at: string;
  company_id: string;
  companies: { employer_id: string; company_name: string; users: { email: string } };
};

export async function notifyStaleJobs(): Promise<{ processed: number; sent: number; failed: number }> {
  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - STALE_THRESHOLD_DAYS * 86_400_000).toISOString();

  const { data: jobs, error } = await supabase
    .from("jobs")
    .select(
      "id, title, description, category, location, work_type, salary_min, salary_max, created_at, company_id, companies!inner(employer_id, company_name, users!inner(email))"
    )
    .eq("status", "ACTIVE")
    .is("notified_stale_at", null)
    .lte("created_at", cutoff)
    .returns<StaleJob[]>();

  if (error) throw new Error(`stale jobs load failed: ${error.message}`);
  if (!jobs?.length) return { processed: 0, sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;

  for (const job of jobs) {
    const { count } = await supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("job_id", job.id);

    if (count && count > 0) continue; // Already has applicants

    const suggestions = await buildSuggestions(supabase, job);
    const daysLive = Math.floor(
      (Date.now() - new Date(job.created_at).getTime()) / 86_400_000
    );

    try {
      await sendEmail({
        to: job.companies.users.email,
        subject: `"${job.title}" has 0 applicants after ${daysLive} days`,
        html: staleJobEmailHtml({
          jobTitle: job.title,
          companyName: job.companies.company_name,
          daysLive,
          suggestions,
          editUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/employer/jobs/${job.id}/edit`,
        }),
      });
      await supabase
        .from("jobs")
        .update({ notified_stale_at: new Date().toISOString() } as never)
        .eq("id", job.id);
      sent++;
    } catch (err) {
      console.error(`[cron:stale] ${job.id} failed:`, err);
      failed++;
    }
  }
  return { processed: jobs.length, sent, failed };
}

// ───────────────────────────────────────────────────────────────────────────
// Suggest improvements based on job data
// ───────────────────────────────────────────────────────────────────────────
async function buildSuggestions(
  supabase: ReturnType<typeof createAdminClient>,
  job: StaleJob
): Promise<{ title: string; body: string }[]> {
  const out: { title: string; body: string }[] = [];

  // 1. Description length
  if (job.description.length < 500) {
    out.push({
      title: "Expand the description",
      body: `Your description is only ${job.description.length} characters. Listings with 500+ characters get roughly 2× more applicants — add responsibilities, requirements, and what makes the role interesting.`,
    });
  }

  // 2. Salary comparison vs category
  if (job.category && (job.salary_min || job.salary_max)) {
    const { data: peers } = await supabase
      .from("jobs")
      .select("salary_min, salary_max")
      .eq("category", job.category)
      .eq("status", "ACTIVE")
      .neq("id", job.id)
      .not("salary_max", "is", null);

    if (peers && peers.length >= 3) {
      const avgMax =
        peers.reduce((s, p) => s + ((p as { salary_max: number }).salary_max ?? 0), 0) /
        peers.length;
      if (job.salary_max && job.salary_max > avgMax * 1.25) {
        out.push({
          title: "Your salary may be above market",
          body: `Your max salary is LKR ${job.salary_max.toLocaleString()}, but the category average is LKR ${Math.round(avgMax).toLocaleString()}. Consider widening the range or adding non-salary benefits.`,
        });
      }
    }
  }

  // 3. Location constraint
  if (job.work_type === "ONSITE") {
    out.push({
      title: "Consider Hybrid or Remote",
      body: "On-site roles get ~40% fewer applicants than Hybrid/Remote equivalents. If the role can be partially remote, changing the work type can dramatically expand your reach.",
    });
  }

  // 4. Title clarity
  if (job.title.length > 60) {
    out.push({
      title: "Shorten the job title",
      body: "Your title is over 60 characters. Shorter titles are easier to scan in search results and get more clicks.",
    });
  }

  return out;
}

// ───────────────────────────────────────────────────────────────────────────
// Email templates
// ───────────────────────────────────────────────────────────────────────────
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function emailFrame(content: string): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,0.05);">
        ${content}
        <tr><td style="padding:16px 32px 24px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">This is an automated message from HireLoop. Replies are not monitored.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`.trim();
}

function verificationEmailHtml({
  jobTitle,
  companyName,
  verifyUrl,
}: {
  jobTitle: string;
  companyName: string;
  verifyUrl: string;
}): string {
  return emailFrame(`
    <tr><td style="padding:32px 32px 8px;">
      <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">${escapeHtml(companyName)}</p>
      <h1 style="margin:0;font-size:22px;color:#111827;">Still hiring for "${escapeHtml(jobTitle)}"?</h1>
      <p style="margin:16px 0 0;font-size:15px;line-height:1.6;color:#374151;">
        Your listing is 14 days old. To keep the marketplace accurate, we re-verify every active listing.
        Confirm the role is still open — or let us know it's filled. If we don't hear back within
        <strong>48 hours</strong>, the listing is automatically archived.
      </p>
    </td></tr>
    <tr><td align="center" style="padding:24px 32px 32px;">
      <a href="${verifyUrl}" style="display:inline-block;padding:12px 28px;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">Confirm status →</a>
    </td></tr>
  `);
}

function hotJobEmailHtml({
  jobTitle,
  companyName,
  applicantCount,
  dashboardUrl,
}: {
  jobTitle: string;
  companyName: string;
  applicantCount: number;
  dashboardUrl: string;
}): string {
  return emailFrame(`
    <tr><td style="padding:32px 32px 8px;">
      <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">${escapeHtml(companyName)}</p>
      <h1 style="margin:0;font-size:22px;color:#111827;">🔥 ${applicantCount} candidates applied</h1>
      <p style="margin:16px 0 0;font-size:15px;line-height:1.6;color:#374151;">
        Your listing <strong>"${escapeHtml(jobTitle)}"</strong> just crossed <strong>${applicantCount} applications</strong>.
        This is a strong signal — the role is generating real interest.
      </p>
      <p style="margin:12px 0 0;font-size:15px;line-height:1.6;color:#374151;">
        <strong>What to do next:</strong> review the most recent applications, shortlist the top 3, and reach out before candidates accept other offers.
      </p>
    </td></tr>
    <tr><td align="center" style="padding:24px 32px 32px;">
      <a href="${dashboardUrl}" style="display:inline-block;padding:12px 28px;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">Review applications →</a>
    </td></tr>
  `);
}

function staleJobEmailHtml({
  jobTitle,
  companyName,
  daysLive,
  suggestions,
  editUrl,
}: {
  jobTitle: string;
  companyName: string;
  daysLive: number;
  suggestions: { title: string; body: string }[];
  editUrl: string;
}): string {
  const suggestionRows = suggestions
    .map(
      (s) => `
      <tr><td style="padding:12px 0;border-top:1px solid #f3f4f6;">
        <p style="margin:0;font-size:14px;font-weight:600;color:#111827;">${escapeHtml(s.title)}</p>
        <p style="margin:4px 0 0;font-size:14px;line-height:1.6;color:#4b5563;">${escapeHtml(s.body)}</p>
      </td></tr>`
    )
    .join("");

  return emailFrame(`
    <tr><td style="padding:32px 32px 8px;">
      <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">${escapeHtml(companyName)}</p>
      <h1 style="margin:0;font-size:22px;color:#111827;">"${escapeHtml(jobTitle)}" has 0 applicants</h1>
      <p style="margin:16px 0 0;font-size:15px;line-height:1.6;color:#374151;">
        Your listing has been live for <strong>${daysLive} days</strong> with no applications yet.
        This is normal — here are a few suggestions that typically unlock more interest.
      </p>
      <table role="presentation" width="100%" style="margin-top:8px;border-collapse:collapse;">
        ${suggestionRows || '<tr><td style="padding:12px 0;"><p style="margin:0;font-size:14px;color:#6b7280;">No specific suggestions — try sharing the link directly with your network.</p></td></tr>'}
      </table>
    </td></tr>
    <tr><td align="center" style="padding:24px 32px 32px;">
      <a href="${editUrl}" style="display:inline-block;padding:12px 28px;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">Edit listing →</a>
    </td></tr>
  `);
}