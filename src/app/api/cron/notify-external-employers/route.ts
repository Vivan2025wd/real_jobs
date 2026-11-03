import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { sendEmail } from "@/lib/email/send";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

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

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!baseUrl) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_APP_URL is not configured" },
      { status: 500 }
    );
  }

  const adminDb = createAdminClient();
  const { data: jobs, error } = await adminDb.rpc("get_external_jobs_to_notify", {
    p_limit: 50,
  });
  if (error) {
    console.error("[cron:notify-external-employers] candidate load failed:", error);
    return NextResponse.json({ error: "Could not load eligible listings" }, { status: 500 });
  }

  let processed = 0;
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const stopAt = Date.now() + 45_000;

  for (const job of jobs ?? []) {
    if (Date.now() >= stopAt) break;
    processed++;

    let claimTokenHash: string | null = null;
    let unsubscribeTokenHash: string | null = null;
    let emailSent = false;
    try {
      const email = job.contact_email.toLowerCase();
      const { data: suppression, error: suppressionError } = await adminDb
        .from("email_suppressions")
        .select("email")
        .eq("email", email)
        .maybeSingle();
      if (suppressionError) throw new Error(`Suppression check failed: ${suppressionError.message}`);
      if (suppression) {
        skipped++;
        continue;
      }

      const claimToken = randomBytes(32).toString("base64url");
      claimTokenHash = hashToken(claimToken);
      const unsubscribeToken = randomBytes(32).toString("base64url");
      unsubscribeTokenHash = hashToken(unsubscribeToken);

      const { error: updateTokenError } = await adminDb
        .from("job_external_contacts")
        .update({
          claim_token_hash: claimTokenHash,
          claim_token_expires_at: new Date(Date.now() + 30 * 86_400_000).toISOString(),
        })
        .eq("job_id", job.job_id);
      if (updateTokenError) throw new Error(`Claim token update failed: ${updateTokenError.message}`);

      const { error: saveUnsubscribeError } = await adminDb
        .from("email_unsubscribe_tokens")
        .insert({
          token_hash: unsubscribeTokenHash,
          email,
          expires_at: new Date(Date.now() + 365 * 86_400_000).toISOString(),
        });
      if (saveUnsubscribeError) throw new Error(`Unsubscribe token save failed: ${saveUnsubscribeError.message}`);

      const claimUrl = new URL(`/claim/${claimToken}`, baseUrl).toString();
      const unsubscribePageUrl = new URL(
        `/email-preferences/unsubscribe/${unsubscribeToken}`,
        baseUrl
      ).toString();
      const oneClickUnsubscribeUrl = new URL(
        `/api/email-unsubscribe/${unsubscribeToken}`,
        baseUrl
      ).toString();
      const title = escapeHtml(job.title);
      const companyName = escapeHtml(job.external_company_name ?? "your company");
      const subjectTitle = job.title.replace(/[\r\n]+/g, " ").slice(0, 120);

      await sendEmail({
        to: email,
        subject: `Applicants are waiting for "${subjectTitle}"`,
        headers: {
          "List-Unsubscribe": `<${oneClickUnsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 16px;color:#111827">
          <h1 style="font-size:22px">Applicants are waiting</h1>
          <p style="line-height:1.6">We found a public listing for <strong>${companyName}</strong> and posted it on RealJobs.lk so job seekers could apply. You received this message because the listing included this contact address.</p>
          <p style="line-height:1.6">There ${job.applicant_count === 1 ? "is" : "are"} <strong>${job.applicant_count} applicant${job.applicant_count === 1 ? "" : "s"}</strong> for <strong>${title}</strong>. No applicant details are included in this email.</p>
          <p style="text-align:center;margin:28px 0">
            <a href="${escapeHtml(claimUrl)}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:600">View applicants</a>
          </p>
          <p style="font-size:13px;color:#4b5563;line-height:1.6">Claim the listing by creating or signing in to an employer account. Applicant details become available only after you claim it.</p>
          <p style="font-size:12px;color:#6b7280"><a href="${escapeHtml(unsubscribePageUrl)}">Don't contact me again</a></p>
        </div>`,
      });
      emailSent = true;

      const { error: updateCountError } = await adminDb
        .from("job_external_contacts")
        .update({
          notify_count: job.notify_count + 1,
          last_notified_at: new Date().toISOString(),
        })
        .eq("job_id", job.job_id)
        .eq("claim_token_hash", claimTokenHash);
      if (updateCountError) throw new Error(`Notification count update failed: ${updateCountError.message}`);
      sent++;
    } catch (jobError) {
      failed++;
      console.error(`[cron:notify-external-employers] ${job.job_id} failed:`, jobError);
      if (!emailSent && claimTokenHash) {
        const { error: cleanupError } = await adminDb
          .from("job_external_contacts")
          .update({
            claim_token_hash: null,
            claim_token_expires_at: null,
          })
          .eq("job_id", job.job_id)
          .eq("claim_token_hash", claimTokenHash);
        if (cleanupError) {
          console.error(`[cron:notify-external-employers] ${job.job_id} token cleanup failed:`, cleanupError);
        }
      }
      if (!emailSent && unsubscribeTokenHash) {
        const { error: cleanupError } = await adminDb
          .from("email_unsubscribe_tokens")
          .delete()
          .eq("token_hash", unsubscribeTokenHash);
        if (cleanupError) {
          console.error(`[cron:notify-external-employers] ${job.job_id} unsubscribe cleanup failed:`, cleanupError);
        }
      }
    }
  }

  return NextResponse.json({ ok: true, processed, sent, failed, skipped });
}
