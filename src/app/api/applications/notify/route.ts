// src/app/api/applications/notify/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";

type NotificationDetails = {
  company_name: string;
  employer_email: string;
  job_title: string;
  seeker_email: string | null;
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { applicationId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.applicationId) {
    return NextResponse.json({ error: "applicationId required" }, { status: 400 });
  }

  const notificationRpc = supabase as unknown as {
    rpc: (
      functionName: "get_application_notification_details",
      args: { p_application_id: string }
    ) => PromiseLike<{
      data: NotificationDetails[] | null;
      error: { message: string } | null;
    }>;
  };
  const { data, error } = await notificationRpc.rpc(
    "get_application_notification_details",
    { p_application_id: body.applicationId }
  );
  if (error) {
    console.error("[applications/notify] failed to load notification details:", error);
    return NextResponse.json(
      { error: "Could not load application details" },
      { status: 500 }
    );
  }

  const notification = data?.[0];
  if (!notification) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await sendEmail({
      to: notification.employer_email,
      subject: `New application for ${notification.job_title}`,
      html: `
        <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 16px;">
          <h1 style="font-size: 22px; color: #111827; margin: 0 0 8px;">New application received</h1>
          <p style="color: #374151; line-height: 1.6; font-size: 15px;">
            <strong>${notification.seeker_email || user.email || "A candidate"}</strong> just applied for
            <strong>${notification.job_title}</strong> at ${notification.company_name}.
          </p>
          <div style="text-align: center; margin-top: 28px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/employer/jobs"
               style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
              Review applicants
            </a>
          </div>
        </div>
      `,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[applications/notify] email failed:", err);
    return NextResponse.json({ ok: false, error: "email failed" }, { status: 500 });
  }
}