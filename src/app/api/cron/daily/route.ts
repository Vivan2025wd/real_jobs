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
      const result = await fn();
      results[name] = result;
      if ("failed" in result && result.failed > 0) {
        errors[name] = `${result.failed} lifecycle item(s) failed`;
      }
    } catch (err) {
      errors[name] = err instanceof Error ? err.message : "Unknown";
    }
  }

  const hasErrors = Object.keys(errors).length > 0;
  return NextResponse.json(
    { ok: !hasErrors, results, errors },
    { status: hasErrors ? 500 : 200 }
  );
}