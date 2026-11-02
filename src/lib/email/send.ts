import "server-only";

import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function sendEmail({
  to,
  subject,
  html,
  headers,
}: {
  to: string;
  subject: string;
  html: string;
  headers?: Record<string, string>;
}): Promise<void> {
  if (!resend) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "RealJobs <onboarding@resend.dev>",
    to,
    subject,
    html,
    headers,
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}