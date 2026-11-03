import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildPresignedUpload,
  PresignedError,
} from "@/lib/s3/presigned";

type UploadPurpose = "RESUME" | "COMPANY_LOGO" | "JOB_IMAGE";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: {
    purpose?: UploadPurpose;
    contentType?: string;
    fileSize?: number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const purpose = body.purpose;
  if (
    purpose !== "RESUME" &&
    purpose !== "COMPANY_LOGO" &&
    purpose !== "JOB_IMAGE"
  ) {
    return NextResponse.json(
      { error: 'purpose must be "RESUME", "COMPANY_LOGO", or "JOB_IMAGE"' },
      { status: 400 }
    );
  }

  if (!body.contentType || typeof body.fileSize !== "number") {
    return NextResponse.json(
      { error: "contentType and fileSize are required" },
      { status: 400 }
    );
  }

  if (purpose === "RESUME") {
    const role = (user.user_metadata?.role as string | undefined)?.toUpperCase();
    if (role === "EMPLOYER") {
      return NextResponse.json(
        { error: "Only job seekers can upload resumes" },
        { status: 403 }
      );
    }
  }

  // Ownership checks
  if (purpose === "COMPANY_LOGO") {
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id")
      .eq("employer_id", user.id)
      .eq("is_system", false)
      .limit(1)
      .maybeSingle();

    if (companyError) {
      console.error("[presigned-url] failed to load company:", companyError);
    }

    if (!company) {
      return NextResponse.json(
        { error: "Create a company profile first" },
        { status: 403 }
      );
    }
  }

  if (purpose === "JOB_IMAGE") {
    const role = (user.user_metadata?.role as string | undefined)?.toUpperCase();
    const isAdmin =
      !!process.env.ADMIN_EMAIL &&
      user.email?.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase();
    if (role !== "EMPLOYER" && !isAdmin) {
      return NextResponse.json(
        { error: "Only employers and admins can upload job posters" },
        { status: 403 }
      );
    }
  }

  try {
    const result = await buildPresignedUpload({
      purpose,
      ownerId: user.id,
      contentType: body.contentType,
      fileSize: body.fileSize,
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof PresignedError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[api/s3/presigned-url]", err);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}