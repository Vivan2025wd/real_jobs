import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import {
  dispatchVerificationEmails,
  expireStaleJobs,
  notifyHotJobs,
  notifyStaleJobs,
} from "@/lib/cron/job-lifecycle";

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

  const results: Record<string, unknown> = {};
  const errors: Record<string, string> = {};

  for (const [name, fn] of [
    ["expire", expireStaleJobs],
    ["verify", dispatchVerificationEmails],
    ["hot", notifyHotJobs],
    ["stale", notifyStaleJobs],
  ] as const) {
    try {
      results[name] = await fn();
    } catch (err) {
      errors[name] = err instanceof Error ? err.message : "Unknown";
    }
  }

  return NextResponse.json({
    ok: Object.keys(errors).length === 0,
    results,
    errors,
  });
}