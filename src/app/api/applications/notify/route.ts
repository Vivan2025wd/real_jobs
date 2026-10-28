// src/app/api/applications/notify/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { applicationId?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.applicationId) {
    return NextResponse.json({ error: "applicationId required" }, { status: 400 });
  }

  // Use admin to bypass RLS — we need the employer's email, which the
  // seeker cannot read directly.
  const admin = createAdminClient();
  const { data: app } = await admin
    .from("applications")
    .select(
      "id, seeker_id, jobs!inner(title, companies!inner(company_name, users!inner(email)))"
    )
    .eq("id", body.applicationId)
    .maybeSingle();

  const typed = app as unknown as {
    seeker_id: string;
    jobs: {
      title: string;
      companies: { company_name: string; users: { email: string } };
    };
  } | null;

  if (!typed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (typed.seeker_id !== user.id) {
    return NextResponse.json({ error: "Not your application" }, { status: 403 });
  }

  const { data: seeker } = await admin
    .from("users")
    .select("email")
    .eq("id", user.id)
    .maybeSingle();

  const employerEmail = typed.jobs.companies.users.email;
  const seekerEmail = (seeker as { email: string } | null)?.email ?? user.email ?? "A candidate";

  try {
    await sendEmail({
      to: employerEmail,
      subject: `New application for ${typed.jobs.title}`,
      html: `
        <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 16px;">
          <h1 style="font-size: 22px; color: #111827; margin: 0 0 8px;">New application received</h1>
          <p style="color: #374151; line-height: 1.6; font-size: 15px;">
            <strong>${seekerEmail}</strong> just applied for
            <strong>${typed.jobs.title}</strong> at ${typed.jobs.companies.company_name}.
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