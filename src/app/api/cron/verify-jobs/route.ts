import { NextResponse, type NextRequest } from "next/server";
import { dispatchVerificationEmails } from "@/lib/cron/job-lifecycle";

export const maxDuration = 60;

function unauthorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  const querySecret = new URL(req.url).searchParams.get("secret");

  return (
    auth !== expected &&
    querySecret !== process.env.CRON_SECRET
  );
}

export async function GET(req: NextRequest) {
  if (unauthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const report = await dispatchVerificationEmails();
    return NextResponse.json({ ok: true, ...report });
  } catch (err) {
    console.error("[cron:verify-jobs]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}