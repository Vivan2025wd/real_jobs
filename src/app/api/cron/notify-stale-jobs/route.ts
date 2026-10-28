import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { notifyStaleJobs } from "@/lib/cron/job-lifecycle";

export const maxDuration = 60;

function unauthorized(req: NextRequest): boolean {
  const header = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length !== b.length || !timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  if (unauthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const report = await notifyStaleJobs();
    return NextResponse.json({ ok: true, ...report });
  } catch (err) {
    console.error("[cron:notify-stale-jobs]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}