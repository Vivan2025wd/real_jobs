// src/app/api/s3/download-url/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@/lib/supabase/server";
import { s3, BUCKETS } from "@/lib/s3/client";

// ---------------------------------------------------------------------------
// Explicit row types.
//
// `.returns<T>()` does NOT override the inferred type when the base query
// collapses to `never` (PostgREST inference limitation). The awaited result
// must be cast with `as unknown as T | null` — the pattern used throughout
// this codebase for the same reason.
// ---------------------------------------------------------------------------
type AppRow = {
  id: string;
  job_id: string;
  resume_url: string;
};

type JobRow = {
  id: string;
  company_id: string;
  companies: { employer_id: string };
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
    return NextResponse.json(
      { error: "applicationId is required" },
      { status: 400 }
    );
  }

  // ─── 1. Load the application (flat query, no embeds) ───
  const { data: appData } = await supabase
    .from("applications")
    .select("id, job_id, resume_url")
    .eq("id", body.applicationId)
    .maybeSingle();

  const app = appData as unknown as AppRow | null;

  if (!app) {
    console.warn(
      `[api/s3/download-url] application ${body.applicationId} not found`
    );
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  // ─── 2. Load the job + verify employer ownership (single-level embed) ───
  const { data: jobData } = await supabase
    .from("jobs")
    .select("id, company_id, companies!inner(employer_id)")
    .eq("id", app.job_id)
    .maybeSingle();

  const job = jobData as unknown as JobRow | null;

  if (!job || job.companies.employer_id !== user.id) {
    console.warn(
      `[api/s3/download-url] user ${user.id} not authorized for job ${app.job_id}`
    );
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // ─── 3. Sign a short-lived GET URL ───
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKETS.resumes,
      Key: app.resume_url,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 60 });

    return NextResponse.json({ url });
  } catch (err) {
    console.error("[api/s3/download-url] pre-sign failed:", err);
    return NextResponse.json(
      { error: "Could not generate download URL" },
      { status: 500 }
    );
  }
}