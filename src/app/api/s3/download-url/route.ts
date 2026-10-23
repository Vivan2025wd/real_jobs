import { NextResponse, type NextRequest } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@/lib/supabase/server";
import { s3, BUCKETS } from "@/lib/s3/client";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { key?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.key) {
    return NextResponse.json({ error: "key is required" }, { status: 400 });
  }

  const { data: app } = await supabase
    .from("applications")
    .select("id, resume_url, jobs!inner(company_id, companies!inner(employer_id))")
    .eq("resume_url", body.key)
    .maybeSingle();

  type AppRow = {
    id: string;
    resume_url: string;
    jobs: { company_id: string; companies: { employer_id: string } };
  };
  const typedApp = app as unknown as AppRow | null;

  if (!typedApp || typedApp.jobs.companies.employer_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const command = new GetObjectCommand({
    Bucket: BUCKETS.resumes,
    Key: body.key,
  });

  const url = await getSignedUrl(s3, command, { expiresIn: 60 });
  return NextResponse.json({ url });
}
