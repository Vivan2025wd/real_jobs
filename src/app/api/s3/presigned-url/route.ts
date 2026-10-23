import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildPresignedUpload,
  PresignedError,
} from "@/lib/s3/presigned";

type UploadPurpose = "RESUME" | "COMPANY_LOGO";

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
  if (purpose !== "RESUME" && purpose !== "COMPANY_LOGO") {
    return NextResponse.json(
      { error: 'purpose must be "RESUME" or "COMPANY_LOGO"' },
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
    const { data: company } = await supabase
      .from("companies")
      .select("id")
      .eq("employer_id", user.id)
      .maybeSingle();

    if (!company) {
      return NextResponse.json(
        { error: "Create a company profile first" },
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