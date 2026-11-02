import "server-only";

import { sendEmail } from "@/lib/email/send";

export type ApplicationStatusEmailRecipient = {
  email: string;
  jobTitle: string;
  companyName: string;
};

export type NotifiableApplicationStatus =
  | "REVIEWED"
  | "SHORTLISTED"
  | "REJECTED";

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

export async function sendApplicationStatusEmails(
  recipients: ApplicationStatusEmailRecipient[],
  status: NotifiableApplicationStatus
): Promise<{ sent: number; failed: number }> {
  const statusLabel =
    status === "REVIEWED"
      ? "Under Review"
      : status === "SHORTLISTED"
        ? "Shortlisted"
        : "Not Selected";
  const statusColor =
    status === "SHORTLISTED"
      ? "#059669"
      : status === "REJECTED"
        ? "#e11d48"
        : "#4f46e5";

  let sent = 0;
  let failed = 0;

  for (let offset = 0; offset < recipients.length; offset += 10) {
    const batch = recipients.slice(offset, offset + 10);
    const results = await Promise.all(
      batch.map(async (recipient) => {
        const jobTitle = escapeHtml(recipient.jobTitle);
        const companyName = escapeHtml(recipient.companyName);

        try {
          await sendEmail({
            to: recipient.email,
            subject: `Update on your application for ${recipient.jobTitle}`,
            html: `
              <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 16px;">
                <div style="text-align: center; margin-bottom: 24px;">
                  <span style="display: inline-block; width: 32px; height: 32px; border-radius: 8px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; font-weight: 700; line-height: 32px;">R</span>
                </div>
                <h1 style="font-size: 22px; color: #111827; margin: 0 0 8px;">Application update</h1>
                <p style="color: #374151; line-height: 1.6; font-size: 15px;">
                  Your application for <strong>${jobTitle}</strong> at
                  <strong>${companyName}</strong> has been updated.
                </p>
                <div style="background: #f9fafb; border-left: 3px solid ${statusColor}; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
                  <p style="margin: 0; font-size: 13px; color: #6b7280;">New status</p>
                  <p style="margin: 4px 0 0; font-size: 16px; font-weight: 600; color: ${statusColor};">${statusLabel}</p>
                </div>
                <div style="text-align: center; margin-top: 28px;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/seeker/applications"
                     style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
                    View application
                  </a>
                </div>
                <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 32px;">
                  You're receiving this because you applied via RealJobs.
                </p>
              </div>
            `,
          });
          return true;
        } catch (error) {
          failed += 1;
          console.error(
            "[application-status-email] Email delivery failed:",
            error
          );
          return false;
        }
      })
    );
    sent += results.filter(Boolean).length;
  }

  return { sent, failed };
}
