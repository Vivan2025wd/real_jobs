import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization") ?? "";
  if (!secret) return false;

  const actual = Buffer.from(authorization);
  const expected = Buffer.from(`Bearer ${secret}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.rpc("calculate_employer_response_rates");
    if (error) throw new Error(error.message);

    revalidatePath("/jobs");
    revalidatePath("/jobs/[jobId]", "page");
    revalidatePath("/jobs/category/[categorySlug]", "page");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[cron:calculate-stats]", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
